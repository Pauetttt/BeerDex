import fs from 'node:fs/promises';
import path from 'node:path';
import { and, eq, lte, sql } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// Configurar BD en memoria antes de importar app/env
process.env.DATABASE_URL = 'pglite://memory';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_access_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';

import { app } from '../src/app';
import { env } from '../src/config/env';
import { AiBindingLike, R2BucketLike, setRuntimeBindings } from '../src/config/runtimeBindings';
import { closeDb, getDb, initDb, schema } from '../src/db';
import { importCatalogEntries, parseCatalogCsv } from '../src/db/importCatalog';
import {
  BRANDS_SEED,
  isValidEan,
  isValidEan13,
  seedDatabase,
  TOTAL_SEEDED_BEERS,
} from '../src/db/seedData';
import {
  parseGeminiAntiCheatResponse,
  setAntiCheatEvaluatorForTest,
  verifyBeerFrameWithGemini,
} from '../src/services/antiCheatService';
import { backfillUserChapasIfNeeded } from '../src/services/profileService';
import { deleteStoredPhoto, uploadBeerPhoto } from '../src/services/storageService';
import { mapOffProductToCsvRow } from '../src/scripts/lookupOpenFoodFacts';

const TINY_JPEG_BASE64 =
  'data:image/jpeg;base64,' +
  Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xff, 0xd9]).toString(
    'base64'
  );

const createdLocalUploads: string[] = [];

function trackUploadUrl(url: string | undefined): void {
  if (url && url.startsWith('/uploads/')) {
    createdLocalUploads.push(path.resolve(__dirname, '..', `.${url}`));
  }
}

describe('BeerDex Backend API & Achievement Engine', () => {
  let accessTokenA = '';
  let refreshTokenA = '';
  let userIdA = '';

  let accessTokenB = '';
  let userIdB = '';

  let estrellaBeers: Array<{ id: number; barcode: string; name: string }> = [];
  let mahouLitrona: { id: number; barcode: string } | undefined;
  let allSeededBeers: Array<{ id: number; barcode: string }> = [];

  beforeAll(async () => {
    const db = await initDb('pglite://memory');
    const summary1 = await seedDatabase(db);
    const summary2 = await seedDatabase(db); // Verificar idempotencia

    expect(summary1).toEqual(summary2);
    expect(summary1.brands).toBe(41);
    expect(summary1.beers).toBe(TOTAL_SEEDED_BEERS);
    expect(summary1.achievements).toBe(100);
    expect(summary1.titles).toBe(36);
    expect(summary1.icons).toBe(37);
    expect(summary1.cosmetics).toBe(48);

    const beers = await db.select().from(schema.beers);
    allSeededBeers = beers.map((b) => ({ id: b.id, barcode: b.barcode }));
    const estrellaBrand = await db
      .select()
      .from(schema.brands)
      .where(eq(schema.brands.name, 'Estrella Galicia'));

    estrellaBeers = beers
      .filter((b) => b.brandId === estrellaBrand[0].id)
      .map((b) => ({ id: b.id, barcode: b.barcode, name: b.name }));

    const litrona = beers.find((b) => b.name.includes('Mahou Clásica Litrona'));
    if (litrona) {
      mahouLitrona = { id: litrona.id, barcode: litrona.barcode };
    }
  });

  afterAll(async () => {
    for (const filePath of createdLocalUploads) {
      await fs.unlink(filePath).catch(() => {});
    }
    await closeDb();
  });

  it('valida todas las reglas del catálogo semilla (EAN-13 válidos e historias 120-150 chars)', async () => {
    const db = getDb();
    const beers = await db.select().from(schema.beers);
    expect(beers.length).toBe(TOTAL_SEEDED_BEERS);
    for (const beer of beers) {
      expect(isValidEan13(beer.barcode)).toBe(true);
      expect(beer.shortHistory.length).toBeGreaterThanOrEqual(120);
      expect(beer.shortHistory.length).toBeLessThanOrEqual(150);
    }
    expect(BRANDS_SEED.length).toBe(41);

    const requiredNewBrands = [
      'El Águila',
      'Turia',
      'Estrella de Levante',
      'Victoria',
      'Amstel',
      'Dorada',
      'Tropical',
      'Moritz',
      'Keler',
      'La Salve',
      'El Alcázar',
      'La Sagra',
      'Voll-Damm',
      '1906',
      'Budweiser',
      'Stella Artois',
      'Carlsberg',
      'Franziskaner',
      'Desperados',
      'Delirium Tremens',
      'Pilsner Urquell',
      'Modelo',
      'Asahi',
      'Sapporo',
      'Super Bock',
      'Sagres',
    ];
    const seedNames = new Set(BRANDS_SEED.map((b) => b.name));
    for (const name of requiredNewBrands) {
      expect(seedNames.has(name)).toBe(true);
    }

    const estrellaGalicia = BRANDS_SEED.find((b) => b.name === 'Estrella Galicia');
    const estrellaDamm = BRANDS_SEED.find((b) => b.name === 'Estrella Damm');
    expect(estrellaGalicia?.beers.some((b) => b.name.includes('1906'))).toBe(false);
    expect(estrellaDamm?.beers.some((b) => b.name.includes('Voll-Damm'))).toBe(false);

    const allCodes = new Set<string>();
    for (const brand of BRANDS_SEED) {
      for (const beer of brand.beers) {
        expect(isValidEan13(beer.barcode)).toBe(true);
        expect(allCodes.has(beer.barcode)).toBe(false);
        allCodes.add(beer.barcode);
        for (const extra of beer.extraBarcodes ?? []) {
          expect(isValidEan(extra)).toBe(true);
          expect(allCodes.has(extra)).toBe(false);
          allCodes.add(extra);
        }
      }
    }
  });

  it('bloquea rutas privadas sin JWT', async () => {
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(401);
  });

  it('permite registro, login con username, refresh y recuperación de contraseña', async () => {
    const regA = await request(app).post('/api/auth/register').send({
      email: 'pau@beerdex.app',
      username: 'PauBeer',
      password: 'password123',
    });
    expect(regA.status).toBe(201);
    expect(regA.body.accessToken).toBeTruthy();
    expect(regA.body.refreshToken).toBeTruthy();
    expect(regA.body.user.equippedTitle.name).toBe('Cervecero Novato');
    expect(regA.body.user.equippedIcon.id).toBe(1);

    accessTokenA = regA.body.accessToken;
    refreshTokenA = regA.body.refreshToken;
    userIdA = regA.body.user.id;

    // Registro duplicado
    const dup = await request(app).post('/api/auth/register').send({
      email: 'pau@beerdex.app',
      username: 'OtroUser',
      password: 'password123',
    });
    expect(dup.status).toBe(409);

    // Segundo usuario para pruebas sociales
    const regB = await request(app).post('/api/auth/register').send({
      email: 'amigo@beerdex.app',
      username: 'AmigoLupulo',
      password: 'password123',
    });
    expect(regB.status).toBe(201);
    accessTokenB = regB.body.accessToken;
    userIdB = regB.body.user.id;

    // Login con username (case-insensitive)
    const loginRes = await request(app).post('/api/auth/login').send({
      username: 'paubeer',
      password: 'password123',
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.accessToken).toBeTruthy();

    // Refresh token rotation
    const refreshRes = await request(app).post('/api/auth/refresh').send({
      refreshToken: refreshTokenA,
    });
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.accessToken).toBeTruthy();
    expect(refreshRes.body.refreshToken).not.toBe(refreshTokenA);

    // Viejo refresh token revocado
    const oldRefreshRes = await request(app).post('/api/auth/refresh').send({
      refreshToken: refreshTokenA,
    });
    expect(oldRefreshRes.status).toBe(401);

    // Forgot & reset password
    const forgotRes = await request(app).post('/api/auth/forgot-password').send({
      email: 'pau@beerdex.app',
    });
    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.devResetCode).toBeTruthy();

    const resetRes = await request(app).post('/api/auth/reset-password').send({
      token: forgotRes.body.devResetCode,
      newPassword: 'newpassword456',
    });
    expect(resetRes.status).toBe(200);

    const badLogin = await request(app).post('/api/auth/login').send({
      username: 'PauBeer',
      password: 'password123',
    });
    expect(badLogin.status).toBe(401);

    const goodLogin = await request(app).post('/api/auth/login').send({
      username: 'PauBeer',
      password: 'newpassword456',
    });
    expect(goodLogin.status).toBe(200);
    accessTokenA = goodLogin.body.accessToken;
  });

  it('gestiona perfil, bloqueos de títulos/iconos y logro Cambio de Look', async () => {
    const meRes = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${accessTokenA}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.icons.filter((i: { unlocked: boolean }) => i.unlocked)).toHaveLength(5);
    expect(meRes.body.titles.filter((t: { unlocked: boolean }) => t.unlocked)).toHaveLength(1);

    // Intentar equipar título bloqueado
    const lockedTitleRes = await request(app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .send({ equippedTitleId: 2 });
    expect(lockedTitleRes.status).toBe(403);
    expect(lockedTitleRes.body.unlockAchievementName).toBe('Primer Sorbo');

    // Equipar icono default 2 -> desbloquea Cambio de Look (#89)
    const equipIconRes = await request(app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .send({ equippedIconId: 2 });
    expect(equipIconRes.status).toBe(200);
    expect(equipIconRes.body.user.equippedIconId).toBe(2);
    expect(
      equipIconRes.body.newlyUnlocked.some((a: { id: number }) => a.id === 89)
    ).toBe(true);
    expect(equipIconRes.body.user.chapas).toBe(15);
  });

  it('valida códigos de barras, registra cervezas, evalúa logros y completa marca', async () => {
    // BeerDex inicial
    const dexInit = await request(app)
      .get('/api/beerdex')
      .set('Authorization', `Bearer ${accessTokenA}`);
    expect(dexInit.status).toBe(200);
    expect(dexInit.body.global).toEqual({
      registeredCount: 0,
      totalCount: TOTAL_SEEDED_BEERS,
    });
    expect(dexInit.body.brands[0].beers[0].unlocked).toBe(false);
    expect(dexInit.body.brands[0].beers[0].shortHistory).toBeUndefined();

    // Resolver códigos de barras alternativos reales (EAN-8 y variantes EAN-13 comerciales)
    const coronaEan8 = await request(app)
      .get('/api/beers/barcode/75041670')
      .set('Authorization', `Bearer ${accessTokenA}`);
    expect(coronaEan8.status).toBe(200);
    expect(coronaEan8.body.beer.name).toContain('Corona Extra');

    const ambarEan8 = await request(app)
      .get('/api/beers/barcode/84107091')
      .set('Authorization', `Bearer ${accessTokenA}`);
    expect(ambarEan8.status).toBe(200);
    expect(ambarEan8.body.beer.name).toContain('Ámbar Export');

    const mahouAlt = await request(app)
      .get('/api/beers/barcode/8411327002721')
      .set('Authorization', `Bearer ${accessTokenA}`);
    expect(mahouAlt.status).toBe(200);
    expect(mahouAlt.body.beer.name).toContain('Mahou 0,0 Tostada');

    // Resolver códigos de packs/cajas, UPC-A (12 dígitos), UPC-E (8 dígitos) y GTIN-14
    const packAndFormatCases: Array<[string, string]> = [
      ['8413681301267', 'Alhambra Reserva 1925 Botellín'],
      ['8712000011079', 'Heineken Original Lata'],
      ['8410793226433', 'Victoria Málaga Clásica Lata'],
      ['8410590111086', 'El Águila Sin Filtrar Botellín'],
      ['8410590111109', 'El Águila Sin Filtrar Lata'],
      ['8412598005121', '1906 Reserva Especial Botellín'],
      ['8410793033840', 'Voll-Damm Doble Malta Botellín'],
      ['8411090106251', 'Cruzcampo Pilsen Botellín'],
      ['8411090310139', 'Cruzcampo 0,0 Lata'],
      ['018200001819', 'Budweiser Original Botellín'],
      ['07289440', 'Amstel Light Botellín'],
      ['01840623', 'Budweiser Select Botellín'],
      ['08412598004964', '1906 Reserva Especial Botellín'],
    ];

    for (const [code, expectedName] of packAndFormatCases) {
      const lookupRes = await request(app)
        .get(`/api/beers/barcode/${code}`)
        .set('Authorization', `Bearer ${accessTokenA}`);
      expect(lookupRes.status).toBe(200);
      expect(lookupRes.body.beer.name).toBe(expectedName);
    }

    // Prefijo compartido GS1 Etapa 4 -> solicita confirmación y devuelve marcas relacionadas
    const dammFallback = await request(app)
      .get('/api/beers/barcode/8410793999992')
      .set('Authorization', `Bearer ${accessTokenA}`);
    expect(dammFallback.status).toBe(200);
    expect(dammFallback.body.needsVarietyConfirm).toBe(true);
    const returnedBrands = new Set(
      dammFallback.body.brandBeers.map((b: { brandName: string }) => b.brandName)
    );
    expect(returnedBrands.has('Estrella Damm')).toBe(true);
    expect(returnedBrands.has('Voll-Damm')).toBe(true);
    expect(returnedBrands.has('Victoria')).toBe(true);
    expect(returnedBrands.has('Keler')).toBe(true);

    // Código inválido y código inexistente
    const badBarcode = await request(app)
      .get('/api/beers/barcode/123')
      .set('Authorization', `Bearer ${accessTokenA}`);
    expect(badBarcode.status).toBe(400);

    const notFoundBarcode = await request(app)
      .get('/api/beers/barcode/8400000000001')
      .set('Authorization', `Bearer ${accessTokenA}`);
    expect(notFoundBarcode.status).toBe(404);

    // Código válido Estrella #1
    const firstBeer = estrellaBeers[0];
    const validBarcode = await request(app)
      .get(`/api/beers/barcode/${firstBeer.barcode}`)
      .set('Authorization', `Bearer ${accessTokenA}`);
    expect(validBarcode.status).toBe(200);
    expect(validBarcode.body.beer.id).toBe(firstBeer.id);

    // Registrar con 5 estrellas via multipart/form-data
    const jpegBuf = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xff, 0xd9,
    ]);
    const regBeer1 = await request(app)
      .post('/api/beers/register')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .field('beerId', String(firstBeer.id))
      .field('rating', '5')
      .attach('photo', jpegBuf, 'beer.jpg');

    expect(regBeer1.status).toBe(201);
    trackUploadUrl(regBeer1.body.userBeer.photoUrl);
    expect(regBeer1.body.baseChapas).toBe(10);
    expect(regBeer1.body.completedBrandBonus).toBe(0);
    const unlockedIds1 = regBeer1.body.newlyUnlocked.map((a: { id: number }) => a.id);
    expect(unlockedIds1).toContain(1); // Primer Sorbo -> título Aprendiz de Barra (+15)
    expect(unlockedIds1).toContain(85); // Obra Maestra (+15)
    expect(regBeer1.body.chapasEarned).toBeGreaterThanOrEqual(40);

    // Validar que el mismo código ahora devuelve 409
    const dupBarcode = await request(app)
      .get(`/api/beers/barcode/${firstBeer.barcode}`)
      .set('Authorization', `Bearer ${accessTokenA}`);
    expect(dupBarcode.status).toBe(409);

    // Equipar título desbloqueado "Aprendiz de Barra" (id 2) -> Con Honores (#90)
    const equipTitleRes = await request(app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .send({ equippedTitleId: 2 });
    expect(equipTitleRes.status).toBe(200);
    expect(
      equipTitleRes.body.newlyUnlocked.some((a: { id: number }) => a.id === 90)
    ).toBe(true);

    // Registrar las otras cervezas de Estrella Galicia (una con 1 estrella, incluye 0,0%)
    let lastEstrellaRes;
    for (let i = 1; i < estrellaBeers.length; i += 1) {
      const b = estrellaBeers[i];
      const rating = i === 1 ? 1 : 4;
      const res = await request(app)
        .post('/api/beers/register')
        .set('Authorization', `Bearer ${accessTokenA}`)
        .send({
          beerId: b.id,
          rating,
          photoBase64: TINY_JPEG_BASE64,
        });
      expect(res.status).toBe(201);
      trackUploadUrl(res.body.userBeer.photoUrl);
      lastEstrellaRes = res;
    }
    expect(lastEstrellaRes?.body.completedBrandBonus).toBe(50);

    // Registrar Mahou Clásica Litrona para tener los 3 formatos (Tridente Cervecero #46)
    expect(mahouLitrona).toBeDefined();
    const regLitrona = await request(app)
      .post('/api/beers/register')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .send({
        beerId: mahouLitrona!.id,
        rating: 3,
        photoBase64: TINY_JPEG_BASE64,
      });
    expect(regLitrona.status).toBe(201);
    trackUploadUrl(regLitrona.body.userBeer.photoUrl);

    const achRes = await request(app)
      .get('/api/achievements')
      .set('Authorization', `Bearer ${accessTokenA}`);
    expect(achRes.status).toBe(200);
    expect(achRes.body.totalCount).toBe(100);
    const unlockedSet = new Set(
      achRes.body.achievements
        .filter((a: { unlocked: boolean }) => a.unlocked)
        .map((a: { id: number }) => a.id)
    );

    expect(unlockedSet.has(1)).toBe(true); // Primer Sorbo
    expect(unlockedSet.has(2)).toBe(true); // Ronda de Cinco
    expect(unlockedSet.has(17)).toBe(true); // Primera Casa (100% Estrella Galicia)
    expect(unlockedSet.has(46)).toBe(true); // Tridente Cervecero (botellin+lata+litrona)
    expect(unlockedSet.has(48)).toBe(true); // Sin Remordimientos (Estrella 0,0)
    expect(unlockedSet.has(85)).toBe(true); // Obra Maestra
    expect(unlockedSet.has(86)).toBe(true); // Paladar Exigente
    expect(unlockedSet.has(89)).toBe(true); // Cambio de Look
    expect(unlockedSet.has(90)).toBe(true); // Con Honores
  });

  it('controla flips únicos e Historiador Cervecero (#91) y Racha de Tres (#94)', async () => {
    // Flip en cerveza bloqueada -> 403
    const lockedBeer = allSeededBeers.find(
      (b) => !estrellaBeers.some((e) => e.id === b.id) && b.id !== mahouLitrona?.id
    )!;
    const forbiddenFlip = await request(app)
      .post(`/api/beers/${lockedBeer.id}/flip`)
      .set('Authorization', `Bearer ${accessTokenA}`);
    expect(forbiddenFlip.status).toBe(403);

    // Desbloquear las cervezas necesarias para llegar a 10 en A y hacer flip en 10 distintas
    const neededExtra = Math.max(0, 10 - (estrellaBeers.length + 1));
    const extraBeers = allSeededBeers
      .filter((b) => !estrellaBeers.some((e) => e.id === b.id) && b.id !== mahouLitrona?.id)
      .slice(0, neededExtra);

    for (const eb of extraBeers) {
      const r = await request(app)
        .post('/api/beers/register')
        .set('Authorization', `Bearer ${accessTokenA}`)
        .send({ beerId: eb.id, rating: 4, photoBase64: TINY_JPEG_BASE64 });
      expect(r.status).toBe(201);
      trackUploadUrl(r.body.userBeer.photoUrl);
    }

    const unlockedForA = [
      ...estrellaBeers.map((b) => b.id),
      mahouLitrona!.id,
      ...extraBeers.map((b) => b.id),
    ].slice(0, 10);
    expect(unlockedForA.length).toBe(10);

    // Hacer flip repetido en la primera no sube de 1
    await request(app)
      .post(`/api/beers/${unlockedForA[0]}/flip`)
      .set('Authorization', `Bearer ${accessTokenA}`);
    const dupFlip = await request(app)
      .post(`/api/beers/${unlockedForA[0]}/flip`)
      .set('Authorization', `Bearer ${accessTokenA}`);
    expect(dupFlip.body.flipsReadCount).toBe(1);

    let lastFlipRes;
    for (let i = 1; i < unlockedForA.length; i += 1) {
      lastFlipRes = await request(app)
        .post(`/api/beers/${unlockedForA[i]}/flip`)
        .set('Authorization', `Bearer ${accessTokenA}`);
    }
    expect(lastFlipRes?.body.flipsReadCount).toBe(10);
    expect(
      lastFlipRes?.body.newlyUnlocked.some((a: { id: number }) => a.id === 91)
    ).toBe(true);

    // Racha de 3 días consecutivos (#94) para usuario B
    const db = getDb();
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

    await db.insert(schema.userBeers).values([
      {
        userId: userIdB,
        beerId: allSeededBeers[0].id,
        photoUrl: 'data:image/jpeg;base64,/9j/',
        rating: 4,
        registeredAt: twoDaysAgo,
      },
      {
        userId: userIdB,
        beerId: allSeededBeers[1].id,
        photoUrl: 'data:image/jpeg;base64,/9j/',
        rating: 5,
        registeredAt: oneDayAgo,
      },
    ]);

    const regTodayB = await request(app)
      .post('/api/beers/register')
      .set('Authorization', `Bearer ${accessTokenB}`)
      .send({
        beerId: allSeededBeers[2].id,
        rating: 4,
        photoBase64: TINY_JPEG_BASE64,
        scannedViaPack: true,
      });
    expect(regTodayB.status).toBe(201);
    trackUploadUrl(regTodayB.body.userBeer.photoUrl);
    expect(
      regTodayB.body.newlyUnlocked.some((a: { id: number }) => a.id === 94)
    ).toBe(true);
    expect(
      regTodayB.body.newlyUnlocked.some((a: { id: number }) => a.id === 98)
    ).toBe(true);
  });

  it('gestiona amigos, solicitudes, visita de perfil y Rivalidad Sana (#81)', async () => {
    // Buscar usuario B desde A
    const searchRes = await request(app)
      .get('/api/users/search?q=Amigo')
      .set('Authorization', `Bearer ${accessTokenA}`);
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.users[0].username).toBe('AmigoLupulo');

    // Enviar solicitud A -> B
    const reqFriend = await request(app)
      .post('/api/friends/request')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .send({ username: 'AmigoLupulo' });
    expect(reqFriend.status).toBe(201);
    const friendshipId = reqFriend.body.friendship.id;

    // Ver solicitudes en B
    const pendingB = await request(app)
      .get('/api/friends/requests')
      .set('Authorization', `Bearer ${accessTokenB}`);
    expect(pendingB.status).toBe(200);
    expect(pendingB.body.received).toHaveLength(1);

    // B acepta -> desbloquea ¡Salud! (#75) y Rivalidad Sana (#81, porque A completó Estrella Galicia)
    const acceptRes = await request(app)
      .patch(`/api/friends/request/${friendshipId}`)
      .set('Authorization', `Bearer ${accessTokenB}`)
      .send({ action: 'accept' });
    expect(acceptRes.status).toBe(200);
    const bUnlocked = acceptRes.body.newlyUnlocked.map((a: { id: number }) => a.id);
    expect(bUnlocked).toContain(75);
    expect(bUnlocked).toContain(81);

    // A visita perfil de B -> incrementa profilesVisitedCount y devuelve comparativa + cosméticos
    const visitRes = await request(app)
      .get(`/api/users/${userIdB}/profile`)
      .set('Authorization', `Bearer ${accessTokenA}`);
    expect(visitRes.status).toBe(200);
    expect(visitRes.body.isFriend).toBe(true);
    expect(visitRes.body.achievements).toHaveLength(100);
    expect(visitRes.body.user.equippedFrame).toBeDefined();
    expect(visitRes.body.user.showcaseRelics).toHaveLength(3);
    expect(visitRes.body.comparison).toBeDefined();
    expect(visitRes.body.comparison.commonBeersCount).toBeGreaterThanOrEqual(1);

    // Verificar ranking de amigos en GET /api/friends
    const friendsListRes = await request(app)
      .get('/api/friends')
      .set('Authorization', `Bearer ${accessTokenA}`);
    expect(friendsListRes.status).toBe(200);
    expect(friendsListRes.body.ranking).toHaveLength(2);
    expect(friendsListRes.body.ranking[0].username).toBe('PauBeer');
    expect(friendsListRes.body.ranking[0].isSelf).toBe(true);
    expect(friendsListRes.body.ranking[0].rank).toBe(1);
    expect(friendsListRes.body.ranking[1].username).toBe('AmigoLupulo');
    expect(friendsListRes.body.ranking[1].rank).toBe(2);

    const meAfterVisit = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${accessTokenA}`);
    expect(meAfterVisit.body.user.profilesVisitedCount).toBe(1);

    // Eliminar amigo
    const delRes = await request(app)
      .delete(`/api/friends/${friendshipId}`)
      .set('Authorization', `Bearer ${accessTokenA}`);
    expect(delRes.status).toBe(200);

    const friendsAfter = await request(app)
      .get('/api/friends')
      .set('Authorization', `Bearer ${accessTokenA}`);
    expect(friendsAfter.body.friends).toHaveLength(0);

    // Rechazar solicitud de amistad
    const reqFriend2 = await request(app)
      .post('/api/friends/request')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .send({ username: 'AmigoLupulo' });
    expect(reqFriend2.status).toBe(201);
    const rejectRes = await request(app)
      .patch(`/api/friends/request/${reqFriend2.body.friendship.id}`)
      .set('Authorization', `Bearer ${accessTokenB}`)
      .send({ action: 'reject' });
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.friendship.status).toBe('rejected');
  });

  it('desbloquea Dios de la BeerDex (#100) al completar los otros 99 logros y habilita icono 13, título 10 y carta Oro Imperial', async () => {
    const db = getDb();
    // Marcar los logros 1..99 como desbloqueados para userIdB y #100 bloqueado
    await db
      .update(schema.userAchievements)
      .set({ unlocked: true, currentProgress: 1, unlockedAt: new Date() })
      .where(
        and(
          eq(schema.userAchievements.userId, userIdB),
          lte(schema.userAchievements.achievementId, 99)
        )
      );
    await db
      .update(schema.userAchievements)
      .set({ unlocked: false, currentProgress: 0, unlockedAt: null })
      .where(
        and(
          eq(schema.userAchievements.userId, userIdB),
          eq(schema.userAchievements.achievementId, 100)
        )
      );

    const achRes = await request(app)
      .get('/api/achievements')
      .set('Authorization', `Bearer ${accessTokenB}`);
    expect(achRes.status).toBe(200);
    const ach100 = achRes.body.achievements.find((a: { id: number }) => a.id === 100);
    expect(ach100.unlocked).toBe(true);
    expect(ach100.currentProgress).toBe(99);

    // Equipar el icono exclusivo 13, título exclusivo 10 y carta 3D Oro Imperial (20)
    const equipExclusive = await request(app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${accessTokenB}`)
      .send({ equippedIconId: 13, equippedTitleId: 10, equippedCardStyleId: 20 });
    expect(equipExclusive.status).toBe(200);
    expect(equipExclusive.body.user.equippedIcon.name).toBe('Cáliz Dorado BeerDex');
    expect(equipExclusive.body.user.equippedTitle.name).toBe('Leyenda BeerDex');
    expect(equipExclusive.body.user.equippedCardStyle.name).toBe('Oro Imperial');
  });

  it('importa catálogo CSV/JSON validando EAN-13 y longitud de short_history', async () => {
    const templatePath = path.resolve(__dirname, '../data/catalog_template.csv');
    const csvText = await fs.readFile(templatePath, 'utf8');
    const parsed = parseCatalogCsv(csvText);
    expect(parsed.length).toBe(2);

    const db = getDb();
    const res = await importCatalogEntries(db, parsed);
    expect(res).toEqual({ brandsProcessed: 2, beersUpserted: 2 });

    expect(() =>
      parseCatalogCsv(
        'brand_name,beer_name,format,barcode,short_history,style,abv,country\n' +
          'Marca,Mala,lata,1234567890123,Demasiado corta,Lager,5.0,España\n'
      )
    ).toThrow();
  });

  it('aplica rate limiting (HTTP 429) en endpoints de recuperación al superar el límite', async () => {
    for (let i = 0; i < 5; i += 1) {
      const okRes = await request(app)
        .post('/api/auth/forgot-password')
        .set('x-enable-rate-limit-test', 'true')
        .send({ email: 'noexiste@beerdex.app' });
      expect(okRes.status).toBe(200);
    }

    const blockedRes = await request(app)
      .post('/api/auth/forgot-password')
      .set('x-enable-rate-limit-test', 'true')
      .send({ email: 'noexiste@beerdex.app' });
    expect(blockedRes.status).toBe(429);
    expect(blockedRes.body.error).toContain('Demasiados intentos');
  });

  it('gestiona sugerencias de catálogo (POST/GET) y helper de Open Food Facts', async () => {
    const dupRes = await request(app)
      .post('/api/beers/suggestions')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .send({
        barcode: estrellaBeers[0].barcode,
        brandName: 'Estrella Galicia',
        beerName: 'Duplicada',
        format: 'botellin',
      });
    expect(dupRes.status).toBe(409);

    const sugRes = await request(app)
      .post('/api/beers/suggestions')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .send({
        barcode: '8499999000018',
        brandName: 'Cerveza Regional',
        beerName: 'Artesana del Norte Lata',
        format: 'lata',
        notes: 'Comprada en supermercado local',
      });
    expect(sugRes.status).toBe(201);
    expect(sugRes.body.suggestion.status).toBe('pending');
    expect(
      sugRes.body.newlyUnlocked.some((a: { id: number }) => a.id === 99)
    ).toBe(true);

    const mineRes = await request(app)
      .get('/api/beers/suggestions/mine')
      .set('Authorization', `Bearer ${accessTokenA}`);
    expect(mineRes.status).toBe(200);
    expect(mineRes.body.suggestions).toHaveLength(1);
    expect(mineRes.body.suggestions[0].barcode).toBe('8499999000018');

    const mapped = mapOffProductToCsvRow('8410521001011', {
      product_name_es: 'Estrella Galicia Especial',
      brands: 'Estrella Galicia',
      quantity: '33 cl',
      countries: 'España',
      nutriments: { alcohol_value: 5.5 },
    });
    expect(mapped.brand_name).toBe('Estrella Galicia');
    expect(mapped.abv).toBe('5.50');
    expect(mapped.short_history.length).toBeGreaterThanOrEqual(120);
    expect(mapped.short_history.length).toBeLessThanOrEqual(150);
  });

  it('permite cambiar contraseña autenticado (PATCH /me/password) y borrar cuenta con sus fotos (DELETE /me)', async () => {
    const regC = await request(app).post('/api/auth/register').send({
      email: 'borrame@beerdex.app',
      username: 'DeleteMeUser',
      password: 'oldpass123',
    });
    expect(regC.status).toBe(201);
    const tokenC = regC.body.accessToken;

    const beerReg = await request(app)
      .post('/api/beers/register')
      .set('Authorization', `Bearer ${tokenC}`)
      .send({
        beerId: allSeededBeers[0].id,
        rating: 4,
        photoBase64: TINY_JPEG_BASE64,
      });
    expect(beerReg.status).toBe(201);
    const photoUrl: string = beerReg.body.userBeer.photoUrl;
    const localPhotoPath = path.resolve(__dirname, '..', `.${photoUrl}`);
    await expect(fs.stat(localPhotoPath)).resolves.toBeDefined();

    // Cambio de contraseña fallido con contraseña incorrecta
    const badPw = await request(app)
      .patch('/api/me/password')
      .set('Authorization', `Bearer ${tokenC}`)
      .send({ currentPassword: 'wrong', newPassword: 'newpass456' });
    expect(badPw.status).toBe(401);

    // Cambio de contraseña válido
    const okPw = await request(app)
      .patch('/api/me/password')
      .set('Authorization', `Bearer ${tokenC}`)
      .send({ currentPassword: 'oldpass123', newPassword: 'newpass456' });
    expect(okPw.status).toBe(200);

    const loginNew = await request(app).post('/api/auth/login').send({
      username: 'DeleteMeUser',
      password: 'newpass456',
    });
    expect(loginNew.status).toBe(200);
    const tokenC2 = loginNew.body.accessToken;

    // Borrar cuenta con contraseña incorrecta -> 401
    const badDel = await request(app)
      .delete('/api/me')
      .set('Authorization', `Bearer ${tokenC2}`)
      .send({ password: 'wrong' });
    expect(badDel.status).toBe(401);

    // Borrar cuenta con contraseña correcta -> 200 y elimina foto local
    const okDel = await request(app)
      .delete('/api/me')
      .set('Authorization', `Bearer ${tokenC2}`)
      .send({ password: 'newpass456' });
    expect(okDel.status).toBe(200);

    await expect(fs.stat(localPhotoPath)).rejects.toThrow();

    const loginDeleted = await request(app).post('/api/auth/login').send({
      username: 'DeleteMeUser',
      password: 'newpass456',
    });
    expect(loginDeleted.status).toBe(401);
  });

  it('gestiona La Bodega (compra atómica, saldo insuficiente, doble compra) y equipamiento de cosméticos y vitrina', async () => {
    const db = getDb();

    // Acreditar Chapas extra al usuario A para probar compras de reliquias reequilibradas
    await db
      .update(schema.users)
      .set({ chapas: sql`${schema.users.chapas} + 2000` })
      .where(eq(schema.users.id, userIdA));

    // Consultar tienda con usuario A
    const shopBefore = await request(app)
      .get('/api/shop')
      .set('Authorization', `Bearer ${accessTokenA}`);
    expect(shopBefore.status).toBe(200);
    expect(shopBefore.body.chapas).toBeGreaterThan(2000);
    expect(shopBefore.body.categories.icons).toHaveLength(14);
    expect(shopBefore.body.categories.titles).toHaveLength(12);
    expect(shopBefore.body.categories.frames).toHaveLength(6);
    expect(shopBefore.body.categories.cardStyles).toHaveLength(5);
    expect(shopBefore.body.categories.relics).toHaveLength(10);
    expect(shopBefore.body.categories.colorThemes).toHaveLength(2);

    const initialChapas = shopBefore.body.chapas;

    // Intentar equipar marco/tema bloqueado -> 403
    const lockedFrameRes = await request(app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .send({ equippedFrameId: 8 });
    expect(lockedFrameRes.status).toBe(403);

    // Comprar Reliquia "Posavasos de Múnich" (id 32, 1200 Chapas)
    const buyRelic = await request(app)
      .post('/api/shop/buy')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .send({ itemType: 'relic', itemId: 32 });
    expect(buyRelic.status).toBe(200);
    expect(buyRelic.body.newBalance).toBe(initialChapas - 1200);
    expect(buyRelic.body.item.owned).toBe(true);
    expect(buyRelic.body.item.relicPower?.level).toBe(1);

    // Doble compra -> 409 y no descuenta saldo
    const dupBuy = await request(app)
      .post('/api/shop/buy')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .send({ itemType: 'relic', itemId: 32 });
    expect(dupBuy.status).toBe(409);

    const meAfterDup = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${accessTokenA}`);
    expect(meAfterDup.body.user.chapas).toBe(initialChapas - 1200);

    // Comprar un icono de tienda (Barril de Roble, id 24, 150 Chapas) y equiparlo
    const buyIcon = await request(app)
      .post('/api/shop/buy')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .send({ itemType: 'icon', itemId: 24 });
    expect(buyIcon.status).toBe(200);

    // Intentar artículo caro (> saldo -> 400)
    const tooExpensive = await request(app)
      .post('/api/shop/buy')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .send({ itemType: 'relic', itemId: 41 }); // 15000 Chapas
    expect(tooExpensive.status).toBe(400);

    // Equipar marco desbloqueado por logro (#7 Bronce Clásico id 2 -> usuario A completó 1 marca así que #17 Primera Casa sí, pero #7 requiere 150 cervezas -> usar Marco Estándar id 1 y reliquia comprada en vitrina hueco 1)
    const equipRes = await request(app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .send({
        equippedIconId: 24,
        equippedFrameId: 1,
        showcaseSlot1Id: 32,
      });
    expect(equipRes.status).toBe(200);
    expect(equipRes.body.user.equippedIconId).toBe(24);
    expect(equipRes.body.user.showcaseRelics[0]?.id).toBe(32);

    // Mover la misma reliquia al hueco 2 limpia automáticamente el hueco 1
    const moveSlotRes = await request(app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .send({ showcaseSlot2Id: 32 });
    expect(moveSlotRes.status).toBe(200);
    expect(moveSlotRes.body.user.showcaseRelics[0]).toBeNull();
    expect(moveSlotRes.body.user.showcaseRelics[1]?.id).toBe(32);

    // Verificar idempotencia del backfill retroactivo
    await db
      .update(schema.users)
      .set({ chapasBackfilled: false })
      .where(eq(schema.users.id, userIdA));
    const chapasBeforeBackfill = moveSlotRes.body.user.chapas;
    await backfillUserChapasIfNeeded(db, userIdA);
    // Nota: backfillUserChapasIfNeeded está diseñado para cuentas de Fase 1 -> Fase 2 con chapas=0, pero llamar segunda vez con chapasBackfilled=true debe ser no-op
    const [afterFirst] = await db
      .select({ chapas: schema.users.chapas })
      .from(schema.users)
      .where(eq(schema.users.id, userIdA));
    await backfillUserChapasIfNeeded(db, userIdA);
    const [afterSecond] = await db
      .select({ chapas: schema.users.chapas })
      .from(schema.users)
      .where(eq(schema.users.id, userIdA));
    expect(afterFirst.chapas).toBeGreaterThan(chapasBeforeBackfill);
    expect(afterSecond.chapas).toBe(afterFirst.chapas);
  });

  it('valida antitrampas con Gemini en POST /api/beers/verify-scan y protege POST /api/beers/register', async () => {
    // 1) Parser unitario de respuestas Gemini Flash
    const blockedParsed = parseGeminiAntiCheatResponse(
      '```json\n{"es_pantalla":true,"tipo_detectado":"pantalla","confianza":0.97,"motivo":"Bordes de monitor visibles"}\n```'
    );
    expect(blockedParsed.allowed).toBe(false);
    expect(blockedParsed.es_pantalla).toBe(true);
    expect(blockedParsed.tipo_detectado).toBe('pantalla');

    const paperParsed = parseGeminiAntiCheatResponse(
      JSON.stringify({
        es_pantalla: false,
        tipo_detectado: 'papel_plano',
        confianza: 0.91,
        motivo: 'Impresión en folio plano',
      })
    );
    expect(paperParsed.allowed).toBe(false);
    expect(paperParsed.es_pantalla).toBe(true);

    const realParsed = parseGeminiAntiCheatResponse(
      JSON.stringify({
        es_pantalla: false,
        tipo_detectado: 'lata',
        confianza: 0.95,
        motivo: 'Lata real sobre mesa',
      })
    );
    expect(realParsed.allowed).toBe(true);
    expect(realParsed.es_pantalla).toBe(false);

    // 2) Construcción real de llamada REST a Google AI Studio (mock de fetch)
    const prevNodeEnv = process.env.NODE_ENV;
    const prevGeminiKey = env.gemini.apiKey;
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    es_pantalla: true,
                    tipo_detectado: 'pantalla',
                    confianza: 0.99,
                    motivo: 'Se observan píxeles de portátil',
                  }),
                },
              ],
            },
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', mockFetch);
    try {
      process.env.NODE_ENV = 'production';
      env.gemini.apiKey = 'fake_google_ai_studio_key';
      const restResult = await verifyBeerFrameWithGemini({ base64: TINY_JPEG_BASE64 });
      expect(restResult.allowed).toBe(false);
      expect(restResult.es_pantalla).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [calledUrl, calledInit] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(calledUrl).toContain('gemini-2.5-flash:generateContent');
      expect((calledInit.headers as Record<string, string>)['x-goog-api-key']).toBe(
        'fake_google_ai_studio_key'
      );
      const parsedBody = JSON.parse(String(calledInit.body));
      expect(parsedBody.generationConfig.thinkingConfig.thinkingBudget).toBe(0);
      expect(parsedBody.generationConfig.responseMimeType).toBe('application/json');
    } finally {
      process.env.NODE_ENV = prevNodeEnv;
      env.gemini.apiKey = prevGeminiKey;
      vi.unstubAllGlobals();
    }

    // Buscar dos cervezas aún no registradas por el usuario A
    const db = getDb();
    const userBeersRows = await db
      .select({ beerId: schema.userBeers.beerId })
      .from(schema.userBeers)
      .where(eq(schema.userBeers.userId, userIdA));
    const ownedSet = new Set(userBeersRows.map((r) => r.beerId));
    const availableBeers = allSeededBeers.filter((b) => !ownedSet.has(b.id));
    expect(availableBeers.length).toBeGreaterThanOrEqual(2);
    const targetBeer1 = availableBeers[0];
    const targetBeer2 = availableBeers[1];

    let evalCalls = 0;
    try {
      // 3) Código inexistente -> 404 sin consumir llamada a Gemini
      setAntiCheatEvaluatorForTest(async () => {
        evalCalls += 1;
        return {
          allowed: true,
          es_pantalla: false,
          tipo_detectado: 'lata',
          confianza: 0.9,
          motivo: 'ok',
        };
      });
      const notFoundVerify = await request(app)
        .post('/api/beers/verify-scan')
        .set('Authorization', `Bearer ${accessTokenA}`)
        .send({ code: '8400000000001', frameBase64: TINY_JPEG_BASE64 });
      expect(notFoundVerify.status).toBe(404);
      expect(evalCalls).toBe(0);

      // 4) Pantalla detectada -> HTTP 422 antiCheatBlocked: true
      setAntiCheatEvaluatorForTest(async () => {
        evalCalls += 1;
        return {
          allowed: false,
          es_pantalla: true,
          tipo_detectado: 'pantalla',
          confianza: 0.96,
          motivo: 'Bordes de portátil visibles alrededor del código de barras',
        };
      });
      const blockedScreen = await request(app)
        .post('/api/beers/verify-scan')
        .set('Authorization', `Bearer ${accessTokenA}`)
        .send({ code: targetBeer1.barcode, frameBase64: TINY_JPEG_BASE64 });
      expect(blockedScreen.status).toBe(422);
      expect(blockedScreen.body.antiCheatBlocked).toBe(true);
      expect(blockedScreen.body.es_pantalla).toBe(true);
      expect(evalCalls).toBe(1);

      // 5) Folio / papel plano -> HTTP 422 antiCheatBlocked: true
      setAntiCheatEvaluatorForTest(async () => {
        evalCalls += 1;
        return {
          allowed: false,
          es_pantalla: true,
          tipo_detectado: 'papel_plano',
          confianza: 0.9,
          motivo: 'Folio impreso sobre escritorio',
        };
      });
      const blockedPaper = await request(app)
        .post('/api/beers/verify-scan')
        .set('Authorization', `Bearer ${accessTokenA}`)
        .send({ code: targetBeer1.barcode, frameBase64: TINY_JPEG_BASE64 });
      expect(blockedPaper.status).toBe(422);
      expect(blockedPaper.body.antiCheatBlocked).toBe(true);
      expect(blockedPaper.body.tipo_detectado).toBe('papel_plano');

      // 6) Envase real (lata/botella/pack) -> HTTP 200 con scanVerificationToken y registro sin re-evaluar
      setAntiCheatEvaluatorForTest(async () => {
        evalCalls += 1;
        return {
          allowed: true,
          es_pantalla: false,
          tipo_detectado: 'lata',
          confianza: 0.98,
          motivo: 'Lata real sostenida en mano',
        };
      });
      const verifiedRes = await request(app)
        .post('/api/beers/verify-scan')
        .set('Authorization', `Bearer ${accessTokenA}`)
        .send({ code: targetBeer1.barcode, frameBase64: TINY_JPEG_BASE64 });
      expect(verifiedRes.status).toBe(200);
      expect(verifiedRes.body.scanVerificationToken).toBeTypeOf('string');
      expect(verifiedRes.body.antiCheat.es_pantalla).toBe(false);

      const callsBeforeRegister = evalCalls;
      const regWithToken = await request(app)
        .post('/api/beers/register')
        .set('Authorization', `Bearer ${accessTokenA}`)
        .send({
          beerId: verifiedRes.body.beer.id,
          rating: 5,
          photoBase64: TINY_JPEG_BASE64,
          scanVerificationToken: verifiedRes.body.scanVerificationToken,
        });
      expect(regWithToken.status).toBe(201);
      trackUploadUrl(regWithToken.body.userBeer.photoUrl);
      expect(evalCalls).toBe(callsBeforeRegister);

      // 7) Registro directo sin token (p.ej. entrada manual) subiendo foto de pantalla -> 422 bloqueado
      setAntiCheatEvaluatorForTest(async () => {
        evalCalls += 1;
        return {
          allowed: false,
          es_pantalla: true,
          tipo_detectado: 'pantalla',
          confianza: 0.94,
          motivo: 'Pantalla detectada en foto manual',
        };
      });
      const blockedRegister = await request(app)
        .post('/api/beers/register')
        .set('Authorization', `Bearer ${accessTokenA}`)
        .send({
          beerId: targetBeer2.id,
          rating: 4,
          photoBase64: TINY_JPEG_BASE64,
        });
      expect(blockedRegister.status).toBe(422);
      expect(blockedRegister.body.antiCheatBlocked).toBe(true);
    } finally {
      setAntiCheatEvaluatorForTest(null);
    }
  });

  it('usa PBKDF2-SHA256 en nuevos registros y migra automáticamente hashes bcrypt legados al iniciar sesión', async () => {
    const db = getDb();
    const bcryptMod = await import('bcryptjs');
    const bcrypt = bcryptMod.default ?? bcryptMod;

    // 1) Registro nuevo genera hash pbkdf2_sha256$ y permite login
    const pbkdfUsername = 'pbkdf_tester';
    const regRes = await request(app).post('/api/auth/register').send({
      email: 'pbkdf_tester@example.com',
      username: pbkdfUsername,
      password: 'Password123!',
    });
    expect(regRes.status).toBe(201);

    const [createdRow] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.username, pbkdfUsername));
    expect(createdRow).toBeDefined();
    expect(createdRow.passwordHash.startsWith('pbkdf2_sha256$100000$')).toBe(true);

    const pbkdfLogin = await request(app).post('/api/auth/login').send({
      username: pbkdfUsername,
      password: 'Password123!',
    });
    expect(pbkdfLogin.status).toBe(200);
    expect(pbkdfLogin.body.accessToken).toBeTypeOf('string');

    // 2) Simular usuario legado con hash $2a$10$ -> login válido y auto-migración a PBKDF2
    const legacyPlain = 'LegacySecret99';
    const legacyBcryptHash = await bcrypt.hash(legacyPlain, 10);
    expect(legacyBcryptHash.startsWith('$2')).toBe(true);

    await db
      .update(schema.users)
      .set({ passwordHash: legacyBcryptHash })
      .where(eq(schema.users.id, createdRow.id));

    const wrongLogin = await request(app).post('/api/auth/login').send({
      username: pbkdfUsername,
      password: 'WrongPassword',
    });
    expect(wrongLogin.status).toBe(401);

    const upgradedLogin = await request(app).post('/api/auth/login').send({
      username: pbkdfUsername,
      password: legacyPlain,
    });
    expect(upgradedLogin.status).toBe(200);

    const [migratedRow] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, createdRow.id));
    expect(migratedRow.passwordHash.startsWith('pbkdf2_sha256$100000$')).toBe(true);

    await db.delete(schema.users).where(eq(schema.users.id, createdRow.id));
  });

  it('almacena y elimina fotos mediante Cloudflare R2 cuando runtimeBindings registra un bucket', async () => {
    const r2Objects = new Map<string, { value: unknown; contentType?: string }>();
    const mockBucket: R2BucketLike = {
      async put(key, value, options) {
        r2Objects.set(key, {
          value,
          contentType: options?.httpMetadata?.contentType,
        });
      },
      async get() {
        return null;
      },
      async delete(keys) {
        const list = Array.isArray(keys) ? keys : [keys];
        for (const k of list) {
          r2Objects.delete(k);
        }
      },
    };

    setRuntimeBindings({
      getEnv: () => ({
        NODE_ENV: process.env.NODE_ENV,
        JWT_SECRET: process.env.JWT_SECRET,
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
      }),
      getR2Bucket: () => mockBucket,
    });

    try {
      const healthRes = await request(app).get('/api/health');
      expect(healthRes.status).toBe(200);
      expect(healthRes.body.storage).toBe('r2');

      const uploadedUrl = await uploadBeerPhoto({ base64: TINY_JPEG_BASE64 });
      expect(uploadedUrl).toMatch(/^\/media\/photos\/[0-9a-f-]+\.jpg$/);

      const expectedKey = uploadedUrl.slice('/media/'.length);
      expect(r2Objects.has(expectedKey)).toBe(true);
      expect(r2Objects.get(expectedKey)?.contentType).toBe('image/jpeg');

      await deleteStoredPhoto(uploadedUrl);
      expect(r2Objects.has(expectedKey)).toBe(false);
    } finally {
      setRuntimeBindings(null);
    }
  });

  it('valida imágenes con Cloudflare Workers AI cuando env.AI está disponible y reporta antiCheat en /api/health', async () => {
    const prevNodeEnv = process.env.NODE_ENV;
    let nextAiPayload: unknown = {};
    const calls: Array<{ model: string; input: Record<string, unknown> }> = [];
    const mockAi: AiBindingLike = {
      async run(model, input) {
        calls.push({ model, input });
        return nextAiPayload;
      },
    };

    setRuntimeBindings({
      getEnv: () => ({
        NODE_ENV: process.env.NODE_ENV,
        JWT_SECRET: process.env.JWT_SECRET,
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
        ANTI_CHEAT_STRICT: 'true',
      }),
      getAiBinding: () => mockAi,
    });

    try {
      const healthRes = await request(app).get('/api/health');
      expect(healthRes.status).toBe(200);
      expect(healthRes.body.antiCheat).toBe('workers-ai');

      process.env.NODE_ENV = 'production';

      // 1) Pantalla detectada -> bloqueado
      nextAiPayload = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                es_pantalla: true,
                tipo_detectado: 'pantalla',
                confianza: 0.98,
                motivo: 'Monitor detectado',
              }),
            },
          },
        ],
      };
      const blocked = await verifyBeerFrameWithGemini({ base64: TINY_JPEG_BASE64 });
      expect(blocked.allowed).toBe(false);
      expect(blocked.es_pantalla).toBe(true);
      expect(blocked.tipo_detectado).toBe('pantalla');
      expect(calls[0]?.model).toBe('@cf/google/gemma-4-26b-a4b-it');

      // 2) Botella real -> permitido
      nextAiPayload = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                es_pantalla: false,
                tipo_detectado: 'botella',
                confianza: 0.96,
                motivo: 'Botella real sobre mesa',
              }),
            },
          },
        ],
      };
      const allowed = await verifyBeerFrameWithGemini({ base64: TINY_JPEG_BASE64 });
      expect(allowed.allowed).toBe(true);
      expect(allowed.es_pantalla).toBe(false);
      expect(allowed.tipo_detectado).toBe('botella');
    } finally {
      process.env.NODE_ENV = prevNodeEnv;
      setRuntimeBindings(null);
    }
  });

  it('sistema completo de Reliquias (precios, mejora Nv.1->5 en Tesorería, multiplicadores y descuento en La Bodega)', async () => {
    const db = getDb();

    const regTester = await request(app).post('/api/auth/register').send({
      email: 'relic_tester@beerdex.local',
      username: 'RelicTester',
      password: 'password123',
    });
    expect(regTester.status).toBe(201);
    const tokenTester = regTester.body.accessToken as string;
    const testerId = regTester.body.user.id as string;

    // Acreditar saldo suficiente para probar compra + forja Nv.1 -> Nv.5
    await db
      .update(schema.users)
      .set({ chapas: 60000 })
      .where(eq(schema.users.id, testerId));

    // 1) Precios reequilibrados de las 10 reliquias y metadata de 5 niveles
    const shopRes = await request(app)
      .get('/api/shop')
      .set('Authorization', `Bearer ${tokenTester}`);
    expect(shopRes.status).toBe(200);
    const relicPrices = (shopRes.body.categories.relics as Array<{ priceChapas: number }>).map(
      (r) => r.priceChapas
    );
    expect(relicPrices).toEqual([
      1200, 1800, 2500, 3500, 5000, 6500, 8500, 10000, 12500, 15000,
    ]);
    expect(shopRes.body.categories.relics[0].relicPower?.levels).toHaveLength(5);

    // 2) Intentar mejorar reliquia sin poseerla -> 403
    const upgradeLocked = await request(app)
      .post('/api/shop/relics/33/upgrade')
      .set('Authorization', `Bearer ${tokenTester}`);
    expect(upgradeLocked.status).toBe(403);

    // 3) Comprar Abrebotellas Antiguo (33: 1800), Chapa de Platino (36: 5000), Llave (38: 8500) y Corona Real (41: 15000)
    for (const id of [33, 36, 38, 41]) {
      const buy = await request(app)
        .post('/api/shop/buy')
        .set('Authorization', `Bearer ${tokenTester}`)
        .send({ itemType: 'relic', itemId: id });
      expect(buy.status).toBe(200);
    }

    // 4) Subir Abrebotellas Antiguo (tier común: 500, 1000, 2000, 3500) de Nv.1 a Nv.5
    const expectedCosts = [500, 1000, 2000, 3500];
    for (let i = 0; i < expectedCosts.length; i += 1) {
      const upg = await request(app)
        .post('/api/shop/relics/33/upgrade')
        .set('Authorization', `Bearer ${tokenTester}`);
      expect(upg.status).toBe(200);
      expect(upg.body.newLevel).toBe(i + 2);
      expect(upg.body.upgradeCostPaid).toBe(expectedCosts[i]);
    }

    // Intentar superar Nv.5 -> 400
    const upgradeOverMax = await request(app)
      .post('/api/shop/relics/33/upgrade')
      .set('Authorization', `Bearer ${tokenTester}`);
    expect(upgradeOverMax.status).toBe(400);

    // Probar saldo insuficiente al mejorar
    await db
      .update(schema.users)
      .set({ chapas: 100 })
      .where(eq(schema.users.id, testerId));
    const upgradePoor = await request(app)
      .post('/api/shop/relics/36/upgrade')
      .set('Authorization', `Bearer ${tokenTester}`);
    expect(upgradePoor.status).toBe(400);
    await db
      .update(schema.users)
      .set({ chapas: 50000 })
      .where(eq(schema.users.id, testerId));

    // 5) Equipar las 3 reliquias activas en vitrina:
    //    slot1: id 33 Nv.5 (+100% botellín), slot2: id 36 Nv.1 (+5 Ch. nueva), slot3: id 41 Nv.1 (+15% global 3/3)
    const equipShowcase = await request(app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${tokenTester}`)
      .send({
        showcaseSlot1Id: 33,
        showcaseSlot2Id: 36,
        showcaseSlot3Id: 41,
      });
    expect(equipShowcase.status).toBe(200);
    expect(equipShowcase.body.activeRelicsSummary?.activeCount).toBe(3);
    expect(equipShowcase.body.activeRelicsSummary?.fullShowcaseActive).toBe(true);

    // Elegir 2 botellines Lager españoles (<7% ABV) de marcas con >2 cervezas (para completedBrandBonus = 0)
    const catalogRows = await db.select().from(schema.beers);
    const brandCountMap = new Map<number, number>();
    for (const row of catalogRows) {
      brandCountMap.set(row.brandId, (brandCountMap.get(row.brandId) || 0) + 1);
    }
    const lagerBotellines = catalogRows.filter(
      (b) =>
        b.format === 'botellin' &&
        b.style === 'Lager' &&
        b.country === 'España' &&
        Number(b.abv) < 7 &&
        (brandCountMap.get(b.brandId) || 0) > 2
    );
    expect(lagerBotellines.length).toBeGreaterThanOrEqual(2);

    const regWithRelics = await request(app)
      .post('/api/beers/register')
      .set('Authorization', `Bearer ${tokenTester}`)
      .send({
        beerId: lagerBotellines[0].id,
        rating: 3,
        photoBase64: TINY_JPEG_BASE64,
      });
    expect(regWithRelics.status).toBe(201);
    trackUploadUrl(regWithRelics.body.userBeer.photoUrl);
    // Cálculo: ((10 + 5) * (1 + 1.00)) * 1.15 = 30 * 1.15 = 34.5 -> 35 (+25 bonus de reliquias)
    expect(regWithRelics.body.relicBonusChapas).toBe(25);
    // Logro #1 Primer Sorbo (15 base) * 1.15 global = 17.25 -> 17
    expect(regWithRelics.body.achievementChapas).toBe(17);
    expect(regWithRelics.body.chapasEarned).toBe(35 + 17);

    // Desequipar la vitrina y registrar el segundo botellín -> 0 bonus de reliquias
    const clearShowcase = await request(app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${tokenTester}`)
      .send({
        showcaseSlot1Id: null,
        showcaseSlot2Id: null,
        showcaseSlot3Id: null,
      });
    expect(clearShowcase.status).toBe(200);
    expect(clearShowcase.body.activeRelicsSummary?.activeCount).toBe(0);

    const regNoRelics = await request(app)
      .post('/api/beers/register')
      .set('Authorization', `Bearer ${tokenTester}`)
      .send({
        beerId: lagerBotellines[1].id,
        rating: 3,
        photoBase64: TINY_JPEG_BASE64,
      });
    expect(regNoRelics.status).toBe(201);
    trackUploadUrl(regNoRelics.body.userBeer.photoUrl);
    expect(regNoRelics.body.relicBonusChapas).toBe(0);

    // 6) Descuento en La Bodega con Llave de La Bodega (id 38, Nv.1 = -5%)
    await request(app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${tokenTester}`)
      .send({ showcaseSlot1Id: 38 });

    const discountedShop = await request(app)
      .get('/api/shop')
      .set('Authorization', `Bearer ${tokenTester}`);
    expect(discountedShop.status).toBe(200);
    expect(discountedShop.body.shopDiscountPct).toBe(5);
    const barrilIcon = discountedShop.body.categories.icons.find(
      (i: { id: number }) => i.id === 24
    );
    expect(barrilIcon.basePriceChapas).toBe(150);
    expect(barrilIcon.priceChapas).toBe(143);
    expect(barrilIcon.discountPct).toBe(5);

    const munichRelic = discountedShop.body.categories.relics.find(
      (r: { id: number }) => r.id === 32
    );
    expect(munichRelic.priceChapas).toBe(1200); // Reliquias no reciben descuento
    expect(munichRelic.discountPct).toBe(0);

    const balanceBeforeDiscountBuy = discountedShop.body.chapas;
    const buyDiscountedIcon = await request(app)
      .post('/api/shop/buy')
      .set('Authorization', `Bearer ${tokenTester}`)
      .send({ itemType: 'icon', itemId: 24 });
    expect(buyDiscountedIcon.status).toBe(200);
    expect(buyDiscountedIcon.body.newBalance).toBe(balanceBeforeDiscountBuy - 143);

    // 7) Reliquia de logro desbloqueada (sin fila previa en user_cosmetics) mejora Nv.1 -> Nv.2 por 250 Chapas
    await db
      .update(schema.userAchievements)
      .set({ currentProgress: 6, unlocked: true, unlockedAt: new Date() })
      .where(
        and(
          eq(schema.userAchievements.userId, testerId),
          eq(schema.userAchievements.achievementId, 62)
        )
      );

    const upgradeAchRelic = await request(app)
      .post('/api/shop/relics/29/upgrade')
      .set('Authorization', `Bearer ${tokenTester}`);
    expect(upgradeAchRelic.status).toBe(200);
    expect(upgradeAchRelic.body.newLevel).toBe(2);
    expect(upgradeAchRelic.body.upgradeCostPaid).toBe(250);
  });
});

import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

process.env.DATABASE_URL = 'pglite://memory';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_access_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';

import { app } from '../src/app';
import { closeDb, getDb, initDb, schema } from '../src/db';
import { seedDatabase } from '../src/db/seedData';
import { setAntiCheatEvaluatorForTest } from '../src/services/antiCheatService';
import {
  closePreviousMonthIfNeeded,
  ensureCurrentMission,
  evaluateTabernaAchievements,
  getMadridMonthKey,
  getPreviousMonthKey,
  TabernaMissionConfig,
} from '../src/services/tabernaService';

const TINY_JPEG_BASE64 =
  'data:image/jpeg;base64,' +
  Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xff, 0xd9]).toString(
    'base64'
  );

interface TestUser {
  id: string;
  token: string;
  username: string;
}

describe('Tabernas Multijugador API, Minijuegos y Logros 101-110', () => {
  const users: TestUser[] = [];
  let allBeers: Array<typeof schema.beers.$inferSelect> = [];

  async function registerTestUser(idx: number, chapas = 0): Promise<TestUser> {
    const username = `Tabernero${idx}`;
    const res = await request(app).post('/api/auth/register').send({
      email: `tabernero${idx}@beerdex.app`,
      username,
      password: 'password123',
    });
    expect(res.status).toBe(201);
    const db = getDb();
    if (chapas > 0) {
      await db
        .update(schema.users)
        .set({ chapas })
        .where(eq(schema.users.id, res.body.user.id));
    }
    return { id: res.body.user.id, token: res.body.accessToken, username };
  }

  beforeAll(async () => {
    const db = await initDb('pglite://memory');
    await seedDatabase(db);
    allBeers = await db.select().from(schema.beers);

    // Crear 11 usuarios para probar límites de aforo 10 y 5 tabernas
    for (let i = 1; i <= 11; i += 1) {
      users.push(await registerTestUser(i, i <= 3 ? 2000 : 500));
    }
  });

  afterAll(async () => {
    setAntiCheatEvaluatorForTest(null);
    await closeDb();
  });

  it('gestiona fundación (100 Ch.), nombre único, límite 5 Tabernas y aforo máx. 10 miembros + logros 101-103', async () => {
    const db = getDb();
    const uPoor = await registerTestUser(99, 50);

    // Sin 100 Chapas no puede fundar
    const failCreate = await request(app)
      .post('/api/tabernas')
      .set('Authorization', `Bearer ${uPoor.token}`)
      .send({ name: 'SinFondos', description: 'Test', visibility: 'public', minBeers: 0 });
    expect(failCreate.status).toBe(400);

    // Funda u0 (2000 Ch -> -100 + 150 logro #101 = 2050 Ch.)
    const u0 = users[0];
    const c1 = await request(app)
      .post('/api/tabernas')
      .set('Authorization', `Bearer ${u0.token}`)
      .send({
        name: 'Orden del Lúpulo',
        description: 'Hermandad cervecera',
        visibility: 'public',
        minBeers: 0,
      });
    expect(c1.status).toBe(201);
    expect(c1.body.taberna.name).toBe('Orden del Lúpulo');
    expect(c1.body.newlyUnlocked.some((a: { id: number }) => a.id === 101)).toBe(true);
    expect(c1.body.newBalance).toBe(2050);

    const tabernaId = c1.body.taberna.id as string;

    // Nombre único case-insensitive
    const dup = await request(app)
      .post('/api/tabernas')
      .set('Authorization', `Bearer ${users[1].token}`)
      .send({ name: 'orden del lúpulo', description: '', visibility: 'public', minBeers: 0 });
    expect(dup.status).toBe(409);

    // u0 funda 4 Tabernas más hasta el límite de 5
    for (let k = 2; k <= 5; k += 1) {
      const ck = await request(app)
        .post('/api/tabernas')
        .set('Authorization', `Bearer ${u0.token}`)
        .send({ name: `Taberna Extra ${k}`, description: '', visibility: 'public', minBeers: 0 });
      expect(ck.status).toBe(201);
    }
    const overLimit = await request(app)
      .post('/api/tabernas')
      .set('Authorization', `Bearer ${u0.token}`)
      .send({ name: 'Sexta Taberna', description: '', visibility: 'public', minBeers: 0 });
    expect(overLimit.status).toBe(400);

    // Llenar 'Orden del Lúpulo' hasta 10 miembros (u0 + u1..u9) y comprobar logros 102 (5 miembros) y 103 (10 miembros)
    for (let i = 1; i <= 9; i += 1) {
      const j = await request(app)
        .post(`/api/tabernas/${tabernaId}/join`)
        .set('Authorization', `Bearer ${users[i].token}`);
      expect(j.status).toBe(200);
      expect(j.body.joined).toBe(true);
    }

    // El 11º usuario (users[10]) debe recibir 409 por aforo completo
    const fullErr = await request(app)
      .post(`/api/tabernas/${tabernaId}/join`)
      .set('Authorization', `Bearer ${users[10].token}`);
    expect(fullErr.status).toBe(409);

    // Comprobar #102 (Tabernero Mayor, fundador con 5+ miembros) y #103 (Hermandad Completa, 10 miembros)
    const achU0 = await request(app)
      .get('/api/achievements')
      .set('Authorization', `Bearer ${u0.token}`);
    const unlockedU0 = new Set(
      achU0.body.achievements.filter((a: { unlocked: boolean }) => a.unlocked).map((a: { id: number }) => a.id)
    );
    expect(unlockedU0.has(101)).toBe(true);
    expect(unlockedU0.has(102)).toBe(true);
    expect(unlockedU0.has(103)).toBe(true);

    // Limpiar expulsando o dejando espacio: comprobar cooldown 24h al expulsar
    const kickRes = await request(app)
      .delete(`/api/tabernas/${tabernaId}/members/${users[9].id}`)
      .set('Authorization', `Bearer ${u0.token}`);
    expect(kickRes.status).toBe(200);

    const rejoinFast = await request(app)
      .post(`/api/tabernas/${tabernaId}/join`)
      .set('Authorization', `Bearer ${users[9].token}`);
    expect(rejoinFast.status).toBe(403);

    // Comprobar que el cooldown expirado permite reingresar
    await db
      .update(schema.tabernaCooldowns)
      .set({ until: new Date(Date.now() - 1000) })
      .where(
        and(
          eq(schema.tabernaCooldowns.tabernaId, tabernaId),
          eq(schema.tabernaCooldowns.userId, users[9].id)
        )
      );
    const rejoinOk = await request(app)
      .post(`/api/tabernas/${tabernaId}/join`)
      .set('Authorization', `Bearer ${users[9].token}`);
    expect(rejoinOk.status).toBe(200);
    expect(rejoinOk.body.joined).toBe(true);
  });

  it('gestiona Tabernas privadas, requisito minBeers, edición, herencia de liderazgo y eliminación', async () => {
    const db = getDb();
    const leader = users[1];
    const applicant = users[10];

    const cPriv = await request(app)
      .post('/api/tabernas')
      .set('Authorization', `Bearer ${leader.token}`)
      .send({
        name: 'Cámara Privada',
        description: 'Solo maestros',
        visibility: 'private',
        minBeers: 1,
      });
    expect(cPriv.status).toBe(201);
    const tid = cPriv.body.taberna.id as string;

    // No líder no puede editar
    const nonLeaderPatch = await request(app)
      .patch(`/api/tabernas/${tid}`)
      .set('Authorization', `Bearer ${applicant.token}`)
      .send({ description: 'Hack' });
    expect(nonLeaderPatch.status).toBe(403);

    // Applicant tiene 0 cervezas -> bloqueado al solicitar
    const reqDenied = await request(app)
      .post(`/api/tabernas/${tid}/join`)
      .set('Authorization', `Bearer ${applicant.token}`);
    expect(reqDenied.status).toBe(403);

    // Registrar 1 cerveza para applicant en su BeerDex personal
    await db.insert(schema.userBeers).values({
      userId: applicant.id,
      beerId: allBeers[0].id,
      photoUrl: '/uploads/test.jpg',
      rating: 4,
    });

    // Ahora sí solicita acceso
    const reqOk = await request(app)
      .post(`/api/tabernas/${tid}/join`)
      .set('Authorization', `Bearer ${applicant.token}`);
    expect(reqOk.status).toBe(200);
    expect(reqOk.body.requested).toBe(true);
    const reqId = reqOk.body.requestId as string;

    // Si el líder sube minBeers a 2 antes de aceptar, el accept debe revalidar y rechazar (403)
    await request(app)
      .patch(`/api/tabernas/${tid}`)
      .set('Authorization', `Bearer ${leader.token}`)
      .send({ minBeers: 2 });
    const acceptFail = await request(app)
      .post(`/api/tabernas/${tid}/requests/${reqId}/accept`)
      .set('Authorization', `Bearer ${leader.token}`);
    expect(acceptFail.status).toBe(403);

    // Bajar minBeers a 1 y aceptar
    await request(app)
      .patch(`/api/tabernas/${tid}`)
      .set('Authorization', `Bearer ${leader.token}`)
      .send({ minBeers: 1 });
    const acceptOk = await request(app)
      .post(`/api/tabernas/${tid}/requests/${reqId}/accept`)
      .set('Authorization', `Bearer ${leader.token}`);
    expect(acceptOk.status).toBe(200);

    // Si el líder abandona, applicant hereda el liderazgo
    const leaveRes = await request(app)
      .post(`/api/tabernas/${tid}/leave`)
      .set('Authorization', `Bearer ${leader.token}`);
    expect(leaveRes.status).toBe(200);
    expect(leaveRes.body.deletedTaberna).toBe(false);
    expect(leaveRes.body.newLeaderId).toBe(applicant.id);

    // Si el último miembro abandona, la Taberna se elimina automáticamente
    const leaveLast = await request(app)
      .post(`/api/tabernas/${tid}/leave`)
      .set('Authorization', `Bearer ${applicant.token}`);
    expect(leaveLast.status).toBe(200);
    expect(leaveLast.body.deletedTaberna).toBe(true);

    const getGone = await request(app)
      .get(`/api/tabernas/${tid}`)
      .set('Authorization', `Bearer ${leader.token}`);
    expect(getGone.status).toBe(404);
  });

  it('flujo «Escanear para la Taberna» funciona con cerveza ya registrada, sin foto ni valoración y respeta antitrampas', async () => {
    const db = getDb();
    const u = users[2];
    const createRes = await request(app)
      .post('/api/tabernas')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ name: 'Escáner Rápido Club', description: '', visibility: 'public', minBeers: 0 });
    expect(createRes.status).toBe(201);
    const tid = createRes.body.taberna.id as string;

    // Forzar Bingo 3x3
    await db.delete(schema.tabernaMissions).where(eq(schema.tabernaMissions.tabernaId, tid));
    const mission = await ensureCurrentMission(db, tid, { forceGameType: 'bingo' });
    const cells = (mission.config as TabernaMissionConfig).cells!;
    const targetBeer = allBeers.find((b) => b.id === cells[0].beerId)!;

    // Registrar primero esa cerveza en la BeerDex personal de u
    await db
      .insert(schema.userBeers)
      .values({
        userId: u.id,
        beerId: targetBeer.id,
        photoUrl: '/uploads/personal.jpg',
        rating: 5,
      })
      .onConflictDoNothing();

    // Antitrampas bloquea si la captura muestra una pantalla
    setAntiCheatEvaluatorForTest(async () => ({
      allowed: false,
      es_pantalla: true,
      tipo_detectado: 'pantalla',
      confianza: 0.99,
      motivo: 'Monitor detectado en test',
      provider: 'gemini',
      skipped: false,
    }));

    const blockedScan = await request(app)
      .post(`/api/tabernas/${tid}/scan`)
      .set('Authorization', `Bearer ${u.token}`)
      .send({ code: targetBeer.barcode, frameBase64: TINY_JPEG_BASE64 });
    expect(blockedScan.status).toBe(422);
    expect(blockedScan.body.antiCheatBlocked).toBe(true);

    // Con foto válida, aunque ya la tenga en BeerDex personal, se añade sin foto ni valoración
    setAntiCheatEvaluatorForTest(async () => ({
      allowed: true,
      es_pantalla: false,
      tipo_detectado: 'botella',
      confianza: 0.99,
      motivo: 'OK',
      provider: 'gemini',
      skipped: false,
    }));

    const okScan = await request(app)
      .post(`/api/tabernas/${tid}/scan`)
      .set('Authorization', `Bearer ${u.token}`)
      .send({ code: targetBeer.barcode, frameBase64: TINY_JPEG_BASE64 });
    expect(okScan.status).toBe(200);
    expect(okScan.body.status).toBe('valid');

    // Re-escanear la misma devuelve already_contributed
    const dupScan = await request(app)
      .post(`/api/tabernas/${tid}/scan`)
      .set('Authorization', `Bearer ${u.token}`)
      .send({ code: targetBeer.barcode });
    expect(dupScan.status).toBe(200);
    expect(dupScan.body.status).toBe('already_contributed');

    setAntiCheatEvaluatorForTest(null);
  });

  it('completa Bingo 3×3: línea (+100 Ch. aportadores, +150 pts, #104) y cartón completo (+500 Ch., +500 pts, #105, subida de nivel)', async () => {
    const db = getDb();
    const uA = users[3];
    const uB = users[4];
    const cRes = await request(app)
      .post('/api/tabernas')
      .set('Authorization', `Bearer ${uA.token}`)
      .send({ name: 'Bingo Masters', description: '', visibility: 'public', minBeers: 0 });
    const tid = cRes.body.taberna.id as string;
    await request(app).post(`/api/tabernas/${tid}/join`).set('Authorization', `Bearer ${uB.token}`);

    await db.delete(schema.tabernaMissions).where(eq(schema.tabernaMissions.tabernaId, tid));
    const mission = await ensureCurrentMission(db, tid, { forceGameType: 'bingo' });
    const cells = (mission.config as TabernaMissionConfig).cells!;
    const cellIds = new Set(cells.map((c) => c.beerId));
    const nonCellBeer = allBeers.find((b) => !cellIds.has(b.id))!;

    // Cerveza fuera del cartón -> invalid
    const invalidRes = await request(app)
      .post(`/api/tabernas/${tid}/scan`)
      .set('Authorization', `Bearer ${uA.token}`)
      .send({ code: nonCellBeer.barcode });
    expect(invalidRes.status).toBe(200);
    expect(invalidRes.body.status).toBe('invalid');

    // Completar fila 0: celdas 0 y 1 por uA, celda 2 por uB
    for (const [idx, actor] of [
      [0, uA],
      [1, uA],
      [2, uB],
    ] as const) {
      const b = allBeers.find((x) => x.id === cells[idx].beerId)!;
      const r = await request(app)
        .post(`/api/tabernas/${tid}/scan`)
        .set('Authorization', `Bearer ${actor.token}`)
        .send({ code: b.barcode });
      expect(r.status).toBe(200);
      expect(r.body.status).toBe('valid');
      if (idx === 2) {
        expect(r.body.pointsAwarded).toBe(150);
        expect(r.body.chapasEarned).toBeGreaterThanOrEqual(100);
        expect(r.body.newlyUnlocked.some((a: { id: number }) => a.id === 104)).toBe(true);
      }
    }

    // Completar el resto del cartón (3..8) con uA
    for (let idx = 3; idx < 9; idx += 1) {
      const b = allBeers.find((x) => x.id === cells[idx].beerId)!;
      const r = await request(app)
        .post(`/api/tabernas/${tid}/scan`)
        .set('Authorization', `Bearer ${uA.token}`)
        .send({ code: b.barcode });
      expect(r.status).toBe(200);
      expect(r.body.status).toBe('valid');
    }

    const detail = await request(app)
      .get(`/api/tabernas/${tid}`)
      .set('Authorization', `Bearer ${uA.token}`);
    expect(detail.body.mission.status).toBe('completed');
    // 8 líneas * 150 + 500 cartón = 1700 pts -> Nivel 4 (500, 1000, 1500)
    expect(detail.body.taberna.points).toBe(1700);
    expect(detail.body.taberna.level).toBe(4);
    expect(detail.body.mission.progress.flawless).toBe(true);

    // Comprobar logros #105 y #107 para uB también
    const achB = await request(app)
      .get('/api/achievements')
      .set('Authorization', `Bearer ${uB.token}`);
    const setB = new Set(
      achB.body.achievements.filter((a: { unlocked: boolean }) => a.unlocked).map((a: { id: number }) => a.id)
    );
    expect(setB.has(104)).toBe(true);
    expect(setB.has(105)).toBe(true);
    expect(setB.has(107)).toBe(true);
  });

  it('completa Escalera del Grado en orden estricto (invalid si adelantado, already si pasado, 50% y 100%)', async () => {
    const db = getDb();
    const u = users[5];
    const cRes = await request(app)
      .post('/api/tabernas')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ name: 'Escalera Peña', description: '', visibility: 'public', minBeers: 0 });
    const tid = cRes.body.taberna.id as string;

    await db.delete(schema.tabernaMissions).where(eq(schema.tabernaMissions.tabernaId, tid));
    await ensureCurrentMission(db, tid, { forceGameType: 'escalera' });

    const b0 = allBeers.find((b) => Number(b.abv) < 4)!;
    const b1 = allBeers.find((b) => Number(b.abv) >= 4 && Number(b.abv) < 5)!;
    const b2 = allBeers.find((b) => Number(b.abv) >= 5 && Number(b.abv) < 6)!;
    const b3 = allBeers.find((b) => Number(b.abv) >= 6 && Number(b.abv) < 7)!;
    const b4 = allBeers.find((b) => Number(b.abv) >= 7)!;

    // Intentar peldaño 2 antes del 0 -> invalid
    const outOfOrder = await request(app)
      .post(`/api/tabernas/${tid}/scan`)
      .set('Authorization', `Bearer ${u.token}`)
      .send({ code: b2.barcode });
    expect(outOfOrder.body.status).toBe('invalid');

    const r0 = await request(app)
      .post(`/api/tabernas/${tid}/scan`)
      .set('Authorization', `Bearer ${u.token}`)
      .send({ code: b0.barcode });
    expect(r0.body.status).toBe('valid');

    // Repetir peldaño 0 con otra cerveza <4 -> already_contributed
    const b0Alt = allBeers.find((b) => Number(b.abv) < 4 && b.id !== b0.id)!;
    const pastStep = await request(app)
      .post(`/api/tabernas/${tid}/scan`)
      .set('Authorization', `Bearer ${u.token}`)
      .send({ code: b0Alt.barcode });
    expect(pastStep.body.status).toBe('already_contributed');

    await request(app)
      .post(`/api/tabernas/${tid}/scan`)
      .set('Authorization', `Bearer ${u.token}`)
      .send({ code: b1.barcode });
    const r2 = await request(app)
      .post(`/api/tabernas/${tid}/scan`)
      .set('Authorization', `Bearer ${u.token}`)
      .send({ code: b2.barcode });
    expect(r2.body.chapasEarned).toBe(150); // 50%

    await request(app)
      .post(`/api/tabernas/${tid}/scan`)
      .set('Authorization', `Bearer ${u.token}`)
      .send({ code: b3.barcode });
    const r4 = await request(app)
      .post(`/api/tabernas/${tid}/scan`)
      .set('Authorization', `Bearer ${u.token}`)
      .send({ code: b4.barcode });
    expect(r4.body.status).toBe('valid');
    expect(r4.body.pointsAwarded).toBe(350);
    expect(r4.body.mission.status).toBe('completed');
    expect(r4.body.chapasEarned).toBeGreaterThanOrEqual(400);
  });

  it('completa Ruta Internacional (50% y 100%)', async () => {
    const db = getDb();
    const u = users[6];
    const cRes = await request(app)
      .post('/api/tabernas')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ name: 'Viajeros Birra', description: '', visibility: 'public', minBeers: 0 });
    const tid = cRes.body.taberna.id as string;

    await db.delete(schema.tabernaMissions).where(eq(schema.tabernaMissions.tabernaId, tid));
    const mission = await ensureCurrentMission(db, tid, { forceGameType: 'ruta' });
    const countries = (mission.config as TabernaMissionConfig).countries!;

    for (let i = 0; i < countries.length; i += 1) {
      const target = countries[i];
      const beer = allBeers.find(
        (b) =>
          b.country
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim() === target.key
      )!;
      const r = await request(app)
        .post(`/api/tabernas/${tid}/scan`)
        .set('Authorization', `Bearer ${u.token}`)
        .send({ code: beer.barcode });
      expect(r.body.status).toBe('valid');
      if (i === countries.length - 1) {
        expect(r.body.mission.status).toBe('completed');
        expect(r.body.pointsAwarded).toBe(350);
      }
    }
  });

  it('completa Tridente de la Peña individual (50% y 100% con recompensas individuales)', async () => {
    const db = getDb();
    const u1 = users[7];
    const u2 = users[8];
    const cRes = await request(app)
      .post('/api/tabernas')
      .set('Authorization', `Bearer ${u1.token}`)
      .send({ name: 'Tridente Guild', description: '', visibility: 'public', minBeers: 0 });
    const tid = cRes.body.taberna.id as string;
    await request(app).post(`/api/tabernas/${tid}/join`).set('Authorization', `Bearer ${u2.token}`);

    await db.delete(schema.tabernaMissions).where(eq(schema.tabernaMissions.tabernaId, tid));
    const mission = await ensureCurrentMission(db, tid, { forceGameType: 'tridente' });
    const challenges = (mission.config as TabernaMissionConfig).challenges!;

    const findBeerForChallenge = (
      ch: NonNullable<TabernaMissionConfig['challenges']>[number],
      usedIds: Set<number>
    ) => {
      return allBeers.find((b) => {
        if (usedIds.has(b.id)) return false;
        if (ch.ruleType === 'country_not_spain') {
          return (
            b.country
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .trim() !== 'espana'
          );
        }
        if (ch.ruleType === 'abv_gte') return Number(b.abv) >= Number(ch.ruleValue);
        if (ch.ruleType === 'format') return b.format === ch.ruleValue;
        if (ch.ruleType === 'style') {
          if (ch.ruleValue === '0,0%') return Number(b.abv) === 0 || b.style === '0,0%';
          if (ch.ruleValue === 'Negra') return /negra|stout|porter/i.test(b.style);
          if (ch.ruleValue === 'Trigo') return /trigo|weizen|wheat/i.test(b.style);
          return b.style.toLowerCase() === String(ch.ruleValue).toLowerCase();
        }
        return false;
      })!;
    };

    // u1 completa sus 3 retos -> mitad de 2 miembros -> +150 Ch.
    const usedU1 = new Set<number>();
    for (let i = 0; i < challenges.length; i += 1) {
      const b = findBeerForChallenge(challenges[i], usedU1);
      usedU1.add(b.id);
      const r = await request(app)
        .post(`/api/tabernas/${tid}/scan`)
        .set('Authorization', `Bearer ${u1.token}`)
        .send({ beerId: b.id });
      expect(r.body.status).toBe('valid');
      if (i === challenges.length - 1) {
        expect(r.body.chapasEarned).toBe(150);
      }
    }

    // u2 completa sus 3 retos -> cobra +150 (hito mitad al completarlo) y +400 (100%) + 350 pts + logro #107
    const usedU2 = new Set<number>();
    for (let i = 0; i < challenges.length; i += 1) {
      const b = findBeerForChallenge(challenges[i], usedU2);
      usedU2.add(b.id);
      const r = await request(app)
        .post(`/api/tabernas/${tid}/scan`)
        .set('Authorization', `Bearer ${u2.token}`)
        .send({ beerId: b.id });
      expect(r.body.status).toBe('valid');
      if (i === challenges.length - 1) {
        expect(r.body.pointsAwarded).toBe(350);
        expect(r.body.mission.status).toBe('completed');
        expect(r.body.newlyUnlocked.some((a: { id: number }) => a.id === 107)).toBe(true);
      }
    }
  });

  it('completa Cata Temática (meta conjunta +400 Ch., Top 1 +200 Ch.) y funciona el hook desde /beers/register', async () => {
    const db = getDb();
    const u1 = users[3];
    const u2 = users[4];
    const cRes = await request(app)
      .post('/api/tabernas')
      .set('Authorization', `Bearer ${u1.token}`)
      .send({ name: 'Catadores Top', description: '', visibility: 'public', minBeers: 0 });
    const tid = cRes.body.taberna.id as string;
    await request(app).post(`/api/tabernas/${tid}/join`).set('Authorization', `Bearer ${u2.token}`);

    await db.delete(schema.tabernaMissions).where(eq(schema.tabernaMissions.tabernaId, tid));
    const mission = await ensureCurrentMission(db, tid, { forceGameType: 'cata' });
    const cfg = mission.config as TabernaMissionConfig;
    const targetStyle = cfg.style!;
    const targetTotal = cfg.targetTotal!;

    const matchingBeers = allBeers.filter((b) => {
      if (targetStyle === '0,0%') return Number(b.abv) === 0 || b.style === '0,0%';
      if (targetStyle === 'Negra') return /negra|stout|porter/i.test(b.style);
      if (targetStyle === 'Trigo') return /trigo|weizen|wheat/i.test(b.style);
      return b.style.toLowerCase() === targetStyle.toLowerCase();
    });

    // Asegurar que la última cerveza se registre vía POST /api/beers/register para verificar el hook
    const hookBeer = matchingBeers[targetTotal - 1];
    await db
      .delete(schema.userBeers)
      .where(and(eq(schema.userBeers.userId, u1.id), eq(schema.userBeers.beerId, hookBeer.id)));

    // u2 aporta 1, u1 aporta targetTotal - 2 vía scan y la última vía /beers/register
    await request(app)
      .post(`/api/tabernas/${tid}/scan`)
      .set('Authorization', `Bearer ${u2.token}`)
      .send({ beerId: matchingBeers[0].id });

    for (let i = 0; i < targetTotal - 2; i += 1) {
      const r = await request(app)
        .post(`/api/tabernas/${tid}/scan`)
        .set('Authorization', `Bearer ${u1.token}`)
        .send({ beerId: matchingBeers[i].id });
      expect(r.body.status).toBe('valid');
    }

    const hookRes = await request(app)
      .post('/api/beers/register')
      .set('Authorization', `Bearer ${u1.token}`)
      .send({ beerId: hookBeer.id, rating: 5, photoBase64: TINY_JPEG_BASE64 });
    expect(hookRes.status).toBe(201);
    const updateEntry = hookRes.body.tabernaUpdates.find(
      (u: { tabernaId: string }) => u.tabernaId === tid
    );
    expect(updateEntry).toBeTruthy();
    // u1 es Top 1 (+200 extra) + meta (+400) = 600 (+ bonus nivel si sube)
    expect(updateEntry.chapasEarned).toBeGreaterThanOrEqual(600);
    expect(updateEntry.pointsAwarded).toBe(350);
  });

  it('evalúa niveles 5/10 (#108/#109), 3 meses distintos (#106), rollover mensual sin repetir juego y Top 3 (#110)', async () => {
    const db = getDb();
    const u = users[5];
    const cRes = await request(app)
      .post('/api/tabernas')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ name: 'Leyendas del Barril', description: '', visibility: 'public', minBeers: 0 });
    const tid = cRes.body.taberna.id as string;

    const currentMonth = getMadridMonthKey();
    const prevMonth = getPreviousMonthKey(currentMonth);
    const prev2Month = getPreviousMonthKey(prevMonth);
    const prev3Month = getPreviousMonthKey(prev2Month);

    // Simular 3 meses pasados completados (1 de ellos en prevMonth con 900 pts -> Top 3 mensual)
    await db.delete(schema.tabernaMissions).where(eq(schema.tabernaMissions.tabernaId, tid));
    await db.insert(schema.tabernaMissions).values([
      {
        tabernaId: tid,
        month: prev3Month,
        gameType: 'escalera',
        config: {},
        progress: {},
        status: 'completed',
        pointsAwarded: 350,
      },
      {
        tabernaId: tid,
        month: prev2Month,
        gameType: 'ruta',
        config: {},
        progress: {},
        status: 'completed',
        pointsAwarded: 350,
      },
      {
        tabernaId: tid,
        month: prevMonth,
        gameType: 'cata',
        config: {},
        progress: {},
        status: 'active',
        pointsAwarded: 900,
      },
    ]);

    // Subir Taberna a nivel 10 (points = 4500)
    await db
      .update(schema.tabernas)
      .set({ level: 10, points: 4500 })
      .where(eq(schema.tabernas.id, tid));

    // Al asegurar misión del mes actual, debe cerrar prevMonth, expirar su misión activa, no repetir 'cata', y otorgar #110
    await closePreviousMonthIfNeeded(db, currentMonth);
    const newMission = await ensureCurrentMission(db, tid, { month: currentMonth });
    expect(newMission.gameType).not.toBe('cata');

    const [prevRow] = await db
      .select()
      .from(schema.tabernaMissions)
      .where(
        and(
          eq(schema.tabernaMissions.tabernaId, tid),
          eq(schema.tabernaMissions.month, prevMonth)
        )
      );
    expect(prevRow.status).toBe('expired');

    // Marcar la misión actual como completada para completar 3 meses distintos (prev3, prev2, current)
    await db
      .update(schema.tabernaMissions)
      .set({ status: 'completed', pointsAwarded: 500 })
      .where(eq(schema.tabernaMissions.id, newMission.id));

    await evaluateTabernaAchievements(db, u.id);

    const achRes = await request(app)
      .get('/api/achievements')
      .set('Authorization', `Bearer ${u.token}`);
    const unlockedIds = new Set(
      achRes.body.achievements
        .filter((a: { unlocked: boolean }) => a.unlocked)
        .map((a: { id: number }) => a.id)
    );
    expect(unlockedIds.has(106)).toBe(true); // 3 meses distintos completados
    expect(unlockedIds.has(108)).toBe(true); // Nivel 5
    expect(unlockedIds.has(109)).toBe(true); // Nivel 10
    expect(unlockedIds.has(110)).toBe(true); // Top 3 mensual

    // Verificar endpoints de ranking Global y Mensual
    const globalRank = await request(app)
      .get('/api/tabernas/ranking?scope=global')
      .set('Authorization', `Bearer ${u.token}`);
    expect(globalRank.status).toBe(200);
    expect(globalRank.body.ranking[0].id).toBe(tid);

    const monthlyRank = await request(app)
      .get('/api/tabernas/ranking?scope=monthly')
      .set('Authorization', `Bearer ${u.token}`);
    expect(monthlyRank.status).toBe(200);
    expect(monthlyRank.body.ranking.length).toBeGreaterThan(0);
  });
});

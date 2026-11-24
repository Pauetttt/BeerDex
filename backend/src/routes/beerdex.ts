import { and, asc, desc, eq, gte, inArray, ne, sql } from 'drizzle-orm';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { AppDatabase, getDb, schema } from '../db';
import { AuthenticatedRequest, requireAuth } from '../middleware/authMiddleware';
import {
  evaluateAchievements,
  getAcceptedFriendIds,
} from '../services/achievementEngine';
import {
  buildAntiCheatMessage,
  signScanVerificationToken,
  verifyBeerFrameWithGemini,
  verifyScanVerificationToken,
} from '../services/antiCheatService';
import {
  EXTRA_BARCODE_TO_BEER_NAME,
  isValidEan13,
} from '../services/barcodeCatalog';
import {
  buildBarcodeCandidates,
  getScopedBrandBeers,
  resolveBeerByBarcode,
} from '../services/barcodeService';
import { getCachedBeers, getCachedBrands } from '../services/catalogCache';
import {
  calculateBeerRegistrationChapas,
  getActiveUserRelics,
} from '../services/relicService';
import { uploadBeerPhoto } from '../services/storageService';
import { onBeerRegisteredForTabernas } from '../services/tabernaService';
import { asyncHandler, HttpError } from '../utils/httpError';

const router = Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

const registerBeerSchema = z.object({
  beerId: z.coerce.number().int().positive('ID de cerveza inválido.'),
  rating: z.coerce
    .number()
    .int()
    .min(1, 'La valoración mínima es 1 estrella.')
    .max(5, 'La valoración máxima es 5 estrellas.'),
  photoBase64: z.string().optional(),
  scannedViaPack: z
    .preprocess(
      (v) => v === true || v === 'true' || v === '1' || v === 1,
      z.boolean()
    )
    .optional(),
  scanVerificationToken: z.string().optional(),
});

const verifyScanSchema = z.object({
  code: z.string().trim().min(8, 'Código de barras inválido.').max(20, 'Código de barras inválido.'),
  frameBase64: z
    .string()
    .min(32, 'Falta la captura automática del escáner.')
    .max(2_500_000, 'La captura enviada es demasiado grande.'),
});

router.get(
  '/beerdex',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const userId = req.userId!;

    const [allBrands, allBeers, userBeers] = await Promise.all([
      getCachedBrands(db),
      getCachedBeers(db),
      db
        .select()
        .from(schema.userBeers)
        .where(eq(schema.userBeers.userId, userId)),
    ]);

    const userBeerMap = new Map(userBeers.map((ub) => [ub.beerId, ub]));
    const beersByBrand = new Map<number, typeof allBeers>();
    for (const beer of allBeers) {
      let arr = beersByBrand.get(beer.brandId);
      if (!arr) {
        arr = [];
        beersByBrand.set(beer.brandId, arr);
      }
      arr.push(beer);
    }

    const brandsPayload = allBrands.map((brand) => {
      const brandBeers = beersByBrand.get(brand.id) ?? [];
      let registeredInBrand = 0;

      const beersPayload = brandBeers.map((beer) => {
        const ub = userBeerMap.get(beer.id);
        if (ub) {
          registeredInBrand += 1;
          return {
            id: beer.id,
            brandId: beer.brandId,
            name: beer.name,
            format: beer.format,
            unlocked: true,
            shortHistory: beer.shortHistory,
            style: beer.style,
            abv: Number(beer.abv),
            country: beer.country,
            userBeer: {
              id: ub.id,
              photoUrl: ub.photoUrl,
              rating: ub.rating,
              registeredAt: new Date(ub.registeredAt).toISOString(),
            },
          };
        }

        return {
          id: beer.id,
          brandId: beer.brandId,
          name: beer.name,
          format: beer.format,
          style: beer.style,
          unlocked: false,
        };
      });

      return {
        id: brand.id,
        name: brand.name,
        logoUrl: brand.logoUrl,
        history: brand.history,
        registeredCount: registeredInBrand,
        totalCount: brandBeers.length,
        beers: beersPayload,
      };
    });

    res.json({
      global: {
        registeredCount: userBeers.length,
        totalCount: allBeers.length,
      },
      brands: brandsPayload,
    });
  })
);

async function resolveBarcodeLookupForUser(
  db: AppDatabase,
  userId: string,
  rawCode: string
) {
  const code = rawCode.trim();
  if (!/^\d{8}$|^\d{12,14}$/.test(code)) {
    throw new HttpError(
      400,
      'Código de barras inválido. Debe ser un código EAN-13, EAN-8, UPC-A, UPC-E o GTIN-14 válido.'
    );
  }

  const resolved = await resolveBeerByBarcode(db, code);

  if (!resolved) {
    throw new HttpError(
      404,
      'Cerveza no encontrada en el catálogo oficial de BeerDex (se admiten envases individuales y packs/cajas de nuestras 41 marcas).'
    );
  }

  const [allBrandBeers, userBeers] = await Promise.all([
    getScopedBrandBeers(db, resolved),
    db
      .select({ beerId: schema.userBeers.beerId })
      .from(schema.userBeers)
      .where(eq(schema.userBeers.userId, userId)),
  ]);

  const registeredIds = new Set(userBeers.map((u) => u.beerId));
  let beerRow = resolved.beer;

  if (registeredIds.has(beerRow.id)) {
    if (resolved.needsVarietyConfirm) {
      const firstUnregistered = allBrandBeers.find((b) => !registeredIds.has(b.id));
      if (firstUnregistered) {
        beerRow = firstUnregistered;
      } else {
        throw new HttpError(409, 'Ya has registrado todas las cervezas de esta marca en tu BeerDex.');
      }
    } else {
      throw new HttpError(409, 'Ya has registrado esta cerveza en tu BeerDex.');
    }
  }

  const allowedBrandIds = Array.from(new Set(allBrandBeers.map((b) => b.brandId)));

  return {
    allowedBrandIds,
    payload: {
      valid: true,
      needsVarietyConfirm: resolved.needsVarietyConfirm,
      isPack: Boolean(resolved.isPack),
      beer: {
        ...beerRow,
        abv: Number(beerRow.abv),
      },
      brandBeers: allBrandBeers.map((b) => ({
        ...b,
        abv: Number(b.abv),
        alreadyRegistered: registeredIds.has(b.id),
      })),
    },
  };
}

router.get(
  '/beers/barcode/:code',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const { payload } = await resolveBarcodeLookupForUser(
      db,
      req.userId!,
      String(req.params.code || '')
    );
    res.json(payload);
  })
);

router.post(
  '/beers/verify-scan',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = verifyScanSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message || 'Datos de escaneo inválidos.');
    }

    const db = getDb();
    const userId = req.userId!;
    const cleanCode = parsed.data.code.trim();

    // 1) Validar primero formato, catálogo y duplicados antes de consumir cuota de Gemini
    const { payload, allowedBrandIds } = await resolveBarcodeLookupForUser(
      db,
      userId,
      cleanCode
    );

    // 2) Validación visual antitrampas con Google AI Studio (Gemini Flash)
    const antiCheat = await verifyBeerFrameWithGemini({
      base64: parsed.data.frameBase64,
    });

    if (!antiCheat.allowed) {
      throw new HttpError(422, buildAntiCheatMessage(antiCheat), {
        antiCheatBlocked: true,
        es_pantalla: true,
        tipo_detectado: antiCheat.tipo_detectado,
        motivo: antiCheat.motivo,
      });
    }

    const scanVerificationToken = !antiCheat.skipped
      ? signScanVerificationToken({
          userId,
          allowedBrandIds,
          barcode: cleanCode,
        })
      : undefined;

    res.json({
      ...payload,
      scanVerificationToken,
      antiCheat: {
        verified: !antiCheat.skipped,
        skipped: Boolean(antiCheat.skipped),
        es_pantalla: false,
        tipo_detectado: antiCheat.tipo_detectado,
        motivo: antiCheat.motivo,
      },
    });
  })
);

router.post(
  '/beers/register',
  upload.single('photo'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = registerBeerSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message || 'Datos inválidos.');
    }

    const { beerId, rating, photoBase64, scannedViaPack, scanVerificationToken } = parsed.data;
    const db = getDb();
    const userId = req.userId!;

    const allBeers = await getCachedBeers(db);
    const beer = allBeers.find((b) => b.id === beerId);

    if (!beer) {
      throw new HttpError(404, 'La cerveza indicada no existe en el catálogo.');
    }

    const [alreadyRegistered] = await db
      .select({ id: schema.userBeers.id })
      .from(schema.userBeers)
      .where(
        and(eq(schema.userBeers.userId, userId), eq(schema.userBeers.beerId, beerId))
      );

    if (alreadyRegistered) {
      throw new HttpError(409, 'Ya has registrado esta cerveza en tu BeerDex.');
    }

    // Si no viene con token de escaneo en vivo verificado (entrada manual o llamada directa), validar la foto subida con Gemini Flash
    const hasValidScanToken = verifyScanVerificationToken(scanVerificationToken, {
      userId,
      brandId: beer.brandId,
    });

    if (!hasValidScanToken && (req.file?.buffer || photoBase64)) {
      const antiCheat = await verifyBeerFrameWithGemini({
        buffer: req.file?.buffer,
        mimetype: req.file?.mimetype,
        base64: photoBase64,
      });

      if (!antiCheat.allowed) {
        throw new HttpError(422, buildAntiCheatMessage(antiCheat), {
          antiCheatBlocked: true,
          es_pantalla: true,
          tipo_detectado: antiCheat.tipo_detectado,
          motivo: antiCheat.motivo,
        });
      }
    }

    const photoUrl = await uploadBeerPhoto({
      buffer: req.file?.buffer,
      mimetype: req.file?.mimetype,
      base64: photoBase64,
    });

    const [created] = await db
      .insert(schema.userBeers)
      .values({
        userId,
        beerId,
        photoUrl,
        rating,
      })
      .returning();

    // Comprobar si completó el 100 % de la marca para bonus idempotente de +50 Chapas
    const brandTotalCount = allBeers.reduce(
      (sum, b) => sum + (b.brandId === beer.brandId ? 1 : 0),
      0
    );
    const userBrandRows = await db
      .select({ id: schema.userBeers.id })
      .from(schema.userBeers)
      .innerJoin(schema.beers, eq(schema.userBeers.beerId, schema.beers.id))
      .where(
        and(
          eq(schema.userBeers.userId, userId),
          eq(schema.beers.brandId, beer.brandId)
        )
      );

    const brandCompletedNow =
      brandTotalCount > 0 && userBrandRows.length >= brandTotalCount;

    let completedBrandBonus = 0;
    if (brandCompletedNow) {
      const insertedBrandReward = await db
        .insert(schema.userCompletedBrands)
        .values({ userId, brandId: beer.brandId })
        .onConflictDoNothing()
        .returning({ brandId: schema.userCompletedBrands.brandId });
      if (insertedBrandReward.length > 0) {
        completedBrandBonus = 50;
      }
    }

    const startOfTodayUtc = new Date();
    startOfTodayUtc.setUTCHours(0, 0, 0, 0);

    const baseChapas = 10;
    const [priorTodayRows, activeRelics] = await Promise.all([
      db
        .select({ id: schema.userBeers.id })
        .from(schema.userBeers)
        .where(
          and(
            eq(schema.userBeers.userId, userId),
            gte(schema.userBeers.registeredAt, startOfTodayUtc),
            ne(schema.userBeers.id, created.id)
          )
        )
        .limit(1),
      getActiveUserRelics(db, userId),
    ]);

    const isFirstBeerToday = priorTodayRows.length === 0;
    const relicCalc = calculateBeerRegistrationChapas({
      baseChapas,
      completedBrandBase: completedBrandBonus,
      beer,
      rating,
      scannedViaPack: Boolean(scannedViaPack),
      isFirstBeerToday,
      activeRelics,
    });

    const directChapas = relicCalc.totalDirectChapas;
    await db
      .update(schema.users)
      .set({
        chapas: sql`${schema.users.chapas} + ${directChapas}`,
        ...(scannedViaPack ? { hasRegisteredPack: true } : {}),
      })
      .where(eq(schema.users.id, userId));

    const newlyUnlocked = await evaluateAchievements(db, userId, { activeRelics });
    const tabernaHook = await onBeerRegisteredForTabernas(db, userId, beer.id);

    const unlockedMap = new Map(newlyUnlocked.map((a) => [a.id, a]));
    for (const a of tabernaHook.newlyUnlocked) {
      if (!unlockedMap.has(a.id)) {
        unlockedMap.set(a.id, a);
      }
    }
    const mergedUnlocked = Array.from(unlockedMap.values());

    const achievementChapas = newlyUnlocked.reduce(
      (sum, item) => sum + (item.rewardChapas || 0),
      0
    );
    const tabernaChapas = tabernaHook.totalChapasEarned;

    const [updatedUser] = await db
      .select({ chapas: schema.users.chapas })
      .from(schema.users)
      .where(eq(schema.users.id, userId));

    // Solo reevaluar amigos (Rivalidad Sana) si el usuario acaba de completar el 100 % de esta marca
    if (brandCompletedNow) {
      try {
        const friendIds = await getAcceptedFriendIds(db, userId);
        if (friendIds.length > 0) {
          await Promise.all(friendIds.map((fid) => evaluateAchievements(db, fid)));
        }
      } catch (err) {
        console.error('[BeerDex] Error reevaluando logros de amigos:', err);
      }
    }

    res.status(201).json({
      userBeer: {
        id: created.id,
        beerId: created.beerId,
        photoUrl: created.photoUrl,
        rating: created.rating,
        registeredAt: new Date(created.registeredAt).toISOString(),
      },
      newlyUnlocked: mergedUnlocked,
      chapasEarned: directChapas + achievementChapas + tabernaChapas,
      baseChapas,
      completedBrandBonus,
      relicBonusChapas: relicCalc.relicBonusChapas,
      relicBonuses: relicCalc.appliedBonuses,
      achievementChapas,
      tabernaChapas,
      tabernaUpdates: tabernaHook.updates,
      totalChapas: updatedUser?.chapas ?? directChapas + achievementChapas + tabernaChapas,
    });
  })
);

router.post(
  '/beers/:id/flip',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const beerId = Number(req.params.id);
    if (!Number.isInteger(beerId) || beerId <= 0) {
      throw new HttpError(400, 'ID de cerveza inválido.');
    }

    const db = getDb();
    const userId = req.userId!;

    const [unlockedBeer] = await db
      .select({ id: schema.userBeers.id })
      .from(schema.userBeers)
      .where(
        and(eq(schema.userBeers.userId, userId), eq(schema.userBeers.beerId, beerId))
      );

    if (!unlockedBeer) {
      throw new HttpError(
        403,
        'Solo puedes hacer flip en cervezas que ya hayas desbloqueado.'
      );
    }

    await db
      .insert(schema.userBeerFlips)
      .values({ userId, beerId })
      .onConflictDoNothing();

    const flips = await db
      .select({ beerId: schema.userBeerFlips.beerId })
      .from(schema.userBeerFlips)
      .where(eq(schema.userBeerFlips.userId, userId));

    await db
      .update(schema.users)
      .set({ flipsReadCount: flips.length })
      .where(eq(schema.users.id, userId));

    const newlyUnlocked = await evaluateAchievements(db, userId);

    res.json({
      flipsReadCount: flips.length,
      newlyUnlocked,
    });
  })
);

const createSuggestionSchema = z.object({
  barcode: z
    .string()
    .trim()
    .regex(
      /^\d{8}$|^\d{12,14}$/,
      'El código de barras debe ser EAN-8, EAN-13, UPC-A, UPC-E o GTIN-14.'
    ),
  brandName: z
    .string()
    .trim()
    .min(2, 'Indica el nombre de la marca.')
    .max(120),
  beerName: z
    .string()
    .trim()
    .min(2, 'Indica el nombre de la cerveza.')
    .max(150),
  format: z.enum(['lata', 'botellin', 'litrona']),
  notes: z.string().trim().max(400).optional(),
});

router.post(
  '/beers/suggestions',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = createSuggestionSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message || 'Datos inválidos.');
    }

    const db = getDb();
    const userId = req.userId!;
    const { barcode: rawBarcode, brandName, beerName, format, notes } = parsed.data;

    const candidates = buildBarcodeCandidates(rawBarcode);
    const dbCandidates = candidates.filter((c) => c.length <= 13);

    const [existingBeer] =
      dbCandidates.length > 0
        ? await db
            .select({ id: schema.beers.id })
            .from(schema.beers)
            .where(inArray(schema.beers.barcode, dbCandidates))
        : [undefined];

    if (existingBeer || candidates.some((cand) => Boolean(EXTRA_BARCODE_TO_BEER_NAME[cand]))) {
      throw new HttpError(
        409,
        'Este código de barras ya existe en el catálogo oficial de BeerDex.'
      );
    }

    let storageBarcode = rawBarcode;
    if (rawBarcode.length === 12 && isValidEan13(`0${rawBarcode}`)) {
      storageBarcode = `0${rawBarcode}`;
    } else if (rawBarcode.length === 14) {
      storageBarcode = rawBarcode.startsWith('0')
        ? rawBarcode.slice(1)
        : rawBarcode.slice(-13);
    }

    const [created] = await db
      .insert(schema.beerSuggestions)
      .values({
        userId,
        barcode: storageBarcode,
        brandName,
        beerName,
        format,
        notes: notes || null,
      })
      .returning();

    await db
      .update(schema.users)
      .set({ hasSubmittedSuggestion: true })
      .where(eq(schema.users.id, userId));

    const newlyUnlocked = await evaluateAchievements(db, userId);

    res.status(201).json({
      suggestion: {
        ...created,
        createdAt: new Date(created.createdAt).toISOString(),
      },
      newlyUnlocked,
    });
  })
);

router.get(
  '/beers/suggestions/mine',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const rows = await db
      .select()
      .from(schema.beerSuggestions)
      .where(eq(schema.beerSuggestions.userId, req.userId!))
      .orderBy(desc(schema.beerSuggestions.createdAt))
      .limit(50);

    res.json({
      suggestions: rows.map((row) => ({
        ...row,
        createdAt: new Date(row.createdAt).toISOString(),
      })),
    });
  })
);

export default router;

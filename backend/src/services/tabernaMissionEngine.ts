import { and, asc, desc, eq, inArray, lt, sql } from 'drizzle-orm';
import { AppDatabase, schema } from '../db';
import { HttpError } from '../utils/httpError';
import {
  applyAchievementProgressUpdates,
  NewlyUnlockedAchievement,
} from './achievementEngine';
import { verifyBeerFrameWithGemini } from './antiCheatService';
import {
  getScopedBrandBeers,
  resolveBeerByBarcode,
  ResolvedBeerRow,
} from './barcodeService';
import { getCachedBeers, getCachedBrands } from './catalogCache';
import {
  BingoCellConfig,
  BINGO_LINES,
  CATA_STYLES,
  computeLevelFromPoints,
  ESCALERA_STEPS,
  GAME_TYPES,
  getAbvStepIndex,
  getMadridMonthKey,
  getNextLevelThreshold,
  hydrateMissionDto,
  matchesBeerStyle,
  matchesTridenteChallenge,
  normalizeCountryKey,
  pickRandom,
  shuffleArray,
  TabernaGameType,
  TabernaMissionConfig,
  TabernaMissionProgress,
  TabernaScanResultDto,
  TridenteChallengeConfig,
} from './tabernaHelpers';

export async function evaluateTabernaAchievements(
  db: AppDatabase,
  userId: string,
  explicitFlags: {
    bingoLine?: boolean;
    bingoFull?: boolean;
    flawlessMission?: boolean;
    top3Monthly?: boolean;
  } = {}
): Promise<NewlyUnlockedAchievement[]> {
  const memberships = await db
    .select({
      tabernaId: schema.tabernaMembers.tabernaId,
      role: schema.tabernaMembers.role,
    })
    .from(schema.tabernaMembers)
    .where(eq(schema.tabernaMembers.userId, userId));

  const tabernaIds = memberships.map((m) => m.tabernaId);

  let maxFoundedMembers = 0;
  let maxTabernaMembers = 0;
  let maxTabernaLevel = 0;
  let maxCompletedMissions = 0;
  let hasBingoLine = Boolean(explicitFlags.bingoLine);
  let hasBingoFull = Boolean(explicitFlags.bingoFull);
  let hasFlawless = Boolean(explicitFlags.flawlessMission);

  if (tabernaIds.length > 0) {
    const [tabernaRows, allMemberRows, completedMissions, claimedMilestones] =
      await Promise.all([
        db
          .select()
          .from(schema.tabernas)
          .where(inArray(schema.tabernas.id, tabernaIds)),
        db
          .select({ tabernaId: schema.tabernaMembers.tabernaId })
          .from(schema.tabernaMembers)
          .where(inArray(schema.tabernaMembers.tabernaId, tabernaIds)),
        db
          .select({
            tabernaId: schema.tabernaMissions.tabernaId,
            month: schema.tabernaMissions.month,
            gameType: schema.tabernaMissions.gameType,
            progress: schema.tabernaMissions.progress,
          })
          .from(schema.tabernaMissions)
          .where(
            and(
              inArray(schema.tabernaMissions.tabernaId, tabernaIds),
              eq(schema.tabernaMissions.status, 'completed')
            )
          ),
        db
          .select({ milestoneKey: schema.tabernaRewardsClaimed.milestoneKey })
          .from(schema.tabernaRewardsClaimed)
          .where(eq(schema.tabernaRewardsClaimed.userId, userId)),
      ]);

    const memberCountByTaberna = new Map<string, number>();
    for (const row of allMemberRows) {
      memberCountByTaberna.set(
        row.tabernaId,
        (memberCountByTaberna.get(row.tabernaId) || 0) + 1
      );
    }

    for (const t of tabernaRows) {
      const mCount = memberCountByTaberna.get(t.id) || 0;
      if (mCount > maxTabernaMembers) maxTabernaMembers = mCount;
      if (t.level > maxTabernaLevel) maxTabernaLevel = t.level;
      const isFounder = t.founderId === userId || (t.founderId === null && t.leaderId === userId);
      if (isFounder && mCount > maxFoundedMembers) {
        maxFoundedMembers = mCount;
      }
    }

    const completedMonthsByTaberna = new Map<string, Set<string>>();
    for (const cm of completedMissions) {
      let set = completedMonthsByTaberna.get(cm.tabernaId);
      if (!set) {
        set = new Set<string>();
        completedMonthsByTaberna.set(cm.tabernaId, set);
      }
      set.add(cm.month);

      if (cm.gameType === 'bingo') {
        hasBingoFull = true;
      }
      const prog = (cm.progress || {}) as TabernaMissionProgress;
      if (prog.flawless) {
        hasFlawless = true;
      }
    }
    for (const set of completedMonthsByTaberna.values()) {
      if (set.size > maxCompletedMissions) {
        maxCompletedMissions = set.size;
      }
    }

    for (const claim of claimedMilestones) {
      if (claim.milestoneKey.startsWith('bingo_line_')) {
        hasBingoLine = true;
      }
      if (claim.milestoneKey === 'bingo_full') {
        hasBingoFull = true;
      }
    }
  }

  const rawProgressById: Record<number, number> = {
    101: tabernaIds.length >= 1 ? 1 : 0,
    102: maxFoundedMembers,
    103: maxTabernaMembers,
    104: hasBingoLine ? 1 : 0,
    105: hasBingoFull ? 1 : 0,
    106: maxCompletedMissions,
    107: hasFlawless ? 1 : 0,
    108: maxTabernaLevel,
    109: maxTabernaLevel,
    110: explicitFlags.top3Monthly ? 1 : 0,
  };

  return applyAchievementProgressUpdates(
    db,
    userId,
    [101, 102, 103, 104, 105, 106, 107, 108, 109, 110],
    rawProgressById
  );
}

/**
 * Otorga Chapas por hito de forma idempotente para una lista de usuarios.
 */
async function claimMissionMilestoneChapas(
  db: AppDatabase,
  missionId: string,
  milestoneKey: string,
  recipients: Array<{ userId: string; chapas: number }>
): Promise<Map<string, number>> {
  const awardedByUser = new Map<string, number>();
  for (const r of recipients) {
    if (r.chapas <= 0) continue;
    const inserted = await db
      .insert(schema.tabernaRewardsClaimed)
      .values({
        missionId,
        userId: r.userId,
        milestoneKey,
        chapas: r.chapas,
      })
      .onConflictDoNothing()
      .returning({ userId: schema.tabernaRewardsClaimed.userId });

    if (inserted.length > 0) {
      await db
        .update(schema.users)
        .set({ chapas: sql`${schema.users.chapas} + ${r.chapas}` })
        .where(eq(schema.users.id, r.userId));
      awardedByUser.set(r.userId, (awardedByUser.get(r.userId) || 0) + r.chapas);
    }
  }
  return awardedByUser;
}

async function awardTabernaPointsAndLevels(
  db: AppDatabase,
  tabernaId: string,
  missionId: string,
  pointsDelta: number,
  memberIds: string[]
): Promise<{
  oldLevel: number;
  newLevel: number;
  pointsTotal: number;
  levelChapasByUser: Map<string, number>;
}> {
  const [taberna] = await db
    .select()
    .from(schema.tabernas)
    .where(eq(schema.tabernas.id, tabernaId));

  if (!taberna) {
    return {
      oldLevel: 1,
      newLevel: 1,
      pointsTotal: 0,
      levelChapasByUser: new Map(),
    };
  }

  const oldLevel = taberna.level;
  let pointsTotal = taberna.points;
  let newLevel = oldLevel;
  const levelChapasByUser = new Map<string, number>();

  if (pointsDelta > 0) {
    const [updatedTaberna] = await db
      .update(schema.tabernas)
      .set({
        points: sql`${schema.tabernas.points} + ${pointsDelta}`,
      })
      .where(eq(schema.tabernas.id, tabernaId))
      .returning();

    await db
      .update(schema.tabernaMissions)
      .set({
        pointsAwarded: sql`${schema.tabernaMissions.pointsAwarded} + ${pointsDelta}`,
      })
      .where(eq(schema.tabernaMissions.id, missionId));

    pointsTotal = updatedTaberna?.points ?? taberna.points + pointsDelta;
    newLevel = Math.max(oldLevel, computeLevelFromPoints(pointsTotal));

    if (newLevel > oldLevel) {
      await db
        .update(schema.tabernas)
        .set({ level: newLevel })
        .where(eq(schema.tabernas.id, tabernaId));

      for (let lvl = oldLevel + 1; lvl <= newLevel; lvl += 1) {
        const chapasForLevel = lvl * 100;
        for (const uid of memberIds) {
          const inserted = await db
            .insert(schema.tabernaLevelRewards)
            .values({
              tabernaId,
              userId: uid,
              level: lvl,
              chapas: chapasForLevel,
            })
            .onConflictDoNothing()
            .returning({ userId: schema.tabernaLevelRewards.userId });

          if (inserted.length > 0) {
            await db
              .update(schema.users)
              .set({ chapas: sql`${schema.users.chapas} + ${chapasForLevel}` })
              .where(eq(schema.users.id, uid));
            levelChapasByUser.set(
              uid,
              (levelChapasByUser.get(uid) || 0) + chapasForLevel
            );
          }
        }
      }
    }
  }

  return { oldLevel, newLevel, pointsTotal, levelChapasByUser };
}

/**
 * Cierra meses anteriores expirados, liquida Top 1 de Catas inacabadas y otorga Top 3 mensual (#110).
 */
let memoizedClosedCheckMonth: string | null = null;

export async function closePreviousMonthIfNeeded(
  db: AppDatabase,
  currentMonth = getMadridMonthKey()
): Promise<void> {
  if (process.env.NODE_ENV !== 'test' && memoizedClosedCheckMonth === currentMonth) {
    return;
  }
  // 1) Marcar misiones activas de meses pasados como expiradas
  await db
    .update(schema.tabernaMissions)
    .set({ status: 'expired' })
    .where(
      and(
        eq(schema.tabernaMissions.status, 'active'),
        lt(schema.tabernaMissions.month, currentMonth)
      )
    );

  // 2) Cierre idempotente de todos los meses pasados con misiones sin cerrar
  const [pastMissionRows, closedRows] = await Promise.all([
    db
      .select({ month: schema.tabernaMissions.month })
      .from(schema.tabernaMissions)
      .where(lt(schema.tabernaMissions.month, currentMonth)),
    db.select({ month: schema.tabernaMonthClosures.month }).from(schema.tabernaMonthClosures),
  ]);

  const closedSet = new Set(closedRows.map((c) => c.month));
  const monthsToClose = Array.from(
    new Set(pastMissionRows.map((m) => m.month).filter((m) => !closedSet.has(m)))
  ).sort();

  for (const targetMonth of monthsToClose) {
    const insertedClosure = await db
      .insert(schema.tabernaMonthClosures)
      .values({ month: targetMonth })
      .onConflictDoNothing()
      .returning({ month: schema.tabernaMonthClosures.month });

    if (insertedClosure.length === 0) continue;

    const monthMissions = await db
      .select()
      .from(schema.tabernaMissions)
      .where(eq(schema.tabernaMissions.month, targetMonth))
      .orderBy(
        desc(schema.tabernaMissions.pointsAwarded),
        asc(schema.tabernaMissions.createdAt)
      );

    if (monthMissions.length === 0) continue;

    // Liquidar premio Top 1 individual de Catas que expiraron con contribuciones
    for (const m of monthMissions) {
      if (m.gameType !== 'cata') continue;
      const prog = (m.progress || {}) as TabernaMissionProgress;
      const lb = prog.leaderboard || {};
      const entries = Object.entries(lb);
      if (entries.length === 0) continue;
      let maxCount = 0;
      for (const [, v] of entries) {
        if (v.count > maxCount) maxCount = v.count;
      }
      if (maxCount <= 0) continue;
      const topUsers = entries.filter(([, v]) => v.count === maxCount).map(([uid]) => uid);
      await claimMissionMilestoneChapas(
        db,
        m.id,
        'cata_top1',
        topUsers.map((uid) => ({ userId: uid, chapas: 200 }))
      );
    }

    // Top 3 del mes con al menos 1 punto otorgado reciben logro #110
    const top3 = monthMissions.filter((m) => m.pointsAwarded > 0).slice(0, 3);
    if (top3.length === 0) continue;

    const top3TabernaIds = top3.map((m) => m.tabernaId);
    const topMembers = await db
      .select({ userId: schema.tabernaMembers.userId })
      .from(schema.tabernaMembers)
      .where(inArray(schema.tabernaMembers.tabernaId, top3TabernaIds));

    const uniqueMemberIds = Array.from(new Set(topMembers.map((m) => m.userId)));
    await Promise.all(
      uniqueMemberIds.map((uid) =>
        evaluateTabernaAchievements(db, uid, { top3Monthly: true })
      )
    );
  }
  if (process.env.NODE_ENV !== 'test') {
    memoizedClosedCheckMonth = currentMonth;
  }
}

async function generateMissionConfig(
  db: AppDatabase,
  lastGameType: TabernaGameType | null,
  forceGameType?: TabernaGameType
): Promise<{
  gameType: TabernaGameType;
  config: TabernaMissionConfig;
  progress: TabernaMissionProgress;
}> {
  const [cachedBeers, cachedBrands] = await Promise.all([
    getCachedBeers(db),
    getCachedBrands(db),
  ]);
  const brandNameById = new Map(cachedBrands.map((br) => [br.id, br.name]));
  const catalogBeers = cachedBeers.map((b) => ({
    id: b.id,
    name: b.name,
    brandName: brandNameById.get(b.brandId) ?? 'Cerveza',
    style: b.style,
    abv: b.abv,
    format: b.format,
    country: b.country,
  }));

  const distinctCountriesMap = new Map<string, string>();
  for (const b of catalogBeers) {
    const key = normalizeCountryKey(b.country);
    if (key && !distinctCountriesMap.has(key)) {
      distinctCountriesMap.set(key, b.country);
    }
  }

  let selectedType: TabernaGameType;
  if (forceGameType) {
    selectedType = forceGameType;
  } else {
    let candidates = GAME_TYPES.filter((g) => g !== lastGameType);
    if (catalogBeers.length < 9) {
      candidates = candidates.filter((g) => g !== 'bingo');
    }
    if (distinctCountriesMap.size < 2) {
      candidates = candidates.filter((g) => g !== 'ruta');
    }
    if (candidates.length === 0) {
      candidates = ['cata'];
    }
    selectedType = pickRandom(candidates);
  }

  // Fallback si se fuerza o se requiere bingo con catálogo insuficiente
  if (selectedType === 'bingo' && catalogBeers.length < 9) {
    selectedType = lastGameType === 'cata' ? 'escalera' : 'cata';
  }

  if (selectedType === 'bingo') {
    const picked = shuffleArray(catalogBeers).slice(0, 9);
    const cells: BingoCellConfig[] = picked.map((b, index) => ({
      index,
      beerId: b.id,
      beerName: b.name,
      brandName: b.brandName,
      style: b.style,
      abv: Number(b.abv),
      format: b.format,
      country: b.country,
    }));
    return {
      gameType: 'bingo',
      config: { cells },
      progress: { markedCells: {}, completedLines: [], flawless: false },
    };
  }

  if (selectedType === 'escalera') {
    return {
      gameType: 'escalera',
      config: { steps: ESCALERA_STEPS },
      progress: { completedSteps: {}, currentStepIndex: 0, flawless: false },
    };
  }

  if (selectedType === 'ruta') {
    const allCountries = Array.from(distinctCountriesMap.entries()).map(([key, name]) => ({
      key,
      name,
    }));
    const picked = shuffleArray(allCountries).slice(0, Math.min(8, allCountries.length));
    return {
      gameType: 'ruta',
      config: { countries: picked, targetCount: picked.length },
      progress: { completedCountries: {}, flawless: false },
    };
  }

  if (selectedType === 'tridente') {
    const groupA: TridenteChallengeConfig[] = [
      {
        id: 'foreign',
        title: 'Sello Extranjero',
        description: 'Registra 1 cerveza internacional (fuera de España)',
        ruleType: 'country_not_spain',
        ruleValue: 'espana',
      },
      {
        id: 'high_abv',
        title: 'Grado Intenso',
        description: 'Registra 1 cerveza de 6,5° o más',
        ruleType: 'abv_gte',
        ruleValue: 6.5,
      },
    ];
    const groupB: TridenteChallengeConfig[] = [
      {
        id: 'style_ipa',
        title: 'Lúpulo IPA',
        description: 'Registra 1 cerveza estilo IPA',
        ruleType: 'style',
        ruleValue: 'IPA',
      },
      {
        id: 'style_negra',
        title: 'Malta Oscura',
        description: 'Registra 1 cerveza Negra / Stout',
        ruleType: 'style',
        ruleValue: 'Negra',
      },
      {
        id: 'style_tostada',
        title: 'Tostada Clásica',
        description: 'Registra 1 cerveza Tostada',
        ruleType: 'style',
        ruleValue: 'Tostada',
      },
      {
        id: 'style_trigo',
        title: 'Cerveza de Trigo',
        description: 'Registra 1 cerveza de Trigo',
        ruleType: 'style',
        ruleValue: 'Trigo',
      },
    ];
    const groupC: TridenteChallengeConfig[] = [
      {
        id: 'fmt_botellin',
        title: 'Tercios y Botellines',
        description: 'Registra 1 cerveza en formato botellín',
        ruleType: 'format',
        ruleValue: 'botellin',
      },
      {
        id: 'fmt_lata',
        title: 'Aluminio Frío',
        description: 'Registra 1 cerveza en formato lata',
        ruleType: 'format',
        ruleValue: 'lata',
      },
      {
        id: 'fmt_litrona',
        title: 'La Litrona',
        description: 'Registra 1 cerveza en formato litrona',
        ruleType: 'format',
        ruleValue: 'litrona',
      },
      {
        id: 'style_zero',
        title: 'Sin Alcohol',
        description: 'Registra 1 cerveza 0,0%',
        ruleType: 'style',
        ruleValue: '0,0%',
      },
    ];

    const challenges = [pickRandom(groupA), pickRandom(groupB), pickRandom(groupC)];
    return {
      gameType: 'tridente',
      config: { challenges },
      progress: { memberProgress: {}, flawless: false },
    };
  }

  // cata
  const availableStyles = CATA_STYLES.filter((st) =>
    catalogBeers.some((b) => matchesBeerStyle(b, st))
  );
  const chosenStyle = availableStyles.length > 0 ? pickRandom(availableStyles) : 'Lager';
  const matchingCount = catalogBeers.filter((b) => matchesBeerStyle(b, chosenStyle)).length;
  const targetTotal = Math.max(1, Math.min(15, matchingCount));

  return {
    gameType: 'cata',
    config: { style: chosenStyle, targetTotal },
    progress: { totalCount: 0, leaderboard: {}, flawless: false },
  };
}

/**
 * Obtiene o genera la misión del mes actual (Europe/Madrid) sin repetir la del mes anterior.
 */
export async function ensureCurrentMission(
  db: AppDatabase,
  tabernaId: string,
  options: { month?: string; forceGameType?: TabernaGameType } = {}
): Promise<typeof schema.tabernaMissions.$inferSelect> {
  const month = options.month ?? getMadridMonthKey();
  await closePreviousMonthIfNeeded(db, month);

  const [existing] = await db
    .select()
    .from(schema.tabernaMissions)
    .where(
      and(
        eq(schema.tabernaMissions.tabernaId, tabernaId),
        eq(schema.tabernaMissions.month, month)
      )
    );

  if (existing) {
    return existing;
  }

  const [lastMission] = await db
    .select({ gameType: schema.tabernaMissions.gameType })
    .from(schema.tabernaMissions)
    .where(eq(schema.tabernaMissions.tabernaId, tabernaId))
    .orderBy(desc(schema.tabernaMissions.month))
    .limit(1);

  const generated = await generateMissionConfig(
    db,
    lastMission?.gameType ?? null,
    options.forceGameType
  );

  const inserted = await db
    .insert(schema.tabernaMissions)
    .values({
      tabernaId,
      month,
      gameType: generated.gameType,
      config: generated.config as Record<string, unknown>,
      progress: generated.progress as Record<string, unknown>,
      status: 'active',
      pointsAwarded: 0,
    })
    .onConflictDoNothing()
    .returning();

  if (inserted.length > 0) {
    return inserted[0];
  }

  const [raced] = await db
    .select()
    .from(schema.tabernaMissions)
    .where(
      and(
        eq(schema.tabernaMissions.tabernaId, tabernaId),
        eq(schema.tabernaMissions.month, month)
      )
    );
  return raced;
}

/**
 * Aplica una cerveza escaneada o registrada a la misión activa de una Taberna.
 */
export async function contributeBeerToMission(
  db: AppDatabase,
  tabernaId: string,
  userId: string,
  beer: ResolvedBeerRow
): Promise<TabernaScanResultDto> {
  const [taberna] = await db
    .select()
    .from(schema.tabernas)
    .where(eq(schema.tabernas.id, tabernaId));

  if (!taberna) {
    throw new HttpError(404, 'La Taberna no existe.');
  }

  const mission = await ensureCurrentMission(db, tabernaId);
  const memberRows = await db
    .select({
      userId: schema.tabernaMembers.userId,
      username: schema.users.username,
    })
    .from(schema.tabernaMembers)
    .innerJoin(schema.users, eq(schema.tabernaMembers.userId, schema.users.id))
    .where(eq(schema.tabernaMembers.tabernaId, tabernaId));

  const memberIds = memberRows.map((m) => m.userId);
  const actingUsername =
    memberRows.find((m) => m.userId === userId)?.username ?? 'Cervecero';

  const makeResponse = async (params: {
    status: TabernaScanResultDto['status'];
    message: string;
    slotKey?: string | null;
    slotLabel?: string | null;
    milestonesReached?: string[];
    chapasEarned?: number;
    pointsAwarded?: number;
    levelUp?: TabernaScanResultDto['levelUp'];
    newlyUnlocked?: NewlyUnlockedAchievement[];
    updatedMission?: typeof schema.tabernaMissions.$inferSelect;
    updatedTaberna?: { level: number; points: number };
  }): Promise<TabernaScanResultDto> => {
    const mRow = params.updatedMission ?? mission;
    const tLevel = params.updatedTaberna?.level ?? taberna.level;
    const tPoints = params.updatedTaberna?.points ?? taberna.points;
    const hydrated = await hydrateMissionDto(db, mRow, memberRows.length);
    return {
      status: params.status,
      message: params.message,
      taberna: {
        id: taberna.id,
        name: taberna.name,
        level: tLevel,
        points: tPoints,
        nextLevelPoints: getNextLevelThreshold(tLevel),
      },
      beer: {
        id: beer.id,
        brandId: beer.brandId,
        brandName: beer.brandName,
        name: beer.name,
        format: beer.format,
        barcode: beer.barcode,
        style: beer.style,
        abv: Number(beer.abv),
        country: beer.country,
      },
      slotKey: params.slotKey ?? null,
      slotLabel: params.slotLabel ?? null,
      milestonesReached: params.milestonesReached ?? [],
      chapasEarned: params.chapasEarned ?? 0,
      pointsAwarded: params.pointsAwarded ?? 0,
      levelUp: params.levelUp ?? null,
      newlyUnlocked: params.newlyUnlocked ?? [],
      mission: hydrated,
    };
  };

  if (mission.status === 'completed') {
    return makeResponse({
      status: 'mission_completed',
      message: `El minijuego de este mes en ${taberna.name} ya está completado al 100 %.`,
    });
  }

  const config = (mission.config || {}) as TabernaMissionConfig;
  const progress: TabernaMissionProgress = JSON.parse(
    JSON.stringify(mission.progress || {})
  ) as TabernaMissionProgress;
  const nowIso = new Date().toISOString();

  let pointsDelta = 0;
  let missionCompletedNow = false;
  let flawlessNow = false;
  let slotKey: string | null = null;
  let slotLabel: string | null = null;
  const milestonesReached: string[] = [];
  let userChapasEarned = 0;
  const usersToEvaluateAchievements = new Set<string>();
  const bingoLineUsers = new Set<string>();
  let bingoFullFlag = false;

  if (mission.gameType === 'bingo') {
    const cells = config.cells || [];
    const targetCell = cells.find((c) => c.beerId === beer.id);
    if (!targetCell) {
      return makeResponse({
        status: 'invalid',
        message: `${beer.name} no forma parte de las 9 casillas del Bingo de este mes.`,
      });
    }

    const markedCells = progress.markedCells || {};
    const cellKey = String(targetCell.index);
    if (markedCells[cellKey]) {
      return makeResponse({
        status: 'already_contributed',
        message: `Esta cerveza ya ha sido registrada en el Bingo por ${markedCells[cellKey].username}.`,
        slotKey: `cell_${targetCell.index}`,
        slotLabel: targetCell.beerName,
      });
    }

    slotKey = `cell_${targetCell.index}`;
    slotLabel = targetCell.beerName;

    const insertedContrib = await db
      .insert(schema.tabernaContributions)
      .values({
        missionId: mission.id,
        userId,
        beerId: beer.id,
        slotKey,
      })
      .onConflictDoNothing()
      .returning({ id: schema.tabernaContributions.id });

    if (insertedContrib.length === 0) {
      return makeResponse({
        status: 'already_contributed',
        message: 'Esta cerveza ya ha sido registrada en el minijuego de este mes.',
        slotKey,
        slotLabel,
      });
    }

    markedCells[cellKey] = {
      beerId: beer.id,
      userId,
      username: actingUsername,
      markedAt: nowIso,
    };
    progress.markedCells = markedCells;

    const completedLines = new Set(progress.completedLines || []);
    for (const line of BINGO_LINES) {
      if (completedLines.has(line.key)) continue;
      const isLineComplete = line.indices.every((idx) => Boolean(markedCells[String(idx)]));
      if (!isLineComplete) continue;

      const milestoneKey = `bingo_line_${line.key}`;
      const mInserted = await db
        .insert(schema.tabernaMissionMilestones)
        .values({ missionId: mission.id, milestoneKey })
        .onConflictDoNothing()
        .returning({ milestoneKey: schema.tabernaMissionMilestones.milestoneKey });

      completedLines.add(line.key);

      if (mInserted.length > 0) {
        pointsDelta += 150;
        milestonesReached.push(`¡Línea (${line.label})! +100 Chapas · +150 pts`);

        const lineContributors = Array.from(
          new Set(line.indices.map((idx) => markedCells[String(idx)]?.userId).filter(Boolean))
        ) as string[];

        const claimed = await claimMissionMilestoneChapas(
          db,
          mission.id,
          milestoneKey,
          lineContributors.map((uid) => ({ userId: uid, chapas: 100 }))
        );
        userChapasEarned += claimed.get(userId) || 0;
        for (const uid of lineContributors) {
          bingoLineUsers.add(uid);
          usersToEvaluateAchievements.add(uid);
        }
      }
    }
    progress.completedLines = Array.from(completedLines);

    if (Object.keys(markedCells).length >= cells.length && cells.length > 0) {
      const mInserted = await db
        .insert(schema.tabernaMissionMilestones)
        .values({ missionId: mission.id, milestoneKey: 'bingo_full' })
        .onConflictDoNothing()
        .returning({ milestoneKey: schema.tabernaMissionMilestones.milestoneKey });

      if (mInserted.length > 0) {
        pointsDelta += 500;
        milestonesReached.push('¡BINGO COMPLETO! +500 Chapas · +500 pts');
        const claimed = await claimMissionMilestoneChapas(
          db,
          mission.id,
          'bingo_full',
          memberIds.map((uid) => ({ userId: uid, chapas: 500 }))
        );
        userChapasEarned += claimed.get(userId) || 0;
      }

      missionCompletedNow = true;
      bingoFullFlag = true;
      const contribUsers = new Set(Object.values(markedCells).map((c) => c.userId));
      flawlessNow = memberIds.length > 0 && memberIds.every((uid) => contribUsers.has(uid));
      progress.flawless = flawlessNow;
      for (const uid of memberIds) {
        usersToEvaluateAchievements.add(uid);
      }
    }
  } else if (mission.gameType === 'escalera') {
    const steps = config.steps || ESCALERA_STEPS;
    const currentStepIndex = progress.currentStepIndex ?? 0;
    const completedSteps = progress.completedSteps || {};
    const beerAbv = Number(beer.abv);
    const beerStep = getAbvStepIndex(beerAbv);
    const currentStepCfg = steps[currentStepIndex];

    if (beerStep < currentStepIndex) {
      return makeResponse({
        status: 'already_contributed',
        message: `El peldaño ${steps[beerStep]?.label ?? ''} ya está completado. Ahora toca: ${currentStepCfg?.label ?? ''}.`,
      });
    }
    if (beerStep > currentStepIndex) {
      return makeResponse({
        status: 'invalid',
        message: `Esta cerveza tiene ${beerAbv.toFixed(1)}° (${steps[beerStep]?.label}), pero la Escalera va en orden y ahora toca ${currentStepCfg?.label}.`,
      });
    }

    slotKey = `step_${beerStep}`;
    slotLabel = currentStepCfg?.label ?? `Peldaño ${beerStep + 1}`;

    const insertedContrib = await db
      .insert(schema.tabernaContributions)
      .values({
        missionId: mission.id,
        userId,
        beerId: beer.id,
        slotKey,
      })
      .onConflictDoNothing()
      .returning({ id: schema.tabernaContributions.id });

    if (insertedContrib.length === 0) {
      return makeResponse({
        status: 'already_contributed',
        message: 'Esta cerveza ya ha sido registrada en el minijuego de este mes.',
        slotKey,
        slotLabel,
      });
    }

    completedSteps[slotKey] = {
      beerId: beer.id,
      beerName: beer.name,
      abv: beerAbv,
      userId,
      username: actingUsername,
      completedAt: nowIso,
    };
    progress.completedSteps = completedSteps;
    progress.currentStepIndex = currentStepIndex + 1;

    const doneCount = Object.keys(completedSteps).length;
    const halfThreshold = Math.ceil(steps.length / 2);

    if (doneCount >= halfThreshold) {
      const m50 = await db
        .insert(schema.tabernaMissionMilestones)
        .values({ missionId: mission.id, milestoneKey: 'escalera_50' })
        .onConflictDoNothing()
        .returning({ milestoneKey: schema.tabernaMissionMilestones.milestoneKey });
      if (m50.length > 0) {
        milestonesReached.push('¡50 % de la Escalera! +150 Chapas');
        const claimed = await claimMissionMilestoneChapas(
          db,
          mission.id,
          'escalera_50',
          memberIds.map((uid) => ({ userId: uid, chapas: 150 }))
        );
        userChapasEarned += claimed.get(userId) || 0;
      }
    }

    if (doneCount >= steps.length) {
      const m100 = await db
        .insert(schema.tabernaMissionMilestones)
        .values({ missionId: mission.id, milestoneKey: 'escalera_100' })
        .onConflictDoNothing()
        .returning({ milestoneKey: schema.tabernaMissionMilestones.milestoneKey });
      if (m100.length > 0) {
        pointsDelta += 350;
        milestonesReached.push('¡Escalera al 100 %! +400 Chapas · +350 pts');
        const claimed = await claimMissionMilestoneChapas(
          db,
          mission.id,
          'escalera_100',
          memberIds.map((uid) => ({ userId: uid, chapas: 400 }))
        );
        userChapasEarned += claimed.get(userId) || 0;
      }

      missionCompletedNow = true;
      const contribUsers = new Set(Object.values(completedSteps).map((s) => s.userId));
      flawlessNow = memberIds.length > 0 && memberIds.every((uid) => contribUsers.has(uid));
      progress.flawless = flawlessNow;
      for (const uid of memberIds) {
        usersToEvaluateAchievements.add(uid);
      }
    }
  } else if (mission.gameType === 'ruta') {
    const countries = config.countries || [];
    const normCountry = normalizeCountryKey(beer.country);
    const targetCountry = countries.find((c) => c.key === normCountry);

    if (!targetCountry) {
      return makeResponse({
        status: 'invalid',
        message: `${beer.name} es de ${beer.country}, que no está en la Ruta Internacional de este mes.`,
      });
    }

    const completedCountries = progress.completedCountries || {};
    if (completedCountries[normCountry]) {
      return makeResponse({
        status: 'already_contributed',
        message: `${targetCountry.name} ya ha sido completado por ${completedCountries[normCountry].username}.`,
        slotKey: `country_${normCountry}`,
        slotLabel: targetCountry.name,
      });
    }

    slotKey = `country_${normCountry}`;
    slotLabel = targetCountry.name;

    const insertedContrib = await db
      .insert(schema.tabernaContributions)
      .values({
        missionId: mission.id,
        userId,
        beerId: beer.id,
        slotKey,
      })
      .onConflictDoNothing()
      .returning({ id: schema.tabernaContributions.id });

    if (insertedContrib.length === 0) {
      return makeResponse({
        status: 'already_contributed',
        message: 'Esta cerveza ya ha sido registrada en el minijuego de este mes.',
        slotKey,
        slotLabel,
      });
    }

    completedCountries[normCountry] = {
      beerId: beer.id,
      beerName: beer.name,
      userId,
      username: actingUsername,
      completedAt: nowIso,
    };
    progress.completedCountries = completedCountries;

    const doneCount = Object.keys(completedCountries).length;
    const totalCountries = countries.length;
    const halfThreshold = Math.ceil(totalCountries / 2);

    if (doneCount >= halfThreshold) {
      const m50 = await db
        .insert(schema.tabernaMissionMilestones)
        .values({ missionId: mission.id, milestoneKey: 'ruta_50' })
        .onConflictDoNothing()
        .returning({ milestoneKey: schema.tabernaMissionMilestones.milestoneKey });
      if (m50.length > 0) {
        milestonesReached.push('¡50 % de la Ruta! +150 Chapas');
        const claimed = await claimMissionMilestoneChapas(
          db,
          mission.id,
          'ruta_50',
          memberIds.map((uid) => ({ userId: uid, chapas: 150 }))
        );
        userChapasEarned += claimed.get(userId) || 0;
      }
    }

    if (doneCount >= totalCountries && totalCountries > 0) {
      const m100 = await db
        .insert(schema.tabernaMissionMilestones)
        .values({ missionId: mission.id, milestoneKey: 'ruta_100' })
        .onConflictDoNothing()
        .returning({ milestoneKey: schema.tabernaMissionMilestones.milestoneKey });
      if (m100.length > 0) {
        pointsDelta += 350;
        milestonesReached.push('¡Ruta Internacional al 100 %! +400 Chapas · +350 pts');
        const claimed = await claimMissionMilestoneChapas(
          db,
          mission.id,
          'ruta_100',
          memberIds.map((uid) => ({ userId: uid, chapas: 400 }))
        );
        userChapasEarned += claimed.get(userId) || 0;
      }

      missionCompletedNow = true;
      const contribUsers = new Set(Object.values(completedCountries).map((c) => c.userId));
      flawlessNow = memberIds.length > 0 && memberIds.every((uid) => contribUsers.has(uid));
      progress.flawless = flawlessNow;
      for (const uid of memberIds) {
        usersToEvaluateAchievements.add(uid);
      }
    }
  } else if (mission.gameType === 'tridente') {
    const challenges = config.challenges || [];
    const memberProgress = progress.memberProgress || {};
    const userProg = memberProgress[userId] || {
      completedChallengeIds: [],
      beersByChallenge: {},
      completedAt: null,
    };
    const completedSet = new Set(userProg.completedChallengeIds);

    if (completedSet.size >= challenges.length && challenges.length > 0) {
      return makeResponse({
        status: 'already_contributed',
        message: '¡Ya has completado los 3 retos de tu Tridente personal este mes!',
      });
    }

    const specificityRank: Record<TridenteChallengeConfig['ruleType'], number> = {
      style: 1,
      abv_gte: 2,
      country_not_spain: 3,
      format: 4,
    };

    const matchingPending = challenges
      .filter((c) => !completedSet.has(c.id) && matchesTridenteChallenge(beer, c))
      .sort((a, b) => specificityRank[a.ruleType] - specificityRank[b.ruleType]);

    if (matchingPending.length === 0) {
      const matchingDone = challenges.find(
        (c) => completedSet.has(c.id) && matchesTridenteChallenge(beer, c)
      );
      if (matchingDone) {
        return makeResponse({
          status: 'already_contributed',
          message: `Ya completaste el reto «${matchingDone.title}» de tu Tridente.`,
          slotKey: `tridente_${matchingDone.id}`,
          slotLabel: matchingDone.title,
        });
      }
      return makeResponse({
        status: 'invalid',
        message: `${beer.name} no cumple ninguno de tus retos pendientes del Tridente.`,
      });
    }

    const chosen = matchingPending[0];
    slotKey = `tridente_${chosen.id}`;
    slotLabel = chosen.title;

    const insertedContrib = await db
      .insert(schema.tabernaContributions)
      .values({
        missionId: mission.id,
        userId,
        beerId: beer.id,
        slotKey,
      })
      .onConflictDoNothing()
      .returning({ id: schema.tabernaContributions.id });

    if (insertedContrib.length === 0) {
      return makeResponse({
        status: 'already_contributed',
        message: 'Ya aportaste esta misma cerveza a tu Tridente este mes.',
        slotKey,
        slotLabel,
      });
    }

    userProg.completedChallengeIds.push(chosen.id);
    userProg.beersByChallenge[chosen.id] = {
      beerId: beer.id,
      beerName: beer.name,
      completedAt: nowIso,
    };
    if (userProg.completedChallengeIds.length >= challenges.length) {
      userProg.completedAt = nowIso;
    }
    memberProgress[userId] = userProg;
    progress.memberProgress = memberProgress;

    const completedMemberIds = memberIds.filter(
      (uid) => (memberProgress[uid]?.completedChallengeIds?.length || 0) >= challenges.length
    );
    const halfMembers = Math.ceil(Math.max(1, memberIds.length) / 2);

    if (completedMemberIds.length >= halfMembers) {
      await db
        .insert(schema.tabernaMissionMilestones)
        .values({ missionId: mission.id, milestoneKey: 'tridente_50' })
        .onConflictDoNothing();

      const claimed = await claimMissionMilestoneChapas(
        db,
        mission.id,
        'tridente_50',
        completedMemberIds.map((uid) => ({ userId: uid, chapas: 150 }))
      );
      const added = claimed.get(userId) || 0;
      if (added > 0) {
        userChapasEarned += added;
        milestonesReached.push('¡Mitad de la Taberna con Tridente! +150 Chapas');
      }
    }

    if (memberIds.length > 0 && completedMemberIds.length >= memberIds.length) {
      const m100 = await db
        .insert(schema.tabernaMissionMilestones)
        .values({ missionId: mission.id, milestoneKey: 'tridente_100' })
        .onConflictDoNothing()
        .returning({ milestoneKey: schema.tabernaMissionMilestones.milestoneKey });

      if (m100.length > 0) {
        pointsDelta += 350;
        milestonesReached.push('¡Toda la Taberna completó el Tridente! +400 Chapas · +350 pts');
      }
      const claimed = await claimMissionMilestoneChapas(
        db,
        mission.id,
        'tridente_100',
        completedMemberIds.map((uid) => ({ userId: uid, chapas: 400 }))
      );
      userChapasEarned += claimed.get(userId) || 0;

      missionCompletedNow = true;
      flawlessNow = true;
      progress.flawless = true;
      for (const uid of memberIds) {
        usersToEvaluateAchievements.add(uid);
      }
    }
  } else {
    // cata
    const targetStyle = config.style || 'Lager';
    const targetTotal = config.targetTotal || 15;

    if (!matchesBeerStyle(beer, targetStyle)) {
      return makeResponse({
        status: 'invalid',
        message: `${beer.name} es estilo ${beer.style}, y la Cata Temática de este mes es de ${targetStyle}.`,
      });
    }

    slotKey = `cata_${beer.id}`;
    slotLabel = `Cata ${targetStyle}`;

    const insertedContrib = await db
      .insert(schema.tabernaContributions)
      .values({
        missionId: mission.id,
        userId,
        beerId: beer.id,
        slotKey,
      })
      .onConflictDoNothing()
      .returning({ id: schema.tabernaContributions.id });

    if (insertedContrib.length === 0) {
      return makeResponse({
        status: 'already_contributed',
        message: 'Ya has aportado esta cerveza a la Cata Temática de este mes.',
        slotKey,
        slotLabel,
      });
    }

    const leaderboard = progress.leaderboard || {};
    const prevEntry = leaderboard[userId] || {
      username: actingUsername,
      count: 0,
      lastAt: nowIso,
    };
    leaderboard[userId] = {
      username: actingUsername,
      count: prevEntry.count + 1,
      lastAt: nowIso,
    };
    progress.leaderboard = leaderboard;
    progress.totalCount = (progress.totalCount || 0) + 1;

    if (progress.totalCount >= targetTotal) {
      const mGoal = await db
        .insert(schema.tabernaMissionMilestones)
        .values({ missionId: mission.id, milestoneKey: 'cata_goal' })
        .onConflictDoNothing()
        .returning({ milestoneKey: schema.tabernaMissionMilestones.milestoneKey });

      const contributors = memberIds.filter((uid) => (leaderboard[uid]?.count || 0) >= 1);
      if (mGoal.length > 0) {
        pointsDelta += 350;
        milestonesReached.push(`¡Meta de Cata (${targetTotal}) alcanzada! +400 Chapas · +350 pts`);
        const claimedGoal = await claimMissionMilestoneChapas(
          db,
          mission.id,
          'cata_goal',
          contributors.map((uid) => ({ userId: uid, chapas: 400 }))
        );
        userChapasEarned += claimedGoal.get(userId) || 0;
      }

      // Top 1 individual de la Cata Temática
      const mTop1 = await db
        .insert(schema.tabernaMissionMilestones)
        .values({ missionId: mission.id, milestoneKey: 'cata_top1' })
        .onConflictDoNothing()
        .returning({ milestoneKey: schema.tabernaMissionMilestones.milestoneKey });

      if (mTop1.length > 0) {
        let maxCount = 0;
        for (const entry of Object.values(leaderboard)) {
          if (entry.count > maxCount) maxCount = entry.count;
        }
        const topIds = Object.entries(leaderboard)
          .filter(([, entry]) => entry.count === maxCount && maxCount > 0)
          .map(([uid]) => uid);
        const claimedTop = await claimMissionMilestoneChapas(
          db,
          mission.id,
          'cata_top1',
          topIds.map((uid) => ({ userId: uid, chapas: 200 }))
        );
        const topAdded = claimedTop.get(userId) || 0;
        if (topAdded > 0) {
          userChapasEarned += topAdded;
          milestonesReached.push('¡Top 1 de la Cata Temática! +200 Chapas extra');
        }
      }

      missionCompletedNow = true;
      flawlessNow = memberIds.length > 0 && memberIds.every((uid) => (leaderboard[uid]?.count || 0) >= 1);
      progress.flawless = flawlessNow;
      for (const uid of memberIds) {
        usersToEvaluateAchievements.add(uid);
      }
    }
  }

  const nextStatus = missionCompletedNow ? 'completed' : mission.status;
  const nextCompletedAt = missionCompletedNow ? new Date() : mission.completedAt;

  const [updatedMission] = await db
    .update(schema.tabernaMissions)
    .set({
      progress: progress as Record<string, unknown>,
      status: nextStatus,
      completedAt: nextCompletedAt,
    })
    .where(eq(schema.tabernaMissions.id, mission.id))
    .returning();

  const levelResult = await awardTabernaPointsAndLevels(
    db,
    tabernaId,
    mission.id,
    pointsDelta,
    memberIds
  );

  const userLevelChapas = levelResult.levelChapasByUser.get(userId) || 0;
  userChapasEarned += userLevelChapas;

  if (levelResult.newLevel > levelResult.oldLevel) {
    milestonesReached.push(
      `¡Taberna Nivel ${levelResult.newLevel}! +${levelResult.newLevel * 100} Chapas`
    );
    for (const uid of memberIds) {
      usersToEvaluateAchievements.add(uid);
    }
  }

  let actingUserNewlyUnlocked: NewlyUnlockedAchievement[] = [];
  if (usersToEvaluateAchievements.size > 0) {
    for (const uid of usersToEvaluateAchievements) {
      const unlocked = await evaluateTabernaAchievements(db, uid, {
        bingoLine: bingoLineUsers.has(uid),
        bingoFull: bingoFullFlag,
        flawlessMission: flawlessNow,
      });
      if (uid === userId) {
        actingUserNewlyUnlocked = unlocked;
        for (const a of unlocked) {
          userChapasEarned += a.rewardChapas || 0;
        }
      }
    }
  }

  return makeResponse({
    status: 'valid',
    message: `¡${beer.name} añadida al minijuego de ${taberna.name}!`,
    slotKey,
    slotLabel,
    milestonesReached,
    chapasEarned: userChapasEarned,
    pointsAwarded: pointsDelta,
    levelUp:
      levelResult.newLevel > levelResult.oldLevel
        ? {
            fromLevel: levelResult.oldLevel,
            toLevel: levelResult.newLevel,
            chapasPerMember: levelResult.newLevel * 100,
          }
        : null,
    newlyUnlocked: actingUserNewlyUnlocked,
    updatedMission,
    updatedTaberna: {
      level: levelResult.newLevel,
      points: levelResult.pointsTotal,
    },
  });
}

/**
 * Flujo exclusivo «Escanear para la Taberna»:
 * Independiente de user_beers, sin foto y sin valoración.
 */
export async function scanForTaberna(
  db: AppDatabase,
  tabernaId: string,
  userId: string,
  input: { code?: string; beerId?: number; frameBase64?: string }
): Promise<TabernaScanResultDto> {
  const [membership] = await db
    .select({ role: schema.tabernaMembers.role })
    .from(schema.tabernaMembers)
    .where(
      and(
        eq(schema.tabernaMembers.tabernaId, tabernaId),
        eq(schema.tabernaMembers.userId, userId)
      )
    );

  if (!membership) {
    throw new HttpError(403, 'Debes ser miembro de esta Taberna para escanear en su misión.');
  }

  if (input.frameBase64) {
    const antiCheat = await verifyBeerFrameWithGemini({ base64: input.frameBase64 });
    if (!antiCheat.allowed) {
      throw new HttpError(
        422,
        `Escaneo bloqueado: parece ${antiCheat.tipo_detectado || 'una pantalla o papel'}. Escanea una cerveza real.`,
        {
          antiCheatBlocked: true,
          es_pantalla: true,
          tipo_detectado: antiCheat.tipo_detectado,
          motivo: antiCheat.motivo,
        }
      );
    }
  }

  if (input.beerId !== undefined) {
    const [beerRow] = await db
      .select({
        id: schema.beers.id,
        brandId: schema.beers.brandId,
        brandName: schema.brands.name,
        name: schema.beers.name,
        format: schema.beers.format,
        barcode: schema.beers.barcode,
        style: schema.beers.style,
        abv: schema.beers.abv,
        country: schema.beers.country,
      })
      .from(schema.beers)
      .innerJoin(schema.brands, eq(schema.beers.brandId, schema.brands.id))
      .where(eq(schema.beers.id, input.beerId));

    if (!beerRow) {
      throw new HttpError(404, 'La cerveza indicada no existe en el catálogo.');
    }

    return contributeBeerToMission(db, tabernaId, userId, beerRow);
  }

  const code = (input.code || '').trim();
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
      'Cerveza no encontrada en el catálogo oficial de BeerDex.'
    );
  }

  if (resolved.needsVarietyConfirm) {
    const [taberna] = await db
      .select()
      .from(schema.tabernas)
      .where(eq(schema.tabernas.id, tabernaId));
    const mission = await ensureCurrentMission(db, tabernaId);
    const members = await db
      .select({ userId: schema.tabernaMembers.userId })
      .from(schema.tabernaMembers)
      .where(eq(schema.tabernaMembers.tabernaId, tabernaId));
    const hydrated = await hydrateMissionDto(db, mission, members.length);
    const brandBeers = await getScopedBrandBeers(db, resolved);

    return {
      status: 'needs_variety_confirm',
      message: `Hemos reconocido la marca ${resolved.beer.brandName}. Selecciona la variedad exacta:`,
      taberna: {
        id: taberna.id,
        name: taberna.name,
        level: taberna.level,
        points: taberna.points,
        nextLevelPoints: getNextLevelThreshold(taberna.level),
      },
      beer: {
        ...resolved.beer,
        abv: Number(resolved.beer.abv),
      },
      brandBeers: brandBeers.map((b) => ({
        ...b,
        abv: Number(b.abv),
      })),
      milestonesReached: [],
      chapasEarned: 0,
      pointsAwarded: 0,
      levelUp: null,
      newlyUnlocked: [],
      mission: hydrated,
    };
  }

  return contributeBeerToMission(db, tabernaId, userId, resolved.beer);
}

/**
 * Hook desde el registro personal en /api/beers/register:
 * aporta en segundo plano a todas las Tabernas activas del usuario donde la cerveza encaje.
 */
export async function onBeerRegisteredForTabernas(
  db: AppDatabase,
  userId: string,
  beerId: number
): Promise<{
  updates: Array<{
    tabernaId: string;
    tabernaName: string;
    slotLabel: string | null;
    milestonesReached: string[];
    chapasEarned: number;
    pointsAwarded: number;
  }>;
  totalChapasEarned: number;
  newlyUnlocked: NewlyUnlockedAchievement[];
}> {
  const memberships = await db
    .select({ tabernaId: schema.tabernaMembers.tabernaId })
    .from(schema.tabernaMembers)
    .where(eq(schema.tabernaMembers.userId, userId));

  if (memberships.length === 0) {
    return { updates: [], totalChapasEarned: 0, newlyUnlocked: [] };
  }

  const [beerRow] = await db
    .select({
      id: schema.beers.id,
      brandId: schema.beers.brandId,
      brandName: schema.brands.name,
      name: schema.beers.name,
      format: schema.beers.format,
      barcode: schema.beers.barcode,
      style: schema.beers.style,
      abv: schema.beers.abv,
      country: schema.beers.country,
    })
    .from(schema.beers)
    .innerJoin(schema.brands, eq(schema.beers.brandId, schema.brands.id))
    .where(eq(schema.beers.id, beerId));

  if (!beerRow) {
    return { updates: [], totalChapasEarned: 0, newlyUnlocked: [] };
  }

  const updates: Array<{
    tabernaId: string;
    tabernaName: string;
    slotLabel: string | null;
    milestonesReached: string[];
    chapasEarned: number;
    pointsAwarded: number;
  }> = [];
  let totalChapasEarned = 0;
  const newlyUnlockedMap = new Map<number, NewlyUnlockedAchievement>();

  for (const m of memberships) {
    const res = await contributeBeerToMission(db, m.tabernaId, userId, beerRow);
    if (res.status === 'valid') {
      updates.push({
        tabernaId: res.taberna.id,
        tabernaName: res.taberna.name,
        slotLabel: res.slotLabel ?? null,
        milestonesReached: res.milestonesReached,
        chapasEarned: res.chapasEarned,
        pointsAwarded: res.pointsAwarded,
      });
      totalChapasEarned += res.chapasEarned;
      for (const ach of res.newlyUnlocked) {
        newlyUnlockedMap.set(ach.id, ach);
      }
    }
  }

  return {
    updates,
    totalChapasEarned,
    newlyUnlocked: Array.from(newlyUnlockedMap.values()),
  };
}


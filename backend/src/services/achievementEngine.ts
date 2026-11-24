import { and, eq, inArray, or, sql } from 'drizzle-orm';
import { AppDatabase, schema } from '../db';
import {
  getCachedAchievements,
  getCachedBeers,
  getCachedCosmetics,
  getCachedIcons,
  getCachedTitles,
} from './catalogCache';
import {
  ActiveRelicInstance,
  calculateAchievementRewardChapas,
  getActiveUserRelics,
} from './relicService';

export interface NewlyUnlockedAchievement {
  id: number;
  code: string;
  name: string;
  description: string;
  rewardChapas: number;
  rewardTitle: { id: number; name: string } | null;
  rewardIcon: { id: number; name: string; imageUrl: string } | null;
  rewardCosmetic: {
    id: number;
    code: string;
    type: 'frame' | 'card_style' | 'relic' | 'color_theme';
    name: string;
    previewKey: string;
  } | null;
}

export function computeMaxConsecutiveDays(dates: Date[]): number {
  if (dates.length === 0) return 0;

  const uniqueDayMillis = Array.from(
    new Set(
      dates.map((d) =>
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
      )
    )
  ).sort((a, b) => a - b);

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < uniqueDayMillis.length; i += 1) {
    if (uniqueDayMillis[i] - uniqueDayMillis[i - 1] === ONE_DAY_MS) {
      currentStreak += 1;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
    } else {
      currentStreak = 1;
    }
  }

  return maxStreak;
}

export async function ensureUserAchievements(db: AppDatabase, userId: string): Promise<void> {
  const [userExists, allAchievements] = await Promise.all([
    db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.id, userId)),
    getCachedAchievements(db),
  ]);
  if (userExists.length === 0 || allAchievements.length === 0) return;

  await db
    .insert(schema.userAchievements)
    .values(
      allAchievements.map((ach) => ({
        userId,
        achievementId: ach.id,
        currentProgress: 0,
        unlocked: false,
        unlockedAt: null,
      }))
    )
    .onConflictDoNothing();
}

export async function getAcceptedFriendIds(db: AppDatabase, userId: string): Promise<string[]> {
  const rows = await db
    .select({
      requesterId: schema.friendships.requesterId,
      addresseeId: schema.friendships.addresseeId,
    })
    .from(schema.friendships)
    .where(
      and(
        eq(schema.friendships.status, 'accepted'),
        or(
          eq(schema.friendships.requesterId, userId),
          eq(schema.friendships.addresseeId, userId)
        )
      )
    );

  return rows.map((row) =>
    row.requesterId === userId ? row.addresseeId : row.requesterId
  );
}

function normalizeCountry(country: string): string {
  return country
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export async function evaluateAchievements(
  db: AppDatabase,
  userId: string,
  options?: { activeRelics?: ActiveRelicInstance[] }
): Promise<NewlyUnlockedAchievement[]> {
  const [
    userRows,
    allAchievements,
    allTitles,
    allIcons,
    allCosmetics,
    allCatalogBeers,
    userBeerRows,
    existingRows,
    flipRows,
    visitRows,
    acceptedFriendIds,
  ] = await Promise.all([
    db.select().from(schema.users).where(eq(schema.users.id, userId)),
    getCachedAchievements(db),
    getCachedTitles(db),
    getCachedIcons(db),
    getCachedCosmetics(db),
    getCachedBeers(db),
    db
      .select({
        beerId: schema.userBeers.beerId,
        rating: schema.userBeers.rating,
        registeredAt: schema.userBeers.registeredAt,
        brandId: schema.beers.brandId,
        format: schema.beers.format,
        style: schema.beers.style,
        abv: schema.beers.abv,
        country: schema.beers.country,
      })
      .from(schema.userBeers)
      .innerJoin(schema.beers, eq(schema.userBeers.beerId, schema.beers.id))
      .where(eq(schema.userBeers.userId, userId)),
    db
      .select()
      .from(schema.userAchievements)
      .where(eq(schema.userAchievements.userId, userId)),
    db
      .select({ beerId: schema.userBeerFlips.beerId })
      .from(schema.userBeerFlips)
      .where(eq(schema.userBeerFlips.userId, userId)),
    db
      .select({ visitedUserId: schema.userProfileVisits.visitedUserId })
      .from(schema.userProfileVisits)
      .where(eq(schema.userProfileVisits.visitorId, userId)),
    getAcceptedFriendIds(db, userId),
  ]);

  const userRow = userRows[0];
  if (!userRow) {
    return [];
  }

  let resolvedExistingRows = existingRows;
  if (resolvedExistingRows.length < allAchievements.length) {
    await ensureUserAchievements(db, userId);
    resolvedExistingRows = await db
      .select()
      .from(schema.userAchievements)
      .where(eq(schema.userAchievements.userId, userId));
  }

  const titleById = new Map(allTitles.map((t) => [t.id, t]));
  const iconById = new Map(allIcons.map((i) => [i.id, i]));
  const cosmeticById = new Map(allCosmetics.map((c) => [c.id, c]));
  const existingByAchId = new Map(resolvedExistingRows.map((r) => [r.achievementId, r]));

  // Totales por marca en catálogo
  const brandTotalMap = new Map<number, number>();
  for (const beer of allCatalogBeers) {
    brandTotalMap.set(beer.brandId, (brandTotalMap.get(beer.brandId) || 0) + 1);
  }

  // Contadores del usuario
  const totalUserBeers = userBeerRows.length;
  const userBrandCounts = new Map<number, number>();
  const formatsSeen = new Set<string>();
  const distinctStyles = new Set<string>();
  const distinctCountries = new Set<string>();

  let lataCount = 0;
  let botellinCount = 0;
  let litronaCount = 0;
  let zeroAlcoholCount = 0;
  let styleExplorerCount = 0;
  let lagerCount = 0;
  let tostadaCount = 0;
  let negraCount = 0;
  let ipaCount = 0;
  let trigoCount = 0;
  let highAbvCount = 0;
  let lowAbvCount = 0;

  let spainCount = 0;
  let portugalCount = 0;
  let belgiumCount = 0;
  let germanyCount = 0;
  let ukIrelandCount = 0;
  let mexicoCount = 0;
  let japanCount = 0;

  let hasFiveStar = false;
  let hasOneStar = false;
  const registeredDates: Date[] = [];

  for (const ub of userBeerRows) {
    userBrandCounts.set(ub.brandId, (userBrandCounts.get(ub.brandId) || 0) + 1);
    formatsSeen.add(ub.format);
    if (ub.format === 'lata') lataCount += 1;
    if (ub.format === 'botellin') botellinCount += 1;
    if (ub.format === 'litrona') litronaCount += 1;

    const abvNum = Number(ub.abv);
    const isZero = abvNum === 0 || /0[,.]0|sin alcohol/i.test(ub.style);
    if (isZero) {
      zeroAlcoholCount += 1;
      distinctStyles.add('0,0%');
    }
    if (/negra|tostada|ipa/i.test(ub.style)) {
      styleExplorerCount += 1;
    }
    if (/lager/i.test(ub.style)) {
      lagerCount += 1;
      distinctStyles.add('Lager');
    }
    if (/tostada/i.test(ub.style)) {
      tostadaCount += 1;
      distinctStyles.add('Tostada');
    }
    if (/negra|stout|porter/i.test(ub.style)) {
      negraCount += 1;
      distinctStyles.add('Negra');
    }
    if (/ipa/i.test(ub.style)) {
      ipaCount += 1;
      distinctStyles.add('IPA');
    }
    if (/trigo|weizen|wheat/i.test(ub.style)) {
      trigoCount += 1;
      distinctStyles.add('Trigo');
    }

    if (abvNum >= 7.0) {
      highAbvCount += 1;
    }
    if (abvNum > 0 && abvNum <= 3.5) {
      lowAbvCount += 1;
    }

    const normCountry = normalizeCountry(ub.country);
    if (normCountry) {
      distinctCountries.add(normCountry);
    }
    if (normCountry === 'espana') spainCount += 1;
    if (normCountry === 'portugal') portugalCount += 1;
    if (normCountry === 'belgica') belgiumCount += 1;
    if (normCountry === 'alemania') germanyCount += 1;
    if (normCountry === 'reino unido' || normCountry === 'irlanda') ukIrelandCount += 1;
    if (normCountry === 'mexico') mexicoCount += 1;
    if (normCountry === 'japon') japanCount += 1;

    if (ub.rating === 5) hasFiveStar = true;
    if (ub.rating === 1) hasOneStar = true;
    registeredDates.push(new Date(ub.registeredAt));
  }

  let completedBrandsCount = 0;
  for (const [brandId, totalInBrand] of brandTotalMap.entries()) {
    if (totalInBrand > 0 && (userBrandCounts.get(brandId) || 0) >= totalInBrand) {
      completedBrandsCount += 1;
    }
  }
  const distinctBrandsCount = userBrandCounts.size;

  // Amigos y visitas
  const acceptedFriendSet = new Set(acceptedFriendIds);
  const visitedFriendsCount = visitRows.filter((v) =>
    acceptedFriendSet.has(v.visitedUserId)
  ).length;

  let friendsWithCompletedBrandCount = 0;
  let surpassedFriend = false;
  let friendsWith10BeersCount = 0;

  if (acceptedFriendIds.length > 0) {
    const friendBeers = await db
      .select({
        userId: schema.userBeers.userId,
        brandId: schema.beers.brandId,
      })
      .from(schema.userBeers)
      .innerJoin(schema.beers, eq(schema.userBeers.beerId, schema.beers.id))
      .where(inArray(schema.userBeers.userId, acceptedFriendIds));

    const friendBrandMap = new Map<string, Map<number, number>>();
    const friendTotalBeersMap = new Map<string, number>();

    for (const row of friendBeers) {
      friendTotalBeersMap.set(
        row.userId,
        (friendTotalBeersMap.get(row.userId) || 0) + 1
      );
      let bMap = friendBrandMap.get(row.userId);
      if (!bMap) {
        bMap = new Map<number, number>();
        friendBrandMap.set(row.userId, bMap);
      }
      bMap.set(row.brandId, (bMap.get(row.brandId) || 0) + 1);
    }

    for (const fid of acceptedFriendIds) {
      const fTotal = friendTotalBeersMap.get(fid) || 0;
      if (totalUserBeers > fTotal) {
        surpassedFriend = true;
      }
      if (fTotal >= 10) {
        friendsWith10BeersCount += 1;
      }
      const bMap = friendBrandMap.get(fid);
      if (bMap) {
        let hasCompleted = false;
        for (const [brandId, count] of bMap.entries()) {
          const totalInBrand = brandTotalMap.get(brandId) || 0;
          if (totalInBrand > 0 && count >= totalInBrand) {
            hasCompleted = true;
            break;
          }
        }
        if (hasCompleted) {
          friendsWithCompletedBrandCount += 1;
        }
      }
    }
  }

  const flipsCount = flipRows.length;
  const maxStreak = computeMaxConsecutiveDays(registeredDates);
  const equilibriumProgress =
    (lataCount >= 10 ? 1 : 0) +
    (botellinCount >= 10 ? 1 : 0) +
    (litronaCount >= 5 ? 1 : 0);

  const rawProgressById: Record<number, number> = {
    // A. Colección de Cervezas (1-16)
    1: totalUserBeers,
    2: totalUserBeers,
    3: totalUserBeers,
    4: totalUserBeers,
    5: totalUserBeers,
    6: totalUserBeers,
    7: totalUserBeers,
    8: totalUserBeers,
    9: totalUserBeers,
    10: totalUserBeers,
    11: totalUserBeers,
    12: totalUserBeers,
    13: totalUserBeers,
    14: totalUserBeers,
    15: totalUserBeers,
    16: totalUserBeers,

    // B. Marcas Completadas y Descubrimiento (17-32)
    17: completedBrandsCount,
    18: completedBrandsCount,
    19: completedBrandsCount,
    20: completedBrandsCount,
    21: completedBrandsCount,
    22: completedBrandsCount,
    23: completedBrandsCount,
    24: completedBrandsCount,
    25: completedBrandsCount,
    26: completedBrandsCount,
    27: distinctBrandsCount,
    28: distinctBrandsCount,
    29: distinctBrandsCount,
    30: distinctBrandsCount,
    31: distinctBrandsCount,
    32: distinctBrandsCount,

    // C. Formatos (33-47)
    33: lataCount,
    34: lataCount,
    35: lataCount,
    36: lataCount,
    37: lataCount,
    38: botellinCount,
    39: botellinCount,
    40: botellinCount,
    41: botellinCount,
    42: botellinCount,
    43: litronaCount,
    44: litronaCount,
    45: litronaCount,
    46: formatsSeen.size,
    47: equilibriumProgress,

    // D. Estilos y Graduación (48-64)
    48: zeroAlcoholCount,
    49: zeroAlcoholCount,
    50: zeroAlcoholCount,
    51: styleExplorerCount,
    52: lagerCount,
    53: lagerCount,
    54: tostadaCount,
    55: tostadaCount,
    56: negraCount,
    57: negraCount,
    58: ipaCount,
    59: ipaCount,
    60: trigoCount,
    61: trigoCount,
    62: distinctStyles.size,
    63: highAbvCount,
    64: lowAbvCount,

    // E. Geografía y Rutas (65-74)
    65: spainCount,
    66: spainCount,
    67: portugalCount,
    68: belgiumCount,
    69: germanyCount,
    70: ukIrelandCount,
    71: mexicoCount,
    72: japanCount,
    73: distinctCountries.size,
    74: distinctCountries.size,

    // F. Social y Amigos (75-84)
    75: acceptedFriendIds.length,
    76: acceptedFriendIds.length,
    77: acceptedFriendIds.length,
    78: acceptedFriendIds.length,
    79: visitedFriendsCount,
    80: visitedFriendsCount,
    81: friendsWithCompletedBrandCount,
    82: friendsWithCompletedBrandCount,
    83: surpassedFriend ? 1 : 0,
    84: friendsWith10BeersCount,

    // G. Valoraciones, Perfil, Constancia y Curiosidad (85-99)
    85: hasFiveStar ? 1 : 0,
    86: hasOneStar ? 1 : 0,
    87: totalUserBeers,
    88: totalUserBeers,
    89: userRow.hasChangedIcon ? 1 : 0,
    90: userRow.hasEquippedUnlockedTitle ? 1 : 0,
    91: flipsCount,
    92: flipsCount,
    93: flipsCount,
    94: maxStreak,
    95: maxStreak,
    96: maxStreak,
    97: maxStreak,
    98: userRow.hasRegisteredPack ? 1 : 0,
    99: userRow.hasSubmittedSuggestion ? 1 : 0,
  };

  const now = new Date();
  const newlyUnlocked: NewlyUnlockedAchievement[] = [];
  let unlocked99Count = 0;
  let totalChapasAwarded = 0;
  const activeRelics = options?.activeRelics ?? (await getActiveUserRelics(db, userId));

  // Sólo los 99 logros originales cuentan para «Dios de la BeerDex» (#100).
  // Los logros ≥101 (Tabernas y Hermandad) los gestiona tabernaService.
  const first99 = allAchievements.filter((a) => a.id < 100).sort((a, b) => a.id - b.id);
  const ultimateAch = allAchievements.find((a) => a.id === 100);
  const rowsToUpsert: Array<{
    userId: string;
    achievementId: number;
    currentProgress: number;
    unlocked: boolean;
    unlockedAt: Date | null;
  }> = [];

  for (const ach of first99) {
    const existing = existingByAchId.get(ach.id);
    const raw = rawProgressById[ach.id] ?? 0;
    const wasUnlocked = existing?.unlocked ?? false;
    const isNowUnlocked = wasUnlocked || raw >= ach.targetValue;
    const clampedProgress = isNowUnlocked
      ? ach.targetValue
      : Math.min(raw, ach.targetValue);
    const unlockedAt = wasUnlocked
      ? existing?.unlockedAt ?? now
      : isNowUnlocked
      ? now
      : null;

    if (isNowUnlocked) {
      unlocked99Count += 1;
    }

    if (
      !existing ||
      existing.currentProgress !== clampedProgress ||
      existing.unlocked !== isNowUnlocked
    ) {
      rowsToUpsert.push({
        userId,
        achievementId: ach.id,
        currentProgress: clampedProgress,
        unlocked: isNowUnlocked,
        unlockedAt,
      });
    }

    if (!wasUnlocked && isNowUnlocked) {
      const rewardCalc = calculateAchievementRewardChapas(
        ach.rewardChapas,
        ach.category,
        activeRelics
      );
      totalChapasAwarded += rewardCalc.totalRewardChapas;
      const rTitle = ach.rewardTitleId ? titleById.get(ach.rewardTitleId) : undefined;
      const rIcon = ach.rewardIconId ? iconById.get(ach.rewardIconId) : undefined;
      const rCosmetic = ach.rewardCosmeticId
        ? cosmeticById.get(ach.rewardCosmeticId)
        : undefined;
      newlyUnlocked.push({
        id: ach.id,
        code: ach.code,
        name: ach.name,
        description: ach.description,
        rewardChapas: rewardCalc.totalRewardChapas,
        rewardTitle: rTitle ? { id: rTitle.id, name: rTitle.name } : null,
        rewardIcon: rIcon
          ? { id: rIcon.id, name: rIcon.name, imageUrl: rIcon.imageUrl }
          : null,
        rewardCosmetic: rCosmetic
          ? {
              id: rCosmetic.id,
              code: rCosmetic.code,
              type: rCosmetic.type,
              name: rCosmetic.name,
              previewKey: rCosmetic.previewKey,
            }
          : null,
      });
    }
  }

  if (ultimateAch) {
    const existing = existingByAchId.get(100);
    const wasUnlocked = existing?.unlocked ?? false;
    const isNowUnlocked = wasUnlocked || unlocked99Count >= ultimateAch.targetValue;
    const clampedProgress = isNowUnlocked
      ? ultimateAch.targetValue
      : Math.min(unlocked99Count, ultimateAch.targetValue);
    const unlockedAt = wasUnlocked
      ? existing?.unlockedAt ?? now
      : isNowUnlocked
      ? now
      : null;

    if (
      !existing ||
      existing.currentProgress !== clampedProgress ||
      existing.unlocked !== isNowUnlocked
    ) {
      rowsToUpsert.push({
        userId,
        achievementId: 100,
        currentProgress: clampedProgress,
        unlocked: isNowUnlocked,
        unlockedAt,
      });
    }

    if (!wasUnlocked && isNowUnlocked) {
      const rewardCalc = calculateAchievementRewardChapas(
        ultimateAch.rewardChapas,
        ultimateAch.category,
        activeRelics
      );
      totalChapasAwarded += rewardCalc.totalRewardChapas;
      const rTitle = ultimateAch.rewardTitleId
        ? titleById.get(ultimateAch.rewardTitleId)
        : undefined;
      const rIcon = ultimateAch.rewardIconId
        ? iconById.get(ultimateAch.rewardIconId)
        : undefined;
      const rCosmetic = ultimateAch.rewardCosmeticId
        ? cosmeticById.get(ultimateAch.rewardCosmeticId)
        : undefined;
      newlyUnlocked.push({
        id: ultimateAch.id,
        code: ultimateAch.code,
        name: ultimateAch.name,
        description: ultimateAch.description,
        rewardChapas: rewardCalc.totalRewardChapas,
        rewardTitle: rTitle ? { id: rTitle.id, name: rTitle.name } : null,
        rewardIcon: rIcon
          ? { id: rIcon.id, name: rIcon.name, imageUrl: rIcon.imageUrl }
          : null,
        rewardCosmetic: rCosmetic
          ? {
              id: rCosmetic.id,
              code: rCosmetic.code,
              type: rCosmetic.type,
              name: rCosmetic.name,
              previewKey: rCosmetic.previewKey,
            }
          : null,
      });
    }
  }

  if (rowsToUpsert.length > 0) {
    await db
      .insert(schema.userAchievements)
      .values(rowsToUpsert)
      .onConflictDoUpdate({
        target: [schema.userAchievements.userId, schema.userAchievements.achievementId],
        set: {
          currentProgress: sql`CASE WHEN ${schema.userAchievements.unlocked} THEN ${schema.userAchievements.currentProgress} ELSE excluded.current_progress END`,
          unlocked: sql`${schema.userAchievements.unlocked} OR excluded.unlocked`,
          unlockedAt: sql`COALESCE(${schema.userAchievements.unlockedAt}, excluded.unlocked_at)`,
        },
      });
  }

  if (totalChapasAwarded > 0) {
    await db
      .update(schema.users)
      .set({
        chapas: sql`${schema.users.chapas} + ${totalChapasAwarded}`,
      })
      .where(eq(schema.users.id, userId));
  }

  return newlyUnlocked;
}

/**
 * Actualiza de forma monótona e idempotente un subconjunto de logros (p. ej. 101-110)
 * otorgando sus recompensas exactamente una vez.
 */
export async function applyAchievementProgressUpdates(
  db: AppDatabase,
  userId: string,
  achievementIds: number[],
  rawProgressById: Record<number, number>
): Promise<NewlyUnlockedAchievement[]> {
  if (achievementIds.length === 0) return [];

  const targetIdSet = new Set(achievementIds);
  const [
    allAchievements,
    allTitles,
    allIcons,
    allCosmetics,
    existingRows,
    activeRelics,
  ] = await Promise.all([
    getCachedAchievements(db),
    getCachedTitles(db),
    getCachedIcons(db),
    getCachedCosmetics(db),
    db
      .select()
      .from(schema.userAchievements)
      .where(
        and(
          eq(schema.userAchievements.userId, userId),
          inArray(schema.userAchievements.achievementId, achievementIds)
        )
      ),
    getActiveUserRelics(db, userId),
  ]);

  const targetAchievements = allAchievements.filter((a) => targetIdSet.has(a.id));
  if (targetAchievements.length === 0) return [];

  let resolvedExistingRows = existingRows;
  if (resolvedExistingRows.length < targetAchievements.length) {
    await ensureUserAchievements(db, userId);
    resolvedExistingRows = await db
      .select()
      .from(schema.userAchievements)
      .where(
        and(
          eq(schema.userAchievements.userId, userId),
          inArray(schema.userAchievements.achievementId, achievementIds)
        )
      );
  }

  const titleById = new Map(allTitles.map((t) => [t.id, t]));
  const iconById = new Map(allIcons.map((i) => [i.id, i]));
  const cosmeticById = new Map(allCosmetics.map((c) => [c.id, c]));
  const existingByAchId = new Map(resolvedExistingRows.map((r) => [r.achievementId, r]));

  const now = new Date();
  const newlyUnlocked: NewlyUnlockedAchievement[] = [];
  let totalChapasAwarded = 0;
  const progressRowsToUpsert: Array<{
    userId: string;
    achievementId: number;
    currentProgress: number;
    unlocked: boolean;
    unlockedAt: Date | null;
  }> = [];

  for (const ach of targetAchievements.sort((a, b) => a.id - b.id)) {
    const existing = existingByAchId.get(ach.id);
    const prevProgress = existing?.currentProgress ?? 0;
    const raw = Math.max(prevProgress, rawProgressById[ach.id] ?? 0);
    const wasUnlocked = existing?.unlocked ?? false;
    const isNowUnlocked = wasUnlocked || raw >= ach.targetValue;
    const clampedProgress = isNowUnlocked
      ? ach.targetValue
      : Math.min(raw, ach.targetValue);
    const unlockedAt = wasUnlocked
      ? existing?.unlockedAt ?? now
      : isNowUnlocked
      ? now
      : null;

    if (!wasUnlocked && isNowUnlocked) {
      // Actualización condicional para evitar doble premio bajo concurrencia
      const updatedRows = await db
        .update(schema.userAchievements)
        .set({
          currentProgress: clampedProgress,
          unlocked: true,
          unlockedAt,
        })
        .where(
          and(
            eq(schema.userAchievements.userId, userId),
            eq(schema.userAchievements.achievementId, ach.id),
            eq(schema.userAchievements.unlocked, false)
          )
        )
        .returning({ achievementId: schema.userAchievements.achievementId });

      if (updatedRows.length > 0) {
        const rewardCalc = calculateAchievementRewardChapas(
          ach.rewardChapas,
          ach.category,
          activeRelics
        );
        totalChapasAwarded += rewardCalc.totalRewardChapas;
        const rTitle = ach.rewardTitleId ? titleById.get(ach.rewardTitleId) : undefined;
        const rIcon = ach.rewardIconId ? iconById.get(ach.rewardIconId) : undefined;
        const rCosmetic = ach.rewardCosmeticId
          ? cosmeticById.get(ach.rewardCosmeticId)
          : undefined;
        newlyUnlocked.push({
          id: ach.id,
          code: ach.code,
          name: ach.name,
          description: ach.description,
          rewardChapas: rewardCalc.totalRewardChapas,
          rewardTitle: rTitle ? { id: rTitle.id, name: rTitle.name } : null,
          rewardIcon: rIcon
            ? { id: rIcon.id, name: rIcon.name, imageUrl: rIcon.imageUrl }
            : null,
          rewardCosmetic: rCosmetic
            ? {
                id: rCosmetic.id,
                code: rCosmetic.code,
                type: rCosmetic.type,
                name: rCosmetic.name,
                previewKey: rCosmetic.previewKey,
              }
            : null,
        });
      }
    } else if (!wasUnlocked && (!existing || existing.currentProgress !== clampedProgress)) {
      progressRowsToUpsert.push({
        userId,
        achievementId: ach.id,
        currentProgress: clampedProgress,
        unlocked: false,
        unlockedAt: null,
      });
    }
  }

  if (progressRowsToUpsert.length > 0) {
    await db
      .insert(schema.userAchievements)
      .values(progressRowsToUpsert)
      .onConflictDoUpdate({
        target: [schema.userAchievements.userId, schema.userAchievements.achievementId],
        set: {
          currentProgress: sql`CASE WHEN ${schema.userAchievements.unlocked} THEN ${schema.userAchievements.currentProgress} ELSE GREATEST(${schema.userAchievements.currentProgress}, excluded.current_progress) END`,
        },
      });
  }

  if (totalChapasAwarded > 0) {
    await db
      .update(schema.users)
      .set({
        chapas: sql`${schema.users.chapas} + ${totalChapasAwarded}`,
      })
      .where(eq(schema.users.id, userId));
  }

  return newlyUnlocked;
}

import { and, asc, eq, sql } from 'drizzle-orm';
import { AppDatabase, schema } from '../db';
import { ensureUserAchievements, evaluateAchievements } from './achievementEngine';

export interface CosmeticDto {
  id: number;
  code: string;
  type: 'frame' | 'card_style' | 'relic' | 'color_theme';
  name: string;
  description: string;
  previewKey: string;
  source: string;
  priceChapas: number | null;
  unlocked: boolean;
  equipped: boolean;
  unlockAchievementId: number | null;
  unlockAchievementName: string | null;
  metadata: Record<string, unknown> | null;
}

export interface AchievementDto {
  id: number;
  code: string;
  name: string;
  description: string;
  category: string;
  targetValue: number;
  currentProgress: number;
  unlocked: boolean;
  unlockedAt: string | null;
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

export function parseCosmeticMetadata(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function backfillUserChapasIfNeeded(
  db: AppDatabase,
  userId: string
): Promise<void> {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId));
  if (!user || user.chapasBackfilled) return;

  const [userBeers, allBeers, userAchRows, allAchievements, existingCompleted] =
    await Promise.all([
      db
        .select({
          beerId: schema.userBeers.beerId,
          brandId: schema.beers.brandId,
        })
        .from(schema.userBeers)
        .innerJoin(schema.beers, eq(schema.userBeers.beerId, schema.beers.id))
        .where(eq(schema.userBeers.userId, userId)),
      db.select({ id: schema.beers.id, brandId: schema.beers.brandId }).from(schema.beers),
      db
        .select()
        .from(schema.userAchievements)
        .where(and(eq(schema.userAchievements.userId, userId), eq(schema.userAchievements.unlocked, true))),
      db.select().from(schema.achievements),
      db
        .select()
        .from(schema.userCompletedBrands)
        .where(eq(schema.userCompletedBrands.userId, userId)),
    ]);

  let bonusChapas = userBeers.length * 10;

  // Marcas completadas aún no premiadas
  const brandTotal = new Map<number, number>();
  for (const b of allBeers) {
    brandTotal.set(b.brandId, (brandTotal.get(b.brandId) || 0) + 1);
  }
  const userBrandCounts = new Map<number, number>();
  for (const ub of userBeers) {
    userBrandCounts.set(ub.brandId, (userBrandCounts.get(ub.brandId) || 0) + 1);
  }
  const alreadyRewardedBrands = new Set(existingCompleted.map((c) => c.brandId));
  for (const [brandId, total] of brandTotal.entries()) {
    if (
      total > 0 &&
      (userBrandCounts.get(brandId) || 0) >= total &&
      !alreadyRewardedBrands.has(brandId)
    ) {
      await db
        .insert(schema.userCompletedBrands)
        .values({ userId, brandId })
        .onConflictDoNothing();
      bonusChapas += 50;
    }
  }

  // Logros ya desbloqueados en Fase 1
  const achMap = new Map(allAchievements.map((a) => [a.id, a]));
  for (const ua of userAchRows) {
    const ach = achMap.get(ua.achievementId);
    if (ach) {
      bonusChapas += ach.rewardChapas;
    }
  }

  await db
    .update(schema.users)
    .set({
      chapas: sql`${schema.users.chapas} + ${bonusChapas}`,
      chapasBackfilled: true,
    })
    .where(eq(schema.users.id, userId));

  await evaluateAchievements(db, userId);
}

export async function getUserAchievementsList(
  db: AppDatabase,
  userId: string
): Promise<{
  achievements: AchievementDto[];
  unlockedCount: number;
  totalCount: number;
}> {
  await evaluateAchievements(db, userId);

  const [allAchievements, userProgress, allTitles, allIcons, allCosmetics] =
    await Promise.all([
      db.select().from(schema.achievements).orderBy(asc(schema.achievements.id)),
      db
        .select()
        .from(schema.userAchievements)
        .where(eq(schema.userAchievements.userId, userId)),
      db.select().from(schema.titles),
      db.select().from(schema.icons),
      db.select().from(schema.cosmetics),
    ]);

  const progressMap = new Map(userProgress.map((p) => [p.achievementId, p]));
  const titleMap = new Map(allTitles.map((t) => [t.id, t]));
  const iconMap = new Map(allIcons.map((i) => [i.id, i]));
  const cosmeticMap = new Map(allCosmetics.map((c) => [c.id, c]));

  let unlockedCount = 0;
  const list: AchievementDto[] = allAchievements.map((ach) => {
    const row = progressMap.get(ach.id);
    const unlocked = row?.unlocked ?? false;
    if (unlocked) unlockedCount += 1;
    const rewardTitle = ach.rewardTitleId ? titleMap.get(ach.rewardTitleId) : undefined;
    const rewardIcon = ach.rewardIconId ? iconMap.get(ach.rewardIconId) : undefined;
    const rewardCosmetic = ach.rewardCosmeticId
      ? cosmeticMap.get(ach.rewardCosmeticId)
      : undefined;

    return {
      id: ach.id,
      code: ach.code,
      name: ach.name,
      description: ach.description,
      category: ach.category,
      targetValue: ach.targetValue,
      currentProgress: row?.currentProgress ?? 0,
      unlocked,
      unlockedAt: row?.unlockedAt ? new Date(row.unlockedAt).toISOString() : null,
      rewardChapas: ach.rewardChapas,
      rewardTitle: rewardTitle ? { id: rewardTitle.id, name: rewardTitle.name } : null,
      rewardIcon: rewardIcon
        ? { id: rewardIcon.id, name: rewardIcon.name, imageUrl: rewardIcon.imageUrl }
        : null,
      rewardCosmetic: rewardCosmetic
        ? {
            id: rewardCosmetic.id,
            code: rewardCosmetic.code,
            type: rewardCosmetic.type,
            name: rewardCosmetic.name,
            previewKey: rewardCosmetic.previewKey,
          }
        : null,
    };
  });

  return {
    achievements: list,
    unlockedCount,
    totalCount: list.length,
  };
}

export async function getFullUserProfile(
  db: AppDatabase,
  userId: string,
  options: { evaluate?: boolean } = {}
) {
  let [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId));

  if (!user) return null;

  if (options.evaluate) {
    await evaluateAchievements(db, userId);
  } else {
    await ensureUserAchievements(db, userId);
  }

  if (!user.chapasBackfilled) {
    await backfillUserChapasIfNeeded(db, userId);
    const [refreshedUser] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId));
    if (!refreshedUser) return null;
    user = refreshedUser;
  }

  const [
    allIcons,
    allTitles,
    allCosmetics,
    allAchievements,
    userAchRows,
    userOwnedIcons,
    userOwnedTitles,
    userOwnedCosmetics,
    userBeerRows,
    totalBeersRows,
  ] = await Promise.all([
    db.select().from(schema.icons).orderBy(asc(schema.icons.id)),
    db.select().from(schema.titles).orderBy(asc(schema.titles.id)),
    db.select().from(schema.cosmetics).orderBy(asc(schema.cosmetics.id)),
    db.select().from(schema.achievements),
    db
      .select()
      .from(schema.userAchievements)
      .where(eq(schema.userAchievements.userId, userId)),
    db
      .select({ iconId: schema.userIcons.iconId })
      .from(schema.userIcons)
      .where(eq(schema.userIcons.userId, userId)),
    db
      .select({ titleId: schema.userTitles.titleId })
      .from(schema.userTitles)
      .where(eq(schema.userTitles.userId, userId)),
    db
      .select({ cosmeticId: schema.userCosmetics.cosmeticId })
      .from(schema.userCosmetics)
      .where(eq(schema.userCosmetics.userId, userId)),
    db
      .select({ id: schema.userBeers.id })
      .from(schema.userBeers)
      .where(eq(schema.userBeers.userId, userId)),
    db.select({ id: schema.beers.id }).from(schema.beers),
  ]);

  const achMap = new Map(allAchievements.map((a) => [a.id, a]));
  const unlockedAchSet = new Set(
    userAchRows.filter((ua) => ua.unlocked).map((ua) => ua.achievementId)
  );
  const ownedIconSet = new Set(userOwnedIcons.map((r) => r.iconId));
  const ownedTitleSet = new Set(userOwnedTitles.map((r) => r.titleId));
  const ownedCosmeticSet = new Set(userOwnedCosmetics.map((r) => r.cosmeticId));

  const icons = allIcons.map((icon) => {
    const unlockAch = icon.unlockAchievementId
      ? achMap.get(icon.unlockAchievementId)
      : undefined;
    const unlocked =
      icon.isDefault ||
      ownedIconSet.has(icon.id) ||
      (icon.unlockAchievementId ? unlockedAchSet.has(icon.unlockAchievementId) : false);

    return {
      id: icon.id,
      name: icon.name,
      imageUrl: icon.imageUrl,
      isDefault: icon.isDefault,
      source: icon.source,
      priceChapas: icon.priceChapas,
      unlocked,
      equipped: icon.id === user.equippedIconId,
      unlockAchievementId: icon.unlockAchievementId,
      unlockAchievementName: unlockAch?.name ?? null,
    };
  });

  const titles = allTitles.map((title) => {
    const unlockAch = title.unlockAchievementId
      ? achMap.get(title.unlockAchievementId)
      : undefined;
    const unlocked =
      title.isDefault ||
      ownedTitleSet.has(title.id) ||
      (title.unlockAchievementId ? unlockedAchSet.has(title.unlockAchievementId) : false);

    return {
      id: title.id,
      name: title.name,
      isDefault: title.isDefault,
      source: title.source,
      priceChapas: title.priceChapas,
      unlocked,
      equipped: title.id === user.equippedTitleId,
      unlockAchievementId: title.unlockAchievementId,
      unlockAchievementName: unlockAch?.name ?? null,
    };
  });

  const defaultFrame = allCosmetics.find((c) => c.type === 'frame' && c.source === 'default');
  const defaultCardStyle = allCosmetics.find(
    (c) => c.type === 'card_style' && c.source === 'default'
  );
  const defaultColorTheme = allCosmetics.find(
    (c) => c.type === 'color_theme' && c.source === 'default'
  );

  const effectiveFrameId = user.equippedFrameId ?? defaultFrame?.id ?? null;
  const effectiveCardStyleId = user.equippedCardStyleId ?? defaultCardStyle?.id ?? null;
  const effectiveColorThemeId = user.equippedColorThemeId ?? defaultColorTheme?.id ?? null;
  const showcaseIds = [user.showcaseSlot1Id, user.showcaseSlot2Id, user.showcaseSlot3Id];

  const cosmeticDtos: CosmeticDto[] = allCosmetics.map((cos) => {
    const unlockAch = cos.unlockAchievementId
      ? achMap.get(cos.unlockAchievementId)
      : undefined;
    const unlocked =
      cos.source === 'default' ||
      ownedCosmeticSet.has(cos.id) ||
      (cos.unlockAchievementId ? unlockedAchSet.has(cos.unlockAchievementId) : false);

    const equipped =
      (cos.type === 'frame' && cos.id === effectiveFrameId) ||
      (cos.type === 'card_style' && cos.id === effectiveCardStyleId) ||
      (cos.type === 'color_theme' && cos.id === effectiveColorThemeId) ||
      (cos.type === 'relic' && showcaseIds.includes(cos.id));

    return {
      id: cos.id,
      code: cos.code,
      type: cos.type,
      name: cos.name,
      description: cos.description,
      previewKey: cos.previewKey,
      source: cos.source,
      priceChapas: cos.priceChapas,
      unlocked,
      equipped,
      unlockAchievementId: cos.unlockAchievementId,
      unlockAchievementName: unlockAch?.name ?? null,
      metadata: parseCosmeticMetadata(cos.metadataJson),
    };
  });

  const cosmeticById = new Map(cosmeticDtos.map((c) => [c.id, c]));

  const equippedIcon = icons.find((i) => i.id === user.equippedIconId) ?? icons[0];
  const equippedTitle = titles.find((t) => t.id === user.equippedTitleId) ?? titles[0];
  const equippedFrame = effectiveFrameId ? cosmeticById.get(effectiveFrameId) ?? null : null;
  const equippedCardStyle = effectiveCardStyleId
    ? cosmeticById.get(effectiveCardStyleId) ?? null
    : null;
  const equippedColorTheme = effectiveColorThemeId
    ? cosmeticById.get(effectiveColorThemeId) ?? null
    : null;

  const showcaseRelics = showcaseIds.map((id) =>
    id ? cosmeticById.get(id) ?? null : null
  );

  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      createdAt: new Date(user.createdAt).toISOString(),
      chapas: user.chapas,
      equippedIconId: user.equippedIconId,
      equippedTitleId: user.equippedTitleId,
      equippedFrameId: effectiveFrameId,
      equippedCardStyleId: effectiveCardStyleId,
      equippedColorThemeId: effectiveColorThemeId,
      equippedIcon,
      equippedTitle,
      equippedFrame,
      equippedCardStyle,
      equippedColorTheme,
      showcaseRelics,
      flipsReadCount: user.flipsReadCount,
      profilesVisitedCount: user.profilesVisitedCount,
    },
    stats: {
      beersRegistered: userBeerRows.length,
      beersTotal: totalBeersRows.length,
      achievementsUnlocked: unlockedAchSet.size,
      achievementsTotal: allAchievements.length,
    },
    icons,
    titles,
    cosmetics: {
      frames: cosmeticDtos.filter((c) => c.type === 'frame'),
      cardStyles: cosmeticDtos.filter((c) => c.type === 'card_style'),
      relics: cosmeticDtos.filter((c) => c.type === 'relic'),
      colorThemes: cosmeticDtos.filter((c) => c.type === 'color_theme'),
    },
  };
}

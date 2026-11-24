import { and, eq, ilike, inArray, ne, or } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { getDb, schema } from '../db';
import { AuthenticatedRequest, requireAuth } from '../middleware/authMiddleware';
import { evaluateAchievements } from '../services/achievementEngine';
import { getUserAchievementsList, parseCosmeticMetadata } from '../services/profileService';
import { buildRelicPowerDto, clampRelicLevel } from '../services/relicService';
import { asyncHandler, HttpError, isUuid } from '../utils/httpError';

const router = Router();
router.use(requireAuth);

const sendRequestSchema = z
  .object({
    username: z.string().trim().min(1).optional(),
    addresseeId: z.string().trim().optional(),
  })
  .refine((data) => Boolean(data.username || data.addresseeId), {
    message: 'Debes especificar username o addresseeId.',
  });

const respondRequestSchema = z.object({
  action: z.enum(['accept', 'reject']),
});

interface FrameSummary {
  id: number;
  code: string;
  name: string;
  previewKey: string;
  metadata: Record<string, unknown> | null;
}

async function buildUserSummaryMap(userIds: string[]) {
  const db = getDb();
  if (userIds.length === 0) {
    return new Map<
      string,
      {
        id: string;
        username: string;
        equippedIcon: { id: number; name: string; imageUrl: string };
        equippedTitle: { id: number; name: string };
        equippedFrame: FrameSummary | null;
        beersCount: number;
      }
    >();
  }

  const [userRows, allIcons, allTitles, allCosmetics, userBeerRows] = await Promise.all([
    db.select().from(schema.users).where(inArray(schema.users.id, userIds)),
    db.select().from(schema.icons),
    db.select().from(schema.titles),
    db.select().from(schema.cosmetics),
    db
      .select({ userId: schema.userBeers.userId })
      .from(schema.userBeers)
      .where(inArray(schema.userBeers.userId, userIds)),
  ]);

  const iconMap = new Map(allIcons.map((i) => [i.id, i]));
  const titleMap = new Map(allTitles.map((t) => [t.id, t]));
  const cosmeticMap = new Map(allCosmetics.map((c) => [c.id, c]));
  const defaultFrame = allCosmetics.find((c) => c.type === 'frame' && c.source === 'default');
  const beerCounts = new Map<string, number>();
  for (const row of userBeerRows) {
    beerCounts.set(row.userId, (beerCounts.get(row.userId) || 0) + 1);
  }

  const result = new Map<
    string,
    {
      id: string;
      username: string;
      equippedIcon: { id: number; name: string; imageUrl: string };
      equippedTitle: { id: number; name: string };
      equippedFrame: FrameSummary | null;
      beersCount: number;
    }
  >();

  for (const u of userRows) {
    const icon = iconMap.get(u.equippedIconId) ?? {
      id: 1,
      name: 'Jarra Clásica',
      imageUrl: 'icon://mug-classic',
    };
    const title = titleMap.get(u.equippedTitleId) ?? {
      id: 1,
      name: 'Cervecero Novato',
    };
    const frameRow = (u.equippedFrameId ? cosmeticMap.get(u.equippedFrameId) : undefined) ?? defaultFrame;
    result.set(u.id, {
      id: u.id,
      username: u.username,
      equippedIcon: { id: icon.id, name: icon.name, imageUrl: icon.imageUrl },
      equippedTitle: { id: title.id, name: title.name },
      equippedFrame: frameRow
        ? {
            id: frameRow.id,
            code: frameRow.code,
            name: frameRow.name,
            previewKey: frameRow.previewKey,
            metadata: parseCosmeticMetadata(frameRow.metadataJson),
          }
        : null,
      beersCount: beerCounts.get(u.id) || 0,
    });
  }

  return result;
}

router.get(
  '/friends',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const userId = req.userId!;

    const [friendships, totalBeers] = await Promise.all([
      db
        .select()
        .from(schema.friendships)
        .where(
          and(
            eq(schema.friendships.status, 'accepted'),
            or(
              eq(schema.friendships.requesterId, userId),
              eq(schema.friendships.addresseeId, userId)
            )
          )
        ),
      db.select({ id: schema.beers.id }).from(schema.beers),
    ]);

    const friendIds = friendships.map((f) =>
      f.requesterId === userId ? f.addresseeId : f.requesterId
    );
    const rankingUserIds = Array.from(new Set([userId, ...friendIds]));

    const [summaryMap, unlockedAchRows] = await Promise.all([
      buildUserSummaryMap(rankingUserIds),
      db
        .select({ userId: schema.userAchievements.userId })
        .from(schema.userAchievements)
        .where(
          and(
            inArray(schema.userAchievements.userId, rankingUserIds),
            eq(schema.userAchievements.unlocked, true)
          )
        ),
    ]);

    const achCounts = new Map<string, number>();
    for (const row of unlockedAchRows) {
      achCounts.set(row.userId, (achCounts.get(row.userId) || 0) + 1);
    }

    const friends = friendships
      .map((f) => {
        const friendId = f.requesterId === userId ? f.addresseeId : f.requesterId;
        const summary = summaryMap.get(friendId);
        if (!summary) return null;
        return {
          friendshipId: f.id,
          since: new Date(f.createdAt).toISOString(),
          user: {
            ...summary,
            beersTotal: totalBeers.length,
          },
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const ranking = rankingUserIds
      .map((uid) => {
        const summary = summaryMap.get(uid);
        if (!summary) return null;
        return {
          ...summary,
          beersTotal: totalBeers.length,
          achievementsUnlocked: achCounts.get(uid) || 0,
          isSelf: uid === userId,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => {
        if (b.beersCount !== a.beersCount) return b.beersCount - a.beersCount;
        if (b.achievementsUnlocked !== a.achievementsUnlocked) {
          return b.achievementsUnlocked - a.achievementsUnlocked;
        }
        return a.username.localeCompare(b.username);
      })
      .map((entry, idx) => ({
        rank: idx + 1,
        ...entry,
      }));

    res.json({ friends, ranking });
  })
);

router.get(
  '/friends/requests',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const userId = req.userId!;

    const pending = await db
      .select()
      .from(schema.friendships)
      .where(
        and(
          eq(schema.friendships.status, 'pending'),
          or(
            eq(schema.friendships.requesterId, userId),
            eq(schema.friendships.addresseeId, userId)
          )
        )
      );

    const otherIds = Array.from(
      new Set(
        pending.map((f) => (f.requesterId === userId ? f.addresseeId : f.requesterId))
      )
    );
    const summaryMap = await buildUserSummaryMap(otherIds);

    const received = pending
      .filter((f) => f.addresseeId === userId)
      .map((f) => ({
        id: f.id,
        createdAt: new Date(f.createdAt).toISOString(),
        user: summaryMap.get(f.requesterId) || null,
      }))
      .filter((r) => r.user !== null);

    const sent = pending
      .filter((f) => f.requesterId === userId)
      .map((f) => ({
        id: f.id,
        createdAt: new Date(f.createdAt).toISOString(),
        user: summaryMap.get(f.addresseeId) || null,
      }))
      .filter((s) => s.user !== null);

    res.json({ received, sent });
  })
);

router.get(
  '/users/search',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const q = String(req.query.q || '').trim();
    if (q.length < 1) {
      res.json({ users: [] });
      return;
    }

    const db = getDb();
    const userId = req.userId!;

    const matchedUsers = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(and(ne(schema.users.id, userId), ilike(schema.users.username, `%${q}%`)))
      .limit(20);

    const targetIds = matchedUsers.map((u) => u.id);
    if (targetIds.length === 0) {
      res.json({ users: [] });
      return;
    }

    const [summaryMap, relations] = await Promise.all([
      buildUserSummaryMap(targetIds),
      db
        .select()
        .from(schema.friendships)
        .where(
          or(
            and(
              eq(schema.friendships.requesterId, userId),
              inArray(schema.friendships.addresseeId, targetIds)
            ),
            and(
              eq(schema.friendships.addresseeId, userId),
              inArray(schema.friendships.requesterId, targetIds)
            )
          )
        ),
    ]);

    const relationByUserId = new Map<
      string,
      { friendshipId: string; status: string; direction: 'sent' | 'received' }
    >();
    for (const rel of relations) {
      const otherId = rel.requesterId === userId ? rel.addresseeId : rel.requesterId;
      relationByUserId.set(otherId, {
        friendshipId: rel.id,
        status: rel.status,
        direction: rel.requesterId === userId ? 'sent' : 'received',
      });
    }

    const users = targetIds
      .map((id) => {
        const summary = summaryMap.get(id);
        if (!summary) return null;
        const rel = relationByUserId.get(id);
        return {
          ...summary,
          relationshipStatus: rel ? rel.status : 'none',
          relationshipDirection: rel?.direction ?? null,
          friendshipId: rel?.friendshipId ?? null,
        };
      })
      .filter((u): u is NonNullable<typeof u> => u !== null);

    res.json({ users });
  })
);

router.post(
  '/friends/request',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = sendRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message || 'Datos inválidos.');
    }

    const db = getDb();
    const userId = req.userId!;

    let targetUser: typeof schema.users.$inferSelect | undefined;
    if (parsed.data.addresseeId) {
      if (!isUuid(parsed.data.addresseeId)) {
        throw new HttpError(400, 'ID de usuario inválido.');
      }
      const [found] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, parsed.data.addresseeId));
      targetUser = found;
    } else if (parsed.data.username) {
      const [found] = await db
        .select()
        .from(schema.users)
        .where(ilike(schema.users.username, parsed.data.username));
      targetUser = found;
    }

    if (!targetUser) {
      throw new HttpError(404, 'No existe ningún usuario con ese nombre.');
    }
    if (targetUser.id === userId) {
      throw new HttpError(400, 'No puedes enviarte una solicitud de amistad a ti mismo.');
    }

    const [existing] = await db
      .select()
      .from(schema.friendships)
      .where(
        or(
          and(
            eq(schema.friendships.requesterId, userId),
            eq(schema.friendships.addresseeId, targetUser.id)
          ),
          and(
            eq(schema.friendships.requesterId, targetUser.id),
            eq(schema.friendships.addresseeId, userId)
          )
        )
      );

    if (existing) {
      if (existing.status === 'accepted') {
        throw new HttpError(409, 'Este usuario ya forma parte de tu lista de amigos.');
      }
      if (existing.status === 'pending') {
        if (existing.requesterId === userId) {
          throw new HttpError(409, 'Ya has enviado una solicitud pendiente a este usuario.');
        }
        throw new HttpError(
          409,
          'Este usuario ya te ha enviado una solicitud. Acéptala en la pestaña Solicitudes.'
        );
      }

      // Si fue rechazada anteriormente, permitir reenviarla
      const [reopened] = await db
        .update(schema.friendships)
        .set({
          requesterId: userId,
          addresseeId: targetUser.id,
          status: 'pending',
          createdAt: new Date(),
        })
        .where(eq(schema.friendships.id, existing.id))
        .returning();

      res.status(201).json({ friendship: reopened });
      return;
    }

    const [created] = await db
      .insert(schema.friendships)
      .values({
        requesterId: userId,
        addresseeId: targetUser.id,
        status: 'pending',
      })
      .returning();

    res.status(201).json({ friendship: created });
  })
);

router.patch(
  '/friends/request/:id',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const requestId = String(req.params.id || '');
    if (!isUuid(requestId)) {
      throw new HttpError(400, 'ID de solicitud inválido.');
    }

    const parsed = respondRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, 'La acción debe ser accept o reject.');
    }

    const db = getDb();
    const userId = req.userId!;

    const [friendship] = await db
      .select()
      .from(schema.friendships)
      .where(eq(schema.friendships.id, requestId));

    if (!friendship) {
      throw new HttpError(404, 'Solicitud de amistad no encontrada.');
    }
    if (friendship.addresseeId !== userId) {
      throw new HttpError(403, 'Solo el destinatario puede responder a esta solicitud.');
    }
    if (friendship.status !== 'pending') {
      throw new HttpError(409, 'Esta solicitud ya fue respondida.');
    }

    const newStatus = parsed.data.action === 'accept' ? 'accepted' : 'rejected';
    const [updated] = await db
      .update(schema.friendships)
      .set({ status: newStatus })
      .where(eq(schema.friendships.id, friendship.id))
      .returning();

    let newlyUnlocked: Awaited<ReturnType<typeof evaluateAchievements>> = [];
    if (newStatus === 'accepted') {
      const [userUnlocked] = await Promise.all([
        evaluateAchievements(db, userId),
        evaluateAchievements(db, friendship.requesterId),
      ]);
      newlyUnlocked = userUnlocked;
    }

    res.json({
      friendship: updated,
      newlyUnlocked,
    });
  })
);

router.delete(
  '/friends/:id',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const paramId = String(req.params.id || '');
    if (!isUuid(paramId)) {
      throw new HttpError(400, 'ID de amistad inválido.');
    }

    const db = getDb();
    const userId = req.userId!;

    const [friendship] = await db
      .select()
      .from(schema.friendships)
      .where(
        or(
          and(
            eq(schema.friendships.id, paramId),
            or(
              eq(schema.friendships.requesterId, userId),
              eq(schema.friendships.addresseeId, userId)
            )
          ),
          and(
            eq(schema.friendships.requesterId, userId),
            eq(schema.friendships.addresseeId, paramId)
          ),
          and(
            eq(schema.friendships.requesterId, paramId),
            eq(schema.friendships.addresseeId, userId)
          )
        )
      );

    if (!friendship) {
      throw new HttpError(404, 'Amistad o solicitud no encontrada.');
    }

    await db.delete(schema.friendships).where(eq(schema.friendships.id, friendship.id));

    res.json({ ok: true });
  })
);

router.get(
  '/users/:id/profile',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const targetUserId = String(req.params.id || '');
    if (!isUuid(targetUserId)) {
      throw new HttpError(400, 'ID de usuario inválido.');
    }

    const db = getDb();
    const viewerId = req.userId!;

    const [targetUser] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, targetUserId));

    if (!targetUser) {
      throw new HttpError(404, 'Usuario no encontrado.');
    }

    // Comprobar si son amigos aceptados
    let isFriend = false;
    if (viewerId !== targetUserId) {
      const [friendship] = await db
        .select({ id: schema.friendships.id })
        .from(schema.friendships)
        .where(
          and(
            eq(schema.friendships.status, 'accepted'),
            or(
              and(
                eq(schema.friendships.requesterId, viewerId),
                eq(schema.friendships.addresseeId, targetUserId)
              ),
              and(
                eq(schema.friendships.requesterId, targetUserId),
                eq(schema.friendships.addresseeId, viewerId)
              )
            )
          )
        );
      isFriend = Boolean(friendship);
    }

    let newlyUnlocked: Awaited<ReturnType<typeof evaluateAchievements>> = [];
    if (isFriend) {
      await db
        .insert(schema.userProfileVisits)
        .values({ visitorId: viewerId, visitedUserId: targetUserId })
        .onConflictDoNothing();

      const visits = await db
        .select({ visitedUserId: schema.userProfileVisits.visitedUserId })
        .from(schema.userProfileVisits)
        .where(eq(schema.userProfileVisits.visitorId, viewerId));

      await db
        .update(schema.users)
        .set({ profilesVisitedCount: visits.length })
        .where(eq(schema.users.id, viewerId));

      newlyUnlocked = await evaluateAchievements(db, viewerId);
    }

    const [iconRows, titleRows, allCosmetics, targetOwnedCosmetics, targetBeers, viewerBeers, totalBeers, achData] =
      await Promise.all([
        db.select().from(schema.icons).where(eq(schema.icons.id, targetUser.equippedIconId)),
        db.select().from(schema.titles).where(eq(schema.titles.id, targetUser.equippedTitleId)),
        db.select().from(schema.cosmetics),
        db
          .select({ cosmeticId: schema.userCosmetics.cosmeticId, level: schema.userCosmetics.level })
          .from(schema.userCosmetics)
          .where(eq(schema.userCosmetics.userId, targetUserId)),
        db
          .select({
            beerId: schema.beers.id,
            name: schema.beers.name,
            format: schema.beers.format,
            brandName: schema.brands.name,
          })
          .from(schema.userBeers)
          .innerJoin(schema.beers, eq(schema.userBeers.beerId, schema.beers.id))
          .innerJoin(schema.brands, eq(schema.beers.brandId, schema.brands.id))
          .where(eq(schema.userBeers.userId, targetUserId)),
        db
          .select({ beerId: schema.userBeers.beerId })
          .from(schema.userBeers)
          .where(eq(schema.userBeers.userId, viewerId)),
        db.select({ id: schema.beers.id }).from(schema.beers),
        getUserAchievementsList(db, targetUserId),
      ]);

    const cosmeticMap = new Map(allCosmetics.map((c) => [c.id, c]));
    const targetLevelMap = new Map(
      targetOwnedCosmetics.map((r) => [r.cosmeticId, clampRelicLevel(r.level)])
    );
    const serializeCosmetic = (c: typeof allCosmetics[number] | undefined) =>
      c
        ? {
            id: c.id,
            code: c.code,
            type: c.type,
            name: c.name,
            description: c.description,
            previewKey: c.previewKey,
            source: c.source,
            priceChapas: c.priceChapas,
            unlocked: true,
            equipped: true,
            unlockAchievementId: c.unlockAchievementId,
            unlockAchievementName: null,
            metadata: parseCosmeticMetadata(c.metadataJson),
            relicPower:
              c.type === 'relic'
                ? buildRelicPowerDto(c.code, targetLevelMap.get(c.id) ?? 1)
                : null,
          }
        : null;

    const defaultFrame = allCosmetics.find((c) => c.type === 'frame' && c.source === 'default');
    const defaultCardStyle = allCosmetics.find(
      (c) => c.type === 'card_style' && c.source === 'default'
    );
    const defaultColorTheme = allCosmetics.find(
      (c) => c.type === 'color_theme' && c.source === 'default'
    );

    const equippedFrame = serializeCosmetic(
      (targetUser.equippedFrameId ? cosmeticMap.get(targetUser.equippedFrameId) : undefined) ??
        defaultFrame
    );
    const equippedCardStyle = serializeCosmetic(
      (targetUser.equippedCardStyleId
        ? cosmeticMap.get(targetUser.equippedCardStyleId)
        : undefined) ?? defaultCardStyle
    );
    const equippedColorTheme = serializeCosmetic(
      (targetUser.equippedColorThemeId
        ? cosmeticMap.get(targetUser.equippedColorThemeId)
        : undefined) ?? defaultColorTheme
    );
    const showcaseRelics = [
      targetUser.showcaseSlot1Id,
      targetUser.showcaseSlot2Id,
      targetUser.showcaseSlot3Id,
    ].map((cid) => serializeCosmetic(cid ? cosmeticMap.get(cid) : undefined));

    const viewerSet = new Set(viewerBeers.map((b) => b.beerId));
    const targetSet = new Set(targetBeers.map((b) => b.beerId));

    const commonBeers = targetBeers.filter((b) => viewerSet.has(b.beerId));
    const onlyTargetBeers = targetBeers.filter((b) => !viewerSet.has(b.beerId));
    const onlyViewerBeersCount = viewerBeers.filter((b) => !targetSet.has(b.beerId)).length;

    res.json({
      user: {
        id: targetUser.id,
        username: targetUser.username,
        createdAt: new Date(targetUser.createdAt).toISOString(),
        equippedIcon: iconRows[0]
          ? {
              id: iconRows[0].id,
              name: iconRows[0].name,
              imageUrl: iconRows[0].imageUrl,
            }
          : null,
        equippedTitle: titleRows[0]
          ? {
              id: titleRows[0].id,
              name: titleRows[0].name,
            }
          : null,
        equippedFrame,
        equippedCardStyle,
        equippedColorTheme,
        showcaseRelics,
      },
      isFriend,
      beerdexProgress: {
        registeredCount: targetBeers.length,
        totalCount: totalBeers.length,
      },
      comparison: {
        commonBeersCount: commonBeers.length,
        onlyViewerBeersCount,
        onlyTargetBeersCount: onlyTargetBeers.length,
        commonBeers: commonBeers.slice(0, 12),
        onlyTargetBeers: onlyTargetBeers.slice(0, 12),
      },
      achievements: achData.achievements,
      achievementsSummary: {
        unlockedCount: achData.unlockedCount,
        totalCount: achData.totalCount,
      },
      newlyUnlocked,
    });
  })
);

export default router;

import { and, asc, desc, eq, gt, ilike, inArray, or, sql } from 'drizzle-orm';
import { AppDatabase, schema } from '../db';
import { HttpError } from '../utils/httpError';
import { NewlyUnlockedAchievement } from './achievementEngine';
import {
  buildTabernaMembersDto,
  computeMissionStats,
  GAME_META,
  getMadridMonthKey,
  getNextLevelThreshold,
  hydrateMissionDto,
  TABERNA_COOLDOWN_HOURS,
  TABERNA_FOUNDATION_COST,
  TABERNA_MAX_MEMBERS,
  TabernaMissionConfig,
  TabernaMissionDto,
  TabernaMissionProgress,
  TabernaRequestDto,
  TabernaRole,
  TabernaSummaryDto,
  TabernaVisibility,
  USER_MAX_TABERNAS,
} from './tabernaHelpers';
import {
  closePreviousMonthIfNeeded,
  ensureCurrentMission,
  evaluateTabernaAchievements,
} from './tabernaMissionEngine';
import { buildSharedUserSummaryMap } from './userSummaryService';

export * from './tabernaHelpers';
export * from './tabernaMissionEngine';

async function serializeTabernaSummaries(
  db: AppDatabase,
  tabernaRows: Array<typeof schema.tabernas.$inferSelect>,
  userId: string
): Promise<TabernaSummaryDto[]> {
  if (tabernaRows.length === 0) return [];
  const month = getMadridMonthKey();
  await closePreviousMonthIfNeeded(db, month);

  const tabernaIds = tabernaRows.map((t) => t.id);
  const now = new Date();

  const [allMembers, activeMissions, userRequests, userCooldowns] = await Promise.all([
    db
      .select({
        tabernaId: schema.tabernaMembers.tabernaId,
        userId: schema.tabernaMembers.userId,
        role: schema.tabernaMembers.role,
      })
      .from(schema.tabernaMembers)
      .where(inArray(schema.tabernaMembers.tabernaId, tabernaIds)),
    db
      .select()
      .from(schema.tabernaMissions)
      .where(
        and(
          inArray(schema.tabernaMissions.tabernaId, tabernaIds),
          eq(schema.tabernaMissions.month, month)
        )
      ),
    db
      .select()
      .from(schema.tabernaRequests)
      .where(
        and(
          inArray(schema.tabernaRequests.tabernaId, tabernaIds),
          eq(schema.tabernaRequests.userId, userId),
          eq(schema.tabernaRequests.status, 'pending')
        )
      ),
    db
      .select()
      .from(schema.tabernaCooldowns)
      .where(
        and(
          inArray(schema.tabernaCooldowns.tabernaId, tabernaIds),
          eq(schema.tabernaCooldowns.userId, userId),
          gt(schema.tabernaCooldowns.until, now)
        )
      ),
  ]);

  const countMap = new Map<string, number>();
  const myRoleMap = new Map<string, TabernaRole>();
  for (const m of allMembers) {
    countMap.set(m.tabernaId, (countMap.get(m.tabernaId) || 0) + 1);
    if (m.userId === userId) {
      myRoleMap.set(m.tabernaId, m.role);
    }
  }

  const missionMap = new Map(activeMissions.map((m) => [m.tabernaId, m]));
  const reqMap = new Map(userRequests.map((r) => [r.tabernaId, r.id]));
  const cooldownMap = new Map(
    userCooldowns.map((c) => [c.tabernaId, new Date(c.until).toISOString()])
  );

  return tabernaRows.map((t) => {
    const mCount = countMap.get(t.id) || 0;
    const mission = missionMap.get(t.id);
    let currentMission: TabernaSummaryDto['currentMission'] = null;
    if (mission) {
      const stats = computeMissionStats(
        mission.gameType,
        (mission.config || {}) as TabernaMissionConfig,
        (mission.progress || {}) as TabernaMissionProgress,
        mCount
      );
      currentMission = {
        id: mission.id,
        month: mission.month,
        gameType: mission.gameType,
        title: GAME_META[mission.gameType].title,
        status: mission.status,
        completionPct: stats.completionPct,
      };
    }

    return {
      id: t.id,
      name: t.name,
      description: t.description,
      visibility: t.visibility,
      minBeers: t.minBeers,
      leaderId: t.leaderId,
      founderId: t.founderId,
      level: t.level,
      points: t.points,
      nextLevelPoints: getNextLevelThreshold(t.level),
      memberCount: mCount,
      maxMembers: TABERNA_MAX_MEMBERS,
      myRole: myRoleMap.get(t.id) ?? null,
      pendingRequestId: reqMap.get(t.id) ?? null,
      cooldownUntil: cooldownMap.get(t.id) ?? null,
      currentMission,
      createdAt: new Date(t.createdAt).toISOString(),
    };
  });
}

export async function listMyTabernas(
  db: AppDatabase,
  userId: string
): Promise<TabernaSummaryDto[]> {
  const memberships = await db
    .select({ tabernaId: schema.tabernaMembers.tabernaId })
    .from(schema.tabernaMembers)
    .where(eq(schema.tabernaMembers.userId, userId));

  if (memberships.length === 0) return [];
  const rows = await db
    .select()
    .from(schema.tabernas)
    .where(
      inArray(
        schema.tabernas.id,
        memberships.map((m) => m.tabernaId)
      )
    )
    .orderBy(desc(schema.tabernas.level), desc(schema.tabernas.points), asc(schema.tabernas.name));

  return serializeTabernaSummaries(db, rows, userId);
}

export async function exploreTabernas(
  db: AppDatabase,
  userId: string,
  query = ''
): Promise<TabernaSummaryDto[]> {
  const trimmed = query.trim();
  const rows = await db
    .select()
    .from(schema.tabernas)
    .where(
      trimmed
        ? or(
            ilike(schema.tabernas.name, `%${trimmed}%`),
            ilike(schema.tabernas.description, `%${trimmed}%`)
          )
        : undefined
    )
    .orderBy(desc(schema.tabernas.level), desc(schema.tabernas.points), asc(schema.tabernas.createdAt))
    .limit(50);

  return serializeTabernaSummaries(db, rows, userId);
}

export async function createTaberna(
  db: AppDatabase,
  userId: string,
  input: {
    name: string;
    description: string;
    visibility: TabernaVisibility;
    minBeers: number;
  }
): Promise<{
  taberna: TabernaSummaryDto;
  newBalance: number;
  newlyUnlocked: NewlyUnlockedAchievement[];
}> {
  const cleanName = input.name.trim();
  const cleanDesc = input.description.trim();

  const myMemberships = await db
    .select({ tabernaId: schema.tabernaMembers.tabernaId })
    .from(schema.tabernaMembers)
    .where(eq(schema.tabernaMembers.userId, userId));

  if (myMemberships.length >= USER_MAX_TABERNAS) {
    throw new HttpError(
      400,
      `Ya perteneces al máximo de ${USER_MAX_TABERNAS} Tabernas.`
    );
  }

  const [dupName] = await db
    .select({ id: schema.tabernas.id })
    .from(schema.tabernas)
    .where(sql`lower(${schema.tabernas.name}) = lower(${cleanName})`);

  if (dupName) {
    throw new HttpError(409, 'Ya existe una Taberna con ese nombre.');
  }

  // Cobro atómico condicional de 100 Chapas
  const deducted = await db
    .update(schema.users)
    .set({ chapas: sql`${schema.users.chapas} - ${TABERNA_FOUNDATION_COST}` })
    .where(
      and(
        eq(schema.users.id, userId),
        sql`${schema.users.chapas} >= ${TABERNA_FOUNDATION_COST}`
      )
    )
    .returning({ chapas: schema.users.chapas });

  if (deducted.length === 0) {
    throw new HttpError(
      400,
      `Necesitas ${TABERNA_FOUNDATION_COST} Chapas para fundar una Taberna.`
    );
  }

  let createdTaberna: typeof schema.tabernas.$inferSelect;
  try {
    const [inserted] = await db
      .insert(schema.tabernas)
      .values({
        name: cleanName,
        description: cleanDesc,
        visibility: input.visibility,
        minBeers: input.minBeers,
        leaderId: userId,
        founderId: userId,
        level: 1,
        points: 0,
      })
      .returning();
    createdTaberna = inserted;
  } catch (err) {
    // Reembolso compensatorio si hubo carrera por nombre único
    await db
      .update(schema.users)
      .set({ chapas: sql`${schema.users.chapas} + ${TABERNA_FOUNDATION_COST}` })
      .where(eq(schema.users.id, userId));
    const msg = err instanceof Error ? err.message : '';
    if (msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('duplicate')) {
      throw new HttpError(409, 'Ya existe una Taberna con ese nombre.');
    }
    throw err;
  }

  await db.insert(schema.tabernaMembers).values({
    tabernaId: createdTaberna.id,
    userId,
    role: 'leader',
  });

  await ensureCurrentMission(db, createdTaberna.id);
  const newlyUnlocked = await evaluateTabernaAchievements(db, userId);

  const [freshUser] = await db
    .select({ chapas: schema.users.chapas })
    .from(schema.users)
    .where(eq(schema.users.id, userId));

  const [summary] = await serializeTabernaSummaries(db, [createdTaberna], userId);
  return {
    taberna: summary,
    newBalance: freshUser?.chapas ?? deducted[0].chapas,
    newlyUnlocked,
  };
}

export async function getTabernaDetail(
  db: AppDatabase,
  tabernaId: string,
  userId: string
) {
  const [taberna] = await db
    .select()
    .from(schema.tabernas)
    .where(eq(schema.tabernas.id, tabernaId));

  if (!taberna) {
    throw new HttpError(404, 'Taberna no encontrada.');
  }

  const missionRow = await ensureCurrentMission(db, tabernaId);
  const [members, summaryArr, userBeers] = await Promise.all([
    buildTabernaMembersDto(db, tabernaId),
    serializeTabernaSummaries(db, [taberna], userId),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.userBeers)
      .where(eq(schema.userBeers.userId, userId)),
  ]);

  const myMember = members.find((m) => m.userId === userId) ?? null;
  const missionDto = await hydrateMissionDto(db, missionRow, members.length);

  let pendingRequestsCount = 0;
  if (myMember?.role === 'leader') {
    const reqs = await db
      .select({ id: schema.tabernaRequests.id })
      .from(schema.tabernaRequests)
      .where(
        and(
          eq(schema.tabernaRequests.tabernaId, tabernaId),
          eq(schema.tabernaRequests.status, 'pending')
        )
      );
    pendingRequestsCount = reqs.length;
  }

  return {
    taberna: summaryArr[0],
    members,
    mission: missionDto,
    myRole: myMember?.role ?? null,
    myBeersCount: Number(userBeers[0]?.count) || 0,
    pendingRequestsCount,
  };
}

export async function updateTaberna(
  db: AppDatabase,
  tabernaId: string,
  userId: string,
  patch: {
    description?: string;
    visibility?: TabernaVisibility;
    minBeers?: number;
  }
): Promise<TabernaSummaryDto> {
  const [taberna] = await db
    .select()
    .from(schema.tabernas)
    .where(eq(schema.tabernas.id, tabernaId));

  if (!taberna) {
    throw new HttpError(404, 'Taberna no encontrada.');
  }
  if (taberna.leaderId !== userId) {
    throw new HttpError(403, 'Solo el líder puede editar la Taberna.');
  }

  const updates: Partial<typeof schema.tabernas.$inferInsert> = {};
  if (patch.description !== undefined) updates.description = patch.description.trim();
  if (patch.visibility !== undefined) updates.visibility = patch.visibility;
  if (patch.minBeers !== undefined) updates.minBeers = patch.minBeers;

  const [updated] =
    Object.keys(updates).length > 0
      ? await db
          .update(schema.tabernas)
          .set(updates)
          .where(eq(schema.tabernas.id, tabernaId))
          .returning()
      : [taberna];

  const [summary] = await serializeTabernaSummaries(db, [updated], userId);
  return summary;
}

export async function deleteTaberna(
  db: AppDatabase,
  tabernaId: string,
  userId: string
): Promise<{ ok: boolean }> {
  const [taberna] = await db
    .select()
    .from(schema.tabernas)
    .where(eq(schema.tabernas.id, tabernaId));

  if (!taberna) {
    throw new HttpError(404, 'Taberna no encontrada.');
  }
  if (taberna.leaderId !== userId) {
    throw new HttpError(403, 'Solo el líder puede eliminar la Taberna.');
  }

  await db.delete(schema.tabernas).where(eq(schema.tabernas.id, tabernaId));
  return { ok: true };
}

async function checkEligibilityToEnterTaberna(
  db: AppDatabase,
  taberna: typeof schema.tabernas.$inferSelect,
  userId: string
): Promise<void> {
  const [existingMember, myMemberships, tabernaMembers, userBeers, cooldown] =
    await Promise.all([
      db
        .select({ userId: schema.tabernaMembers.userId })
        .from(schema.tabernaMembers)
        .where(
          and(
            eq(schema.tabernaMembers.tabernaId, taberna.id),
            eq(schema.tabernaMembers.userId, userId)
          )
        ),
      db
        .select({ tabernaId: schema.tabernaMembers.tabernaId })
        .from(schema.tabernaMembers)
        .where(eq(schema.tabernaMembers.userId, userId)),
      db
        .select({ userId: schema.tabernaMembers.userId })
        .from(schema.tabernaMembers)
        .where(eq(schema.tabernaMembers.tabernaId, taberna.id)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.userBeers)
        .where(eq(schema.userBeers.userId, userId)),
      db
        .select()
        .from(schema.tabernaCooldowns)
        .where(
          and(
            eq(schema.tabernaCooldowns.tabernaId, taberna.id),
            eq(schema.tabernaCooldowns.userId, userId),
            gt(schema.tabernaCooldowns.until, new Date())
          )
        ),
    ]);

  if (existingMember.length > 0) {
    throw new HttpError(409, 'Ya eres miembro de esta Taberna.');
  }
  if (cooldown.length > 0) {
    throw new HttpError(
      403,
      `Debes esperar ${TABERNA_COOLDOWN_HOURS} horas tras salir o ser expulsado para volver a solicitar acceso.`
    );
  }
  if (myMemberships.length >= USER_MAX_TABERNAS) {
    throw new HttpError(
      400,
      `Has alcanzado el límite de ${USER_MAX_TABERNAS} Tabernas por usuario.`
    );
  }
  if (tabernaMembers.length >= TABERNA_MAX_MEMBERS) {
    throw new HttpError(
      409,
      `Esta Taberna ya tiene el aforo máximo de ${TABERNA_MAX_MEMBERS} miembros.`
    );
  }
  const userBeersCount = Number(userBeers[0]?.count) || 0;
  if (userBeersCount < taberna.minBeers) {
    throw new HttpError(
      403,
      `Esta Taberna exige al menos ${taberna.minBeers} cervezas registradas (tienes ${userBeersCount}).`
    );
  }
}

export async function joinTaberna(
  db: AppDatabase,
  tabernaId: string,
  userId: string
): Promise<{
  joined: boolean;
  requested: boolean;
  requestId?: string;
  newlyUnlocked: NewlyUnlockedAchievement[];
}> {
  const [taberna] = await db
    .select()
    .from(schema.tabernas)
    .where(eq(schema.tabernas.id, tabernaId));

  if (!taberna) {
    throw new HttpError(404, 'Taberna no encontrada.');
  }

  await checkEligibilityToEnterTaberna(db, taberna, userId);

  if (taberna.visibility === 'public') {
    await db
      .insert(schema.tabernaMembers)
      .values({
        tabernaId,
        userId,
        role: 'member',
      })
      .onConflictDoNothing();

    await db
      .delete(schema.tabernaRequests)
      .where(
        and(
          eq(schema.tabernaRequests.tabernaId, tabernaId),
          eq(schema.tabernaRequests.userId, userId),
          eq(schema.tabernaRequests.status, 'pending')
        )
      );

    await ensureCurrentMission(db, tabernaId);

    const allMembers = await db
      .select({ userId: schema.tabernaMembers.userId })
      .from(schema.tabernaMembers)
      .where(eq(schema.tabernaMembers.tabernaId, tabernaId));

    let userNewlyUnlocked: NewlyUnlockedAchievement[] = [];
    for (const m of allMembers) {
      const res = await evaluateTabernaAchievements(db, m.userId);
      if (m.userId === userId) userNewlyUnlocked = res;
    }

    return { joined: true, requested: false, newlyUnlocked: userNewlyUnlocked };
  }

  // Privada -> solicitud
  const [existingReq] = await db
    .select()
    .from(schema.tabernaRequests)
    .where(
      and(
        eq(schema.tabernaRequests.tabernaId, tabernaId),
        eq(schema.tabernaRequests.userId, userId),
        eq(schema.tabernaRequests.status, 'pending')
      )
    );

  if (existingReq) {
    throw new HttpError(409, 'Ya tienes una solicitud pendiente en esta Taberna.');
  }

  const [reqRow] = await db
    .insert(schema.tabernaRequests)
    .values({
      tabernaId,
      userId,
      status: 'pending',
    })
    .returning();

  return {
    joined: false,
    requested: true,
    requestId: reqRow.id,
    newlyUnlocked: [],
  };
}

export async function leaveTaberna(
  db: AppDatabase,
  tabernaId: string,
  userId: string
): Promise<{
  ok: boolean;
  deletedTaberna: boolean;
  newLeaderId: string | null;
}> {
  const [taberna] = await db
    .select()
    .from(schema.tabernas)
    .where(eq(schema.tabernas.id, tabernaId));

  if (!taberna) {
    throw new HttpError(404, 'Taberna no encontrada.');
  }

  const [membership] = await db
    .select()
    .from(schema.tabernaMembers)
    .where(
      and(
        eq(schema.tabernaMembers.tabernaId, tabernaId),
        eq(schema.tabernaMembers.userId, userId)
      )
    );

  if (!membership) {
    throw new HttpError(404, 'No eres miembro de esta Taberna.');
  }

  await db
    .delete(schema.tabernaMembers)
    .where(
      and(
        eq(schema.tabernaMembers.tabernaId, tabernaId),
        eq(schema.tabernaMembers.userId, userId)
      )
    );

  const remaining = await db
    .select()
    .from(schema.tabernaMembers)
    .where(eq(schema.tabernaMembers.tabernaId, tabernaId))
    .orderBy(asc(schema.tabernaMembers.joinedAt));

  if (remaining.length === 0) {
    await db.delete(schema.tabernas).where(eq(schema.tabernas.id, tabernaId));
    return { ok: true, deletedTaberna: true, newLeaderId: null };
  }

  const cooldownUntil = new Date(Date.now() + TABERNA_COOLDOWN_HOURS * 60 * 60 * 1000);
  await db
    .insert(schema.tabernaCooldowns)
    .values({ tabernaId, userId, until: cooldownUntil })
    .onConflictDoUpdate({
      target: [schema.tabernaCooldowns.tabernaId, schema.tabernaCooldowns.userId],
      set: { until: cooldownUntil },
    });

  let newLeaderId: string | null = taberna.leaderId;
  if (taberna.leaderId === userId) {
    const heir = remaining[0];
    newLeaderId = heir.userId;
    await db
      .update(schema.tabernas)
      .set({ leaderId: heir.userId })
      .where(eq(schema.tabernas.id, tabernaId));
    await db
      .update(schema.tabernaMembers)
      .set({ role: 'leader' })
      .where(
        and(
          eq(schema.tabernaMembers.tabernaId, tabernaId),
          eq(schema.tabernaMembers.userId, heir.userId)
        )
      );
  }

  return { ok: true, deletedTaberna: false, newLeaderId };
}

export async function listTabernaRequests(
  db: AppDatabase,
  tabernaId: string,
  userId: string
): Promise<TabernaRequestDto[]> {
  const [taberna] = await db
    .select()
    .from(schema.tabernas)
    .where(eq(schema.tabernas.id, tabernaId));

  if (!taberna) {
    throw new HttpError(404, 'Taberna no encontrada.');
  }
  if (taberna.leaderId !== userId) {
    throw new HttpError(403, 'Solo el líder puede consultar las solicitudes.');
  }

  const reqRows = await db
    .select()
    .from(schema.tabernaRequests)
    .where(
      and(
        eq(schema.tabernaRequests.tabernaId, tabernaId),
        eq(schema.tabernaRequests.status, 'pending')
      )
    )
    .orderBy(asc(schema.tabernaRequests.createdAt));

  if (reqRows.length === 0) return [];

  const summaryMap = await buildSharedUserSummaryMap(
    db,
    reqRows.map((r) => r.userId)
  );

  return reqRows.map((r) => {
    const s = summaryMap.get(r.userId);
    return {
      id: r.id,
      tabernaId: r.tabernaId,
      userId: r.userId,
      status: r.status,
      createdAt: new Date(r.createdAt).toISOString(),
      user: {
        id: r.userId,
        username: s?.username ?? 'Cervecero',
        beersCount: s?.beersCount ?? 0,
        equippedIcon: s?.equippedIcon ?? {
          id: 1,
          name: 'Jarra Clásica',
          imageUrl: 'icon://mug-classic',
        },
        equippedTitle: s?.equippedTitle ?? {
          id: 1,
          name: 'Cervecero Novato',
        },
        equippedFrame: s?.equippedFrame ?? null,
      },
    };
  });
}

export async function respondTabernaRequest(
  db: AppDatabase,
  tabernaId: string,
  requestId: string,
  leaderId: string,
  action: 'accept' | 'reject'
): Promise<{ ok: boolean; status: 'accepted' | 'rejected' }> {
  const [taberna] = await db
    .select()
    .from(schema.tabernas)
    .where(eq(schema.tabernas.id, tabernaId));

  if (!taberna) {
    throw new HttpError(404, 'Taberna no encontrada.');
  }
  if (taberna.leaderId !== leaderId) {
    throw new HttpError(403, 'Solo el líder puede gestionar las solicitudes.');
  }

  const [reqRow] = await db
    .select()
    .from(schema.tabernaRequests)
    .where(
      and(
        eq(schema.tabernaRequests.id, requestId),
        eq(schema.tabernaRequests.tabernaId, tabernaId)
      )
    );

  if (!reqRow || reqRow.status !== 'pending') {
    throw new HttpError(404, 'La solicitud no existe o ya fue procesada.');
  }

  if (action === 'reject') {
    await db
      .update(schema.tabernaRequests)
      .set({ status: 'rejected' })
      .where(eq(schema.tabernaRequests.id, requestId));
    return { ok: true, status: 'rejected' };
  }

  // Revalidar aforo, límite de 5, cooldown y requisito de cervezas al aceptar
  await checkEligibilityToEnterTaberna(db, taberna, reqRow.userId);

  await db
    .update(schema.tabernaRequests)
    .set({ status: 'accepted' })
    .where(eq(schema.tabernaRequests.id, requestId));

  await db
    .insert(schema.tabernaMembers)
    .values({
      tabernaId,
      userId: reqRow.userId,
      role: 'member',
    })
    .onConflictDoNothing();

  await ensureCurrentMission(db, tabernaId);

  const allMembers = await db
    .select({ userId: schema.tabernaMembers.userId })
    .from(schema.tabernaMembers)
    .where(eq(schema.tabernaMembers.tabernaId, tabernaId));

  await Promise.all(allMembers.map((m) => evaluateTabernaAchievements(db, m.userId)));

  return { ok: true, status: 'accepted' };
}

export async function kickTabernaMember(
  db: AppDatabase,
  tabernaId: string,
  leaderId: string,
  targetUserId: string
): Promise<{ ok: boolean }> {
  const [taberna] = await db
    .select()
    .from(schema.tabernas)
    .where(eq(schema.tabernas.id, tabernaId));

  if (!taberna) {
    throw new HttpError(404, 'Taberna no encontrada.');
  }
  if (taberna.leaderId !== leaderId) {
    throw new HttpError(403, 'Solo el líder puede expulsar miembros.');
  }
  if (targetUserId === leaderId) {
    throw new HttpError(400, 'No puedes expulsarte a ti mismo; usa Abandonar Taberna.');
  }

  const deleted = await db
    .delete(schema.tabernaMembers)
    .where(
      and(
        eq(schema.tabernaMembers.tabernaId, tabernaId),
        eq(schema.tabernaMembers.userId, targetUserId)
      )
    )
    .returning({ userId: schema.tabernaMembers.userId });

  if (deleted.length === 0) {
    throw new HttpError(404, 'El usuario indicado no pertenece a esta Taberna.');
  }

  const cooldownUntil = new Date(Date.now() + TABERNA_COOLDOWN_HOURS * 60 * 60 * 1000);
  await db
    .insert(schema.tabernaCooldowns)
    .values({ tabernaId, userId: targetUserId, until: cooldownUntil })
    .onConflictDoUpdate({
      target: [schema.tabernaCooldowns.tabernaId, schema.tabernaCooldowns.userId],
      set: { until: cooldownUntil },
    });

  return { ok: true };
}

export async function getTabernaMission(
  db: AppDatabase,
  tabernaId: string
): Promise<TabernaMissionDto> {
  const [taberna] = await db
    .select({ id: schema.tabernas.id })
    .from(schema.tabernas)
    .where(eq(schema.tabernas.id, tabernaId));

  if (!taberna) {
    throw new HttpError(404, 'Taberna no encontrada.');
  }

  const missionRow = await ensureCurrentMission(db, tabernaId);
  const members = await db
    .select({ userId: schema.tabernaMembers.userId })
    .from(schema.tabernaMembers)
    .where(eq(schema.tabernaMembers.tabernaId, tabernaId));

  return hydrateMissionDto(db, missionRow, members.length);
}

export async function getTabernaRanking(
  db: AppDatabase,
  userId: string,
  scope: 'global' | 'monthly'
) {
  const month = getMadridMonthKey();
  await closePreviousMonthIfNeeded(db, month);

  const [allTabernas, allMembers, monthMissions, myMemberships] = await Promise.all([
    db.select().from(schema.tabernas),
    db
      .select({ tabernaId: schema.tabernaMembers.tabernaId })
      .from(schema.tabernaMembers),
    db
      .select()
      .from(schema.tabernaMissions)
      .where(eq(schema.tabernaMissions.month, month)),
    db
      .select({ tabernaId: schema.tabernaMembers.tabernaId })
      .from(schema.tabernaMembers)
      .where(eq(schema.tabernaMembers.userId, userId)),
  ]);

  const memberCountMap = new Map<string, number>();
  for (const m of allMembers) {
    memberCountMap.set(m.tabernaId, (memberCountMap.get(m.tabernaId) || 0) + 1);
  }
  const missionMap = new Map(monthMissions.map((m) => [m.tabernaId, m]));
  const myTabernaSet = new Set(myMemberships.map((m) => m.tabernaId));

  const entries = allTabernas.map((t) => {
    const mission = missionMap.get(t.id);
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      visibility: t.visibility,
      level: t.level,
      points: t.points,
      monthlyPoints: mission?.pointsAwarded ?? 0,
      memberCount: memberCountMap.get(t.id) || 0,
      maxMembers: TABERNA_MAX_MEMBERS,
      isMember: myTabernaSet.has(t.id),
      currentGameType: mission?.gameType ?? null,
    };
  });

  if (scope === 'monthly') {
    entries.sort((a, b) => {
      if (b.monthlyPoints !== a.monthlyPoints) return b.monthlyPoints - a.monthlyPoints;
      if (b.level !== a.level) return b.level - a.level;
      return b.points - a.points;
    });
  } else {
    entries.sort((a, b) => {
      if (b.level !== a.level) return b.level - a.level;
      if (b.points !== a.points) return b.points - a.points;
      return b.memberCount - a.memberCount;
    });
  }

  return {
    scope,
    month,
    ranking: entries.slice(0, 50).map((entry, idx) => ({
      rank: idx + 1,
      ...entry,
    })),
  };
}


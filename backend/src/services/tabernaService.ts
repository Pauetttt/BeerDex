import { and, asc, desc, eq, gt, ilike, inArray, lt, ne, or, sql } from 'drizzle-orm';
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

export const TABERNA_FOUNDATION_COST = 100;
export const TABERNA_MAX_MEMBERS = 10;
export const USER_MAX_TABERNAS = 5;
export const TABERNA_MAX_LEVEL = 20;
export const TABERNA_COOLDOWN_HOURS = 24;

export type TabernaVisibility = 'public' | 'private';
export type TabernaRole = 'leader' | 'member';
export type TabernaGameType = 'bingo' | 'escalera' | 'ruta' | 'tridente' | 'cata';

export interface BingoCellConfig {
  index: number;
  beerId: number;
  beerName: string;
  brandName: string;
  style: string;
  abv: number;
  format: 'lata' | 'botellin' | 'litrona';
  country: string;
}

export interface EscaleraStepConfig {
  index: number;
  key: string;
  label: string;
  minAbv: number | null;
  maxAbv: number | null;
}

export interface RutaCountryConfig {
  key: string;
  name: string;
}

export interface TridenteChallengeConfig {
  id: string;
  title: string;
  description: string;
  ruleType: 'country_not_spain' | 'abv_gte' | 'style' | 'format';
  ruleValue: string | number;
}

export interface TabernaMissionConfig {
  cells?: BingoCellConfig[];
  steps?: EscaleraStepConfig[];
  countries?: RutaCountryConfig[];
  targetCount?: number;
  challenges?: TridenteChallengeConfig[];
  style?: string;
  targetTotal?: number;
}

export interface TabernaMissionProgress {
  markedCells?: Record<
    string,
    { beerId: number; userId: string; username: string; markedAt: string }
  >;
  completedLines?: string[];
  completedSteps?: Record<
    string,
    {
      beerId: number;
      beerName: string;
      abv: number;
      userId: string;
      username: string;
      completedAt: string;
    }
  >;
  currentStepIndex?: number;
  completedCountries?: Record<
    string,
    { beerId: number; beerName: string; userId: string; username: string; completedAt: string }
  >;
  memberProgress?: Record<
    string,
    {
      completedChallengeIds: string[];
      beersByChallenge: Record<
        string,
        { beerId: number; beerName: string; completedAt: string }
      >;
      completedAt: string | null;
    }
  >;
  totalCount?: number;
  leaderboard?: Record<string, { username: string; count: number; lastAt: string }>;
  flawless?: boolean;
}

export interface FrameSummaryDto {
  id: number;
  code: string;
  name: string;
  previewKey: string;
  metadata: Record<string, unknown> | null;
}

export interface TabernaMemberDto {
  userId: string;
  username: string;
  role: TabernaRole;
  joinedAt: string;
  beersCount: number;
  equippedIcon: { id: number; name: string; imageUrl: string };
  equippedTitle: { id: number; name: string };
  equippedFrame: FrameSummaryDto | null;
}

export interface TabernaContributionDto {
  id: number;
  userId: string;
  username: string;
  beerId: number;
  beerName: string;
  brandName: string;
  slotKey: string | null;
  createdAt: string;
}

export interface TabernaMissionDto {
  id: string;
  tabernaId: string;
  month: string;
  gameType: TabernaGameType;
  title: string;
  subtitle: string;
  status: 'active' | 'completed' | 'expired';
  config: TabernaMissionConfig;
  progress: TabernaMissionProgress;
  pointsAwarded: number;
  completionPct: number;
  completedCount: number;
  totalTarget: number;
  createdAt: string;
  completedAt: string | null;
  recentContributions: TabernaContributionDto[];
}

export interface TabernaSummaryDto {
  id: string;
  name: string;
  description: string;
  visibility: TabernaVisibility;
  minBeers: number;
  leaderId: string;
  founderId: string | null;
  level: number;
  points: number;
  nextLevelPoints: number | null;
  memberCount: number;
  maxMembers: number;
  myRole: TabernaRole | null;
  pendingRequestId: string | null;
  cooldownUntil: string | null;
  currentMission: {
    id: string;
    month: string;
    gameType: TabernaGameType;
    title: string;
    status: 'active' | 'completed' | 'expired';
    completionPct: number;
  } | null;
  createdAt: string;
}

export interface TabernaRequestDto {
  id: string;
  tabernaId: string;
  userId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  user: {
    id: string;
    username: string;
    beersCount: number;
    equippedIcon: { id: number; name: string; imageUrl: string };
    equippedTitle: { id: number; name: string };
    equippedFrame: FrameSummaryDto | null;
  };
}

export interface TabernaScanResultDto {
  status: 'valid' | 'already_contributed' | 'invalid' | 'mission_completed' | 'needs_variety_confirm';
  message: string;
  taberna: {
    id: string;
    name: string;
    level: number;
    points: number;
    nextLevelPoints: number | null;
  };
  beer: {
    id: number;
    brandId: number;
    brandName: string;
    name: string;
    format: 'lata' | 'botellin' | 'litrona';
    barcode: string;
    style: string;
    abv: number;
    country: string;
  };
  brandBeers?: Array<{
    id: number;
    brandId: number;
    brandName: string;
    name: string;
    format: 'lata' | 'botellin' | 'litrona';
    barcode: string;
    style: string;
    abv: number;
    country: string;
  }>;
  slotKey?: string | null;
  slotLabel?: string | null;
  milestonesReached: string[];
  chapasEarned: number;
  pointsAwarded: number;
  levelUp: {
    fromLevel: number;
    toLevel: number;
    chapasPerMember: number;
  } | null;
  newlyUnlocked: NewlyUnlockedAchievement[];
  mission: TabernaMissionDto;
}

const GAME_TYPES: TabernaGameType[] = ['bingo', 'escalera', 'ruta', 'tridente', 'cata'];

const ESCALERA_STEPS: EscaleraStepConfig[] = [
  { index: 0, key: 'step_0', label: '< 4,0° (Suave)', minAbv: null, maxAbv: 4 },
  { index: 1, key: 'step_1', label: '4,0° – 5,0°', minAbv: 4, maxAbv: 5 },
  { index: 2, key: 'step_2', label: '5,0° – 6,0°', minAbv: 5, maxAbv: 6 },
  { index: 3, key: 'step_3', label: '6,0° – 7,0°', minAbv: 6, maxAbv: 7 },
  { index: 4, key: 'step_4', label: '7,0° o más', minAbv: 7, maxAbv: null },
];

const BINGO_LINES: Array<{ key: string; label: string; indices: number[] }> = [
  { key: 'row_0', label: 'Fila 1', indices: [0, 1, 2] },
  { key: 'row_1', label: 'Fila 2', indices: [3, 4, 5] },
  { key: 'row_2', label: 'Fila 3', indices: [6, 7, 8] },
  { key: 'col_0', label: 'Columna 1', indices: [0, 3, 6] },
  { key: 'col_1', label: 'Columna 2', indices: [1, 4, 7] },
  { key: 'col_2', label: 'Columna 3', indices: [2, 5, 8] },
  { key: 'diag_0', label: 'Diagonal principal', indices: [0, 4, 8] },
  { key: 'diag_1', label: 'Diagonal inversa', indices: [2, 4, 6] },
];

const CATA_STYLES = ['Lager', 'Tostada', 'Negra', 'IPA', 'Trigo', '0,0%'] as const;

const GAME_META: Record<TabernaGameType, { title: string; subtitle: string }> = {
  bingo: {
    title: 'Bingo Cervecero 3×3',
    subtitle: 'Completad las 9 cervezas del cartón entre toda la hermandad',
  },
  escalera: {
    title: 'Escalera del Grado',
    subtitle: 'Escanead cervezas en orden creciente desde <4° hasta 7°+',
  },
  ruta: {
    title: 'Ruta Internacional',
    subtitle: 'Viajad por el mundo escaneando cervezas de los países objetivo',
  },
  tridente: {
    title: 'Tridente de la Peña',
    subtitle: 'Cada miembro debe completar los 3 retos personales del mes',
  },
  cata: {
    title: 'Cata Temática',
    subtitle: 'Sumad cervezas del estilo sorteado y competid por el Top 1',
  },
};

function parseMetadataJson(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function normalizeCountryKey(country: string): string {
  return country
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function getMadridMonthKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value ?? '2026';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  return `${year}-${month}`;
}

export function getPreviousMonthKey(monthKey: string): string {
  const [yStr, mStr] = monthKey.split('-');
  let y = Number(yStr);
  let m = Number(mStr) - 1;
  if (m <= 0) {
    m = 12;
    y -= 1;
  }
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}`;
}

export function computeLevelFromPoints(points: number): number {
  const safePts = Math.max(0, Math.floor(points));
  return Math.min(TABERNA_MAX_LEVEL, Math.floor(safePts / 500) + 1);
}

export function getNextLevelThreshold(level: number): number | null {
  if (level >= TABERNA_MAX_LEVEL) return null;
  return level * 500;
}

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function getAbvStepIndex(abv: number): number {
  if (abv < 4) return 0;
  if (abv < 5) return 1;
  if (abv < 6) return 2;
  if (abv < 7) return 3;
  return 4;
}

export function matchesBeerStyle(
  beer: { style: string; abv: number | string },
  targetStyle: string
): boolean {
  const styleLower = beer.style.toLowerCase();
  const abvNum = Number(beer.abv);
  if (targetStyle === '0,0%') {
    return abvNum === 0 || /0[,.]0|sin alcohol/i.test(beer.style);
  }
  if (targetStyle === 'Negra') {
    return /negra|stout|porter/i.test(styleLower);
  }
  if (targetStyle === 'Trigo') {
    return /trigo|weizen|wheat/i.test(styleLower);
  }
  if (targetStyle === 'IPA') {
    return /ipa/i.test(styleLower);
  }
  if (targetStyle === 'Tostada') {
    return /tostada/i.test(styleLower);
  }
  if (targetStyle === 'Lager') {
    return /lager/i.test(styleLower);
  }
  return styleLower === targetStyle.toLowerCase();
}

function matchesTridenteChallenge(
  beer: {
    country: string;
    abv: number | string;
    style: string;
    format: 'lata' | 'botellin' | 'litrona';
  },
  challenge: TridenteChallengeConfig
): boolean {
  const abvNum = Number(beer.abv);
  switch (challenge.ruleType) {
    case 'country_not_spain':
      return normalizeCountryKey(beer.country) !== String(challenge.ruleValue);
    case 'abv_gte':
      return abvNum >= Number(challenge.ruleValue);
    case 'style':
      return matchesBeerStyle(beer, String(challenge.ruleValue));
    case 'format':
      return beer.format === String(challenge.ruleValue);
    default:
      return false;
  }
}

function computeMissionStats(
  gameType: TabernaGameType,
  config: TabernaMissionConfig,
  progress: TabernaMissionProgress,
  memberCount: number
): { completedCount: number; totalTarget: number; completionPct: number } {
  if (gameType === 'bingo') {
    const total = config.cells?.length || 9;
    const done = Object.keys(progress.markedCells || {}).length;
    return {
      completedCount: done,
      totalTarget: total,
      completionPct: total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0,
    };
  }
  if (gameType === 'escalera') {
    const total = config.steps?.length || 5;
    const done = Object.keys(progress.completedSteps || {}).length;
    return {
      completedCount: done,
      totalTarget: total,
      completionPct: total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0,
    };
  }
  if (gameType === 'ruta') {
    const total = config.countries?.length || config.targetCount || 8;
    const done = Object.keys(progress.completedCountries || {}).length;
    return {
      completedCount: done,
      totalTarget: total,
      completionPct: total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0,
    };
  }
  if (gameType === 'tridente') {
    const total = Math.max(1, memberCount);
    const mp = progress.memberProgress || {};
    const needed = config.challenges?.length || 3;
    const done = Object.values(mp).filter(
      (entry) => (entry.completedChallengeIds?.length || 0) >= needed
    ).length;
    return {
      completedCount: Math.min(done, total),
      totalTarget: total,
      completionPct: Math.min(100, Math.round((done / total) * 100)),
    };
  }
  // cata
  const total = config.targetTotal || 15;
  const done = progress.totalCount || 0;
  return {
    completedCount: Math.min(done, total),
    totalTarget: total,
    completionPct: total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0,
  };
}

async function buildTabernaMembersDto(
  db: AppDatabase,
  tabernaId: string
): Promise<TabernaMemberDto[]> {
  const memberRows = await db
    .select({
      userId: schema.tabernaMembers.userId,
      role: schema.tabernaMembers.role,
      joinedAt: schema.tabernaMembers.joinedAt,
    })
    .from(schema.tabernaMembers)
    .where(eq(schema.tabernaMembers.tabernaId, tabernaId))
    .orderBy(asc(schema.tabernaMembers.joinedAt));

  if (memberRows.length === 0) return [];

  const userIds = memberRows.map((m) => m.userId);
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

  const userMap = new Map(userRows.map((u) => [u.id, u]));
  const iconMap = new Map(allIcons.map((i) => [i.id, i]));
  const titleMap = new Map(allTitles.map((t) => [t.id, t]));
  const cosmeticMap = new Map(allCosmetics.map((c) => [c.id, c]));
  const defaultFrame = allCosmetics.find((c) => c.type === 'frame' && c.source === 'default');

  const beerCounts = new Map<string, number>();
  for (const row of userBeerRows) {
    beerCounts.set(row.userId, (beerCounts.get(row.userId) || 0) + 1);
  }

  return memberRows.map((m) => {
    const u = userMap.get(m.userId);
    const icon = (u ? iconMap.get(u.equippedIconId) : undefined) ?? {
      id: 1,
      name: 'Jarra Clásica',
      imageUrl: 'icon://mug-classic',
    };
    const title = (u ? titleMap.get(u.equippedTitleId) : undefined) ?? {
      id: 1,
      name: 'Cervecero Novato',
    };
    const frameRow =
      (u?.equippedFrameId ? cosmeticMap.get(u.equippedFrameId) : undefined) ?? defaultFrame;

    return {
      userId: m.userId,
      username: u?.username ?? 'Cervecero',
      role: m.role,
      joinedAt: new Date(m.joinedAt).toISOString(),
      beersCount: beerCounts.get(m.userId) || 0,
      equippedIcon: { id: icon.id, name: icon.name, imageUrl: icon.imageUrl },
      equippedTitle: { id: title.id, name: title.name },
      equippedFrame: frameRow
        ? {
            id: frameRow.id,
            code: frameRow.code,
            name: frameRow.name,
            previewKey: frameRow.previewKey,
            metadata: parseMetadataJson(frameRow.metadataJson),
          }
        : null,
    };
  });
}

async function hydrateMissionDto(
  db: AppDatabase,
  missionRow: typeof schema.tabernaMissions.$inferSelect,
  memberCount: number
): Promise<TabernaMissionDto> {
  const config = (missionRow.config || {}) as TabernaMissionConfig;
  const progress = (missionRow.progress || {}) as TabernaMissionProgress;
  const stats = computeMissionStats(
    missionRow.gameType,
    config,
    progress,
    memberCount
  );

  const contribRows = await db
    .select({
      id: schema.tabernaContributions.id,
      userId: schema.tabernaContributions.userId,
      username: schema.users.username,
      beerId: schema.tabernaContributions.beerId,
      beerName: schema.beers.name,
      brandName: schema.brands.name,
      slotKey: schema.tabernaContributions.slotKey,
      createdAt: schema.tabernaContributions.createdAt,
    })
    .from(schema.tabernaContributions)
    .innerJoin(schema.users, eq(schema.tabernaContributions.userId, schema.users.id))
    .innerJoin(schema.beers, eq(schema.tabernaContributions.beerId, schema.beers.id))
    .innerJoin(schema.brands, eq(schema.beers.brandId, schema.brands.id))
    .where(eq(schema.tabernaContributions.missionId, missionRow.id))
    .orderBy(desc(schema.tabernaContributions.createdAt))
    .limit(15);

  const meta = GAME_META[missionRow.gameType];

  return {
    id: missionRow.id,
    tabernaId: missionRow.tabernaId,
    month: missionRow.month,
    gameType: missionRow.gameType,
    title: meta.title,
    subtitle: meta.subtitle,
    status: missionRow.status,
    config,
    progress,
    pointsAwarded: missionRow.pointsAwarded,
    completionPct: stats.completionPct,
    completedCount: stats.completedCount,
    totalTarget: stats.totalTarget,
    createdAt: new Date(missionRow.createdAt).toISOString(),
    completedAt: missionRow.completedAt
      ? new Date(missionRow.completedAt).toISOString()
      : null,
    recentContributions: contribRows.map((c) => ({
      id: c.id,
      userId: c.userId,
      username: c.username,
      beerId: c.beerId,
      beerName: c.beerName,
      brandName: c.brandName,
      slotKey: c.slotKey,
      createdAt: new Date(c.createdAt).toISOString(),
    })),
  };
}

/**
 * Evalúa los logros 101-110 para un usuario de forma idempotente y monótona.
 */
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
export async function closePreviousMonthIfNeeded(
  db: AppDatabase,
  currentMonth = getMadridMonthKey()
): Promise<void> {
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
  const catalogBeers = await db
    .select({
      id: schema.beers.id,
      name: schema.beers.name,
      brandName: schema.brands.name,
      style: schema.beers.style,
      abv: schema.beers.abv,
      format: schema.beers.format,
      country: schema.beers.country,
    })
    .from(schema.beers)
    .innerJoin(schema.brands, eq(schema.beers.brandId, schema.brands.id));

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
      .select({ id: schema.userBeers.id })
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
    myBeersCount: userBeers.length,
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
        .select({ id: schema.userBeers.id })
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
  if (userBeers.length < taberna.minBeers) {
    throw new HttpError(
      403,
      `Esta Taberna exige al menos ${taberna.minBeers} cervezas registradas (tienes ${userBeers.length}).`
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

  const userIds = reqRows.map((r) => r.userId);
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

  const userMap = new Map(userRows.map((u) => [u.id, u]));
  const iconMap = new Map(allIcons.map((i) => [i.id, i]));
  const titleMap = new Map(allTitles.map((t) => [t.id, t]));
  const cosmeticMap = new Map(allCosmetics.map((c) => [c.id, c]));
  const defaultFrame = allCosmetics.find((c) => c.type === 'frame' && c.source === 'default');

  const beerCounts = new Map<string, number>();
  for (const row of userBeerRows) {
    beerCounts.set(row.userId, (beerCounts.get(row.userId) || 0) + 1);
  }

  return reqRows.map((r) => {
    const u = userMap.get(r.userId);
    const icon = (u ? iconMap.get(u.equippedIconId) : undefined) ?? {
      id: 1,
      name: 'Jarra Clásica',
      imageUrl: 'icon://mug-classic',
    };
    const title = (u ? titleMap.get(u.equippedTitleId) : undefined) ?? {
      id: 1,
      name: 'Cervecero Novato',
    };
    const frameRow =
      (u?.equippedFrameId ? cosmeticMap.get(u.equippedFrameId) : undefined) ?? defaultFrame;

    return {
      id: r.id,
      tabernaId: r.tabernaId,
      userId: r.userId,
      status: r.status,
      createdAt: new Date(r.createdAt).toISOString(),
      user: {
        id: r.userId,
        username: u?.username ?? 'Cervecero',
        beersCount: beerCounts.get(r.userId) || 0,
        equippedIcon: { id: icon.id, name: icon.name, imageUrl: icon.imageUrl },
        equippedTitle: { id: title.id, name: title.name },
        equippedFrame: frameRow
          ? {
              id: frameRow.id,
              code: frameRow.code,
              name: frameRow.name,
              previewKey: frameRow.previewKey,
              metadata: parseMetadataJson(frameRow.metadataJson),
            }
          : null,
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

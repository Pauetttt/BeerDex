import { asc, desc, eq } from 'drizzle-orm';
import { AppDatabase, schema } from '../db';
import { NewlyUnlockedAchievement } from './achievementEngine';
import { buildSharedUserSummaryMap } from './userSummaryService';

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

export const GAME_TYPES: TabernaGameType[] = ['bingo', 'escalera', 'ruta', 'tridente', 'cata'];

export const ESCALERA_STEPS: EscaleraStepConfig[] = [
  { index: 0, key: 'step_0', label: '< 4,0° (Suave)', minAbv: null, maxAbv: 4 },
  { index: 1, key: 'step_1', label: '4,0° – 5,0°', minAbv: 4, maxAbv: 5 },
  { index: 2, key: 'step_2', label: '5,0° – 6,0°', minAbv: 5, maxAbv: 6 },
  { index: 3, key: 'step_3', label: '6,0° – 7,0°', minAbv: 6, maxAbv: 7 },
  { index: 4, key: 'step_4', label: '7,0° o más', minAbv: 7, maxAbv: null },
];

export const BINGO_LINES: Array<{ key: string; label: string; indices: number[] }> = [
  { key: 'row_0', label: 'Fila 1', indices: [0, 1, 2] },
  { key: 'row_1', label: 'Fila 2', indices: [3, 4, 5] },
  { key: 'row_2', label: 'Fila 3', indices: [6, 7, 8] },
  { key: 'col_0', label: 'Columna 1', indices: [0, 3, 6] },
  { key: 'col_1', label: 'Columna 2', indices: [1, 4, 7] },
  { key: 'col_2', label: 'Columna 3', indices: [2, 5, 8] },
  { key: 'diag_0', label: 'Diagonal principal', indices: [0, 4, 8] },
  { key: 'diag_1', label: 'Diagonal inversa', indices: [2, 4, 6] },
];

export const CATA_STYLES = ['Lager', 'Tostada', 'Negra', 'IPA', 'Trigo', '0,0%'] as const;

export const GAME_META: Record<TabernaGameType, { title: string; subtitle: string }> = {
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

export function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function pickRandom<T>(items: T[]): T {
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

export function matchesTridenteChallenge(
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

export function computeMissionStats(
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

export async function buildTabernaMembersDto(
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

  const summaryMap = await buildSharedUserSummaryMap(
    db,
    memberRows.map((m) => m.userId)
  );

  return memberRows.map((m) => {
    const s = summaryMap.get(m.userId);
    return {
      userId: m.userId,
      username: s?.username ?? 'Cervecero',
      role: m.role,
      joinedAt: new Date(m.joinedAt).toISOString(),
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
    };
  });
}

export async function hydrateMissionDto(
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

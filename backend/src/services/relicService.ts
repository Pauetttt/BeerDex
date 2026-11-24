import { and, eq, inArray } from 'drizzle-orm';
import { AppDatabase, schema } from '../db';
import { getCachedCosmetics } from './catalogCache';

export type RelicTier = 'merit' | 'common' | 'epic' | 'legendary';

export interface RelicLevelEntryDto {
  level: number;
  value: number;
  shortTag: string;
  effectSummary: string;
  upgradeCost: number | null;
}

export interface RelicPowerDto {
  tier: RelicTier;
  tierLabel: string;
  level: number;
  maxLevel: number;
  shortTag: string;
  effectSummary: string;
  nextLevelEffectSummary: string | null;
  nextUpgradeCost: number | null;
  requiresFullShowcase: boolean;
  levels: RelicLevelEntryDto[];
}

export interface ActiveRelicInstance {
  slot: 1 | 2 | 3;
  id: number;
  code: string;
  name: string;
  level: number;
}

export interface ActiveRelicsSummaryDto {
  activeCount: number;
  maxSlots: 3;
  fullShowcaseActive: boolean;
  shopDiscountPct: number;
  effects: Array<{
    slot: 1 | 2 | 3;
    relicId: number;
    code: string;
    name: string;
    tier: RelicTier;
    level: number;
    shortTag: string;
    effectSummary: string;
    active: boolean;
  }>;
}

export interface RelicBonusItem {
  code: string;
  name: string;
  level: number;
  chapasAdded: number;
  label: string;
}

export interface BeerChapasBreakdown {
  totalDirectChapas: number;
  relicBonusChapas: number;
  effectiveBrandBonus: number;
  appliedBonuses: RelicBonusItem[];
}

interface RelicConfig {
  tier: RelicTier;
  values: readonly [number, number, number, number, number];
  requiresFullShowcase?: boolean;
  formatShortTag: (val: number) => string;
  formatSummary: (val: number) => string;
}

const UPGRADE_COSTS: Record<RelicTier, readonly [number, number, number, number]> = {
  merit: [250, 500, 1000, 2000],
  common: [500, 1000, 2000, 3500],
  epic: [1500, 3000, 5000, 8000],
  legendary: [3000, 6000, 10000, 15000],
};

const TIER_LABELS: Record<RelicTier, string> = {
  merit: 'MÉRITO',
  common: 'COMÚN',
  epic: 'ÉPICA',
  legendary: 'LEGENDARIA',
};

const RELIC_CONFIGS: Record<string, RelicConfig> = {
  // ===== RELIQUIAS DE LOGROS (6) =====
  relic_cap_1900: {
    tier: 'merit',
    values: [2, 4, 6, 8, 12],
    formatShortTag: (v) => `+${v} Ch./birra`,
    formatSummary: (v) => `+${v} Chapas fijas extra por cada cerveza registrada.`,
  },
  relic_founder_coaster: {
    tier: 'merit',
    values: [20, 40, 60, 80, 100],
    formatShortTag: (v) => `+${v}% marcas`,
    formatSummary: (v) =>
      `+${v}% de Chapas en el bonus por completar cualquier marca al 100 %.`,
  },
  relic_mini_barrel: {
    tier: 'merit',
    values: [5, 10, 15, 20, 30],
    formatShortTag: (v) => `+${v} Ch. artesanal`,
    formatSummary: (v) =>
      `+${v} Chapas extra en cervezas artesanales o de abadía (IPA, Negra, Tostada o Bélgica).`,
  },
  relic_hop_medal: {
    tier: 'merit',
    values: [10, 15, 20, 30, 50],
    formatShortTag: (v) => `+${v}% logros`,
    formatSummary: (v) =>
      `+${v}% de Chapas en todas las recompensas por desbloquear logros.`,
  },
  relic_abbey_chalice: {
    tier: 'merit',
    values: [5, 10, 15, 22, 35],
    formatShortTag: (v) => `+${v} Ch. ≥7% ABV`,
    formatSummary: (v) =>
      `+${v} Chapas extra al registrar cervezas de alta graduación (≥ 7,0 % vol.).`,
  },
  relic_foam_trophy: {
    tier: 'merit',
    values: [10, 15, 20, 30, 50],
    formatShortTag: (v) => `+${v}% global`,
    formatSummary: (v) =>
      `Multiplicador global +${v}% a todas las Chapas ganadas (registros, marcas y logros).`,
  },

  // ===== RELIQUIAS DE LA BODEGA (10) =====
  relic_munich_coaster: {
    tier: 'common',
    values: [15, 25, 35, 50, 75],
    formatShortTag: (v) => `+${v}% Trigo/DE`,
    formatSummary: (v) =>
      `+${v}% de Chapas en cervezas de Trigo o centroeuropeas (Alemania / Rep. Checa).`,
  },
  relic_vintage_opener: {
    tier: 'common',
    values: [20, 35, 50, 70, 100],
    formatShortTag: (v) => `+${v}% botellín`,
    formatSummary: (v) => `+${v}% de Chapas al registrar cervezas en formato botellín.`,
  },
  relic_crystal_hop: {
    tier: 'common',
    values: [4, 8, 12, 18, 25],
    formatShortTag: (v) => `+${v} Ch. 4-5★`,
    formatSummary: (v) => `+${v} Chapas extra al registrar cervezas valoradas con 4★ o 5★.`,
  },
  relic_porcelain_mug: {
    tier: 'common',
    values: [20, 35, 50, 70, 100],
    formatShortTag: (v) => `+${v}% lata/pack`,
    formatSummary: (v) =>
      `+${v}% de Chapas al registrar cervezas en formato lata o mediante pack.`,
  },
  relic_platinum_cap: {
    tier: 'epic',
    values: [5, 10, 15, 22, 35],
    formatShortTag: (v) => `+${v} Ch. nueva`,
    formatSummary: (v) =>
      `+${v} Chapas fijas extra por cada nueva cerveza añadida a tu BeerDex.`,
  },
  relic_bronze_tap: {
    tier: 'epic',
    values: [1.5, 2, 2.5, 3, 4],
    formatShortTag: (v) => `x${v} 1ª del día`,
    formatSummary: (v) =>
      `Multiplicador x${v} en las Chapas de tu primera cerveza registrada cada día.`,
  },
  relic_bodega_key: {
    tier: 'epic',
    values: [5, 10, 15, 20, 30],
    formatShortTag: (v) => `-${v}% Bodega`,
    formatSummary: (v) =>
      `-${v}% de descuento permanente en La Bodega (iconos, títulos, marcos, cartas y temas).`,
  },
  relic_collector_barrel: {
    tier: 'epic',
    values: [40, 80, 120, 180, 250],
    formatShortTag: (v) => `+${v} Ch. marca`,
    formatSummary: (v) =>
      `+${v} Chapas fijas extra cada vez que completes cualquier marca al 100 %.`,
  },
  relic_solid_gold_hop: {
    tier: 'legendary',
    values: [15, 25, 40, 60, 100],
    formatShortTag: (v) => `+${v}% log. colecc.`,
    formatSummary: (v) =>
      `+${v}% de Chapas en logros de Colección de Cervezas y Marcas.`,
  },
  relic_royal_crown: {
    tier: 'legendary',
    values: [15, 25, 40, 60, 100],
    requiresFullShowcase: true,
    formatShortTag: (v) => `+${v}% global (3/3)`,
    formatSummary: (v) =>
      `Sinergia real: con 3 reliquias activas en vitrina, +${v}% a todas las Chapas ganadas.`,
  },
};

export function clampRelicLevel(level?: number | null): number {
  if (typeof level !== 'number' || !Number.isFinite(level)) return 1;
  return Math.max(1, Math.min(5, Math.trunc(level)));
}

function getRelicValueAtLevel(config: RelicConfig, level: number): number {
  return config.values[clampRelicLevel(level) - 1];
}

export function getRelicUpgradeCost(code: string, currentLevel: number): number | null {
  const config = RELIC_CONFIGS[code];
  if (!config) return null;
  const lvl = clampRelicLevel(currentLevel);
  if (lvl >= 5) return null;
  return UPGRADE_COSTS[config.tier][lvl - 1];
}

export function buildRelicPowerDto(
  code: string,
  ownedLevel = 1
): RelicPowerDto | null {
  const config = RELIC_CONFIGS[code];
  if (!config) return null;

  const level = clampRelicLevel(ownedLevel);
  const levels: RelicLevelEntryDto[] = config.values.map((val, idx) => {
    const lvl = idx + 1;
    return {
      level: lvl,
      value: val,
      shortTag: config.formatShortTag(val),
      effectSummary: config.formatSummary(val),
      upgradeCost: lvl === 1 ? null : UPGRADE_COSTS[config.tier][lvl - 2],
    };
  });

  const currentEntry = levels[level - 1];
  const nextEntry = level < 5 ? levels[level] : null;

  return {
    tier: config.tier,
    tierLabel: TIER_LABELS[config.tier],
    level,
    maxLevel: 5,
    shortTag: currentEntry.shortTag,
    effectSummary: currentEntry.effectSummary,
    nextLevelEffectSummary: nextEntry ? nextEntry.effectSummary : null,
    nextUpgradeCost: getRelicUpgradeCost(code, level),
    requiresFullShowcase: Boolean(config.requiresFullShowcase),
    levels,
  };
}

export async function getActiveUserRelics(
  db: AppDatabase,
  userId: string
): Promise<ActiveRelicInstance[]> {
  const [userRow] = await db
    .select({
      slot1: schema.users.showcaseSlot1Id,
      slot2: schema.users.showcaseSlot2Id,
      slot3: schema.users.showcaseSlot3Id,
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId));

  if (!userRow) return [];

  const slots: Array<{ slot: 1 | 2 | 3; id: number | null }> = [
    { slot: 1, id: userRow.slot1 },
    { slot: 2, id: userRow.slot2 },
    { slot: 3, id: userRow.slot3 },
  ];

  const slotIds = Array.from(
    new Set(slots.map((s) => s.id).filter((id): id is number => id !== null))
  );

  if (slotIds.length === 0) return [];

  const slotIdSet = new Set(slotIds);
  const [allCosmetics, ownedRows] = await Promise.all([
    getCachedCosmetics(db),
    db
      .select({
        cosmeticId: schema.userCosmetics.cosmeticId,
        level: schema.userCosmetics.level,
      })
      .from(schema.userCosmetics)
      .where(
        and(
          eq(schema.userCosmetics.userId, userId),
          inArray(schema.userCosmetics.cosmeticId, slotIds)
        )
      ),
  ]);

  const cosmeticMap = new Map(
    allCosmetics
      .filter((c) => c.type === 'relic' && slotIdSet.has(c.id))
      .map((c) => [c.id, c])
  );
  const levelMap = new Map(
    ownedRows.map((r) => [r.cosmeticId, clampRelicLevel(r.level)])
  );

  const seenIds = new Set<number>();
  const active: ActiveRelicInstance[] = [];

  for (const s of slots) {
    if (!s.id || seenIds.has(s.id)) continue;
    const cosmetic = cosmeticMap.get(s.id);
    if (!cosmetic) continue;
    seenIds.add(cosmetic.id);
    active.push({
      slot: s.slot,
      id: cosmetic.id,
      code: cosmetic.code,
      name: cosmetic.name,
      level: levelMap.get(cosmetic.id) ?? 1,
    });
  }

  return active;
}

export function getShopDiscountPct(activeRelics: ActiveRelicInstance[]): number {
  const keyRelic = activeRelics.find((r) => r.code === 'relic_bodega_key');
  if (!keyRelic) return 0;
  const config = RELIC_CONFIGS.relic_bodega_key;
  return getRelicValueAtLevel(config, keyRelic.level);
}

export function applyShopDiscount(
  basePrice: number,
  itemType: string,
  discountPct: number
): number {
  if (itemType === 'relic' || discountPct <= 0 || basePrice <= 0) {
    return basePrice;
  }
  return Math.max(1, Math.round(basePrice * (1 - discountPct / 100)));
}

export function buildActiveRelicsSummary(
  activeRelics: ActiveRelicInstance[]
): ActiveRelicsSummaryDto {
  const fullShowcaseActive = activeRelics.length === 3;
  const shopDiscountPct = getShopDiscountPct(activeRelics);

  const effects = activeRelics.map((relic) => {
    const config = RELIC_CONFIGS[relic.code];
    const lvl = clampRelicLevel(relic.level);
    const val = config ? getRelicValueAtLevel(config, lvl) : 0;
    const isRoyalCrown = relic.code === 'relic_royal_crown';
    return {
      slot: relic.slot,
      relicId: relic.id,
      code: relic.code,
      name: relic.name,
      tier: config?.tier ?? 'common',
      level: lvl,
      shortTag: config ? config.formatShortTag(val) : '',
      effectSummary: config ? config.formatSummary(val) : '',
      active: isRoyalCrown ? fullShowcaseActive : true,
    };
  });

  return {
    activeCount: activeRelics.length,
    maxSlots: 3,
    fullShowcaseActive,
    shopDiscountPct,
    effects,
  };
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function getGlobalMultiplierPct(activeRelics: ActiveRelicInstance[]): {
  totalPct: number;
  contributors: Array<{ relic: ActiveRelicInstance; pct: number; tag: string }>;
} {
  let totalPct = 0;
  const contributors: Array<{ relic: ActiveRelicInstance; pct: number; tag: string }> = [];

  for (const relic of activeRelics) {
    if (relic.code === 'relic_foam_trophy') {
      const cfg = RELIC_CONFIGS.relic_foam_trophy;
      const pct = getRelicValueAtLevel(cfg, relic.level);
      totalPct += pct;
      contributors.push({ relic, pct, tag: cfg.formatShortTag(pct) });
    } else if (relic.code === 'relic_royal_crown' && activeRelics.length === 3) {
      const cfg = RELIC_CONFIGS.relic_royal_crown;
      const pct = getRelicValueAtLevel(cfg, relic.level);
      totalPct += pct;
      contributors.push({ relic, pct, tag: cfg.formatShortTag(pct) });
    }
  }

  return { totalPct, contributors };
}

export function calculateBeerRegistrationChapas(params: {
  baseChapas: number;
  completedBrandBase: number;
  beer: {
    format: string;
    style: string;
    abv: string | number;
    country: string;
  };
  rating: number;
  scannedViaPack: boolean;
  isFirstBeerToday: boolean;
  activeRelics: ActiveRelicInstance[];
}): BeerChapasBreakdown {
  const {
    baseChapas,
    completedBrandBase,
    beer,
    rating,
    scannedViaPack,
    isFirstBeerToday,
    activeRelics,
  } = params;

  const normStyle = normalizeText(beer.style);
  const normCountry = normalizeText(beer.country);
  const abvNum = Number(beer.abv);

  let beerFlatBonus = 0;
  const beerFlatItems: Array<{ relic: ActiveRelicInstance; amount: number; tag: string }> = [];

  let beerPctTotal = 0;
  let dailyFirstPct = 0;
  const beerPctItems: Array<{ relic: ActiveRelicInstance; pct: number; tag: string }> = [];

  let brandPctBonus = 0;
  let brandFlatBonus = 0;
  const brandItems: Array<{ relic: ActiveRelicInstance; amount: number; tag: string }> = [];

  for (const relic of activeRelics) {
    const cfg = RELIC_CONFIGS[relic.code];
    if (!cfg) continue;
    const val = getRelicValueAtLevel(cfg, relic.level);
    const tag = cfg.formatShortTag(val);

    switch (relic.code) {
      case 'relic_cap_1900':
      case 'relic_platinum_cap': {
        beerFlatBonus += val;
        beerFlatItems.push({ relic, amount: val, tag });
        break;
      }
      case 'relic_mini_barrel': {
        if (/ipa|negra|tostada/.test(normStyle) || normCountry === 'belgica') {
          beerFlatBonus += val;
          beerFlatItems.push({ relic, amount: val, tag });
        }
        break;
      }
      case 'relic_abbey_chalice': {
        if (Number.isFinite(abvNum) && abvNum >= 7.0) {
          beerFlatBonus += val;
          beerFlatItems.push({ relic, amount: val, tag });
        }
        break;
      }
      case 'relic_crystal_hop': {
        if (rating >= 4) {
          beerFlatBonus += val;
          beerFlatItems.push({ relic, amount: val, tag });
        }
        break;
      }
      case 'relic_munich_coaster': {
        if (
          /trigo|weizen|wheat/.test(normStyle) ||
          normCountry === 'alemania' ||
          normCountry === 'republica checa'
        ) {
          beerPctTotal += val;
          beerPctItems.push({ relic, pct: val, tag });
        }
        break;
      }
      case 'relic_vintage_opener': {
        if (beer.format === 'botellin') {
          beerPctTotal += val;
          beerPctItems.push({ relic, pct: val, tag });
        }
        break;
      }
      case 'relic_porcelain_mug': {
        if (beer.format === 'lata' || scannedViaPack) {
          beerPctTotal += val;
          beerPctItems.push({ relic, pct: val, tag });
        }
        break;
      }
      case 'relic_bronze_tap': {
        if (isFirstBeerToday) {
          const pct = Math.round((val - 1) * 100);
          dailyFirstPct += pct;
          beerPctItems.push({ relic, pct, tag });
        }
        break;
      }
      case 'relic_founder_coaster': {
        if (completedBrandBase > 0) {
          const added = Math.round((completedBrandBase * val) / 100);
          brandPctBonus += added;
          brandItems.push({ relic, amount: added, tag });
        }
        break;
      }
      case 'relic_collector_barrel': {
        if (completedBrandBase > 0) {
          brandFlatBonus += val;
          brandItems.push({ relic, amount: val, tag });
        }
        break;
      }
      default:
        break;
    }
  }

  const beerPrePct = baseChapas + beerFlatBonus;
  const beerSubtotal = Math.round(
    beerPrePct * (1 + (beerPctTotal + dailyFirstPct) / 100)
  );
  const brandSubtotal =
    completedBrandBase > 0 ? completedBrandBase + brandPctBonus + brandFlatBonus : 0;

  const preGlobalSubtotal = beerSubtotal + brandSubtotal;
  const { totalPct: globalPct, contributors: globalContributors } =
    getGlobalMultiplierPct(activeRelics);

  const totalDirectChapas = Math.round(preGlobalSubtotal * (1 + globalPct / 100));
  const globalDelta = totalDirectChapas - preGlobalSubtotal;
  const relicBonusChapas = Math.max(
    0,
    totalDirectChapas - (baseChapas + completedBrandBase)
  );

  const appliedBonuses: RelicBonusItem[] = [];

  for (const item of beerFlatItems) {
    appliedBonuses.push({
      code: item.relic.code,
      name: item.relic.name,
      level: item.relic.level,
      chapasAdded: item.amount,
      label: item.tag,
    });
  }

  for (const item of beerPctItems) {
    const approx = Math.round((beerPrePct * item.pct) / 100);
    appliedBonuses.push({
      code: item.relic.code,
      name: item.relic.name,
      level: item.relic.level,
      chapasAdded: approx,
      label: item.tag,
    });
  }

  for (const item of brandItems) {
    appliedBonuses.push({
      code: item.relic.code,
      name: item.relic.name,
      level: item.relic.level,
      chapasAdded: item.amount,
      label: item.tag,
    });
  }

  if (globalDelta > 0 && globalContributors.length > 0 && globalPct > 0) {
    let assigned = 0;
    globalContributors.forEach((contrib, idx) => {
      const share =
        idx === globalContributors.length - 1
          ? Math.max(0, globalDelta - assigned)
          : Math.round((globalDelta * contrib.pct) / globalPct);
      assigned += share;
      appliedBonuses.push({
        code: contrib.relic.code,
        name: contrib.relic.name,
        level: contrib.relic.level,
        chapasAdded: share,
        label: contrib.tag,
      });
    });
  }

  return {
    totalDirectChapas,
    relicBonusChapas,
    effectiveBrandBonus: brandSubtotal,
    appliedBonuses,
  };
}

export function calculateAchievementRewardChapas(
  baseRewardChapas: number,
  category: string,
  activeRelics: ActiveRelicInstance[]
): { totalRewardChapas: number; relicBonusChapas: number } {
  if (baseRewardChapas <= 0) {
    return { totalRewardChapas: 0, relicBonusChapas: 0 };
  }

  let achPct = 0;
  for (const relic of activeRelics) {
    if (relic.code === 'relic_hop_medal') {
      achPct += getRelicValueAtLevel(RELIC_CONFIGS.relic_hop_medal, relic.level);
    } else if (
      relic.code === 'relic_solid_gold_hop' &&
      (category === 'Colección de Cervezas' || category === 'Marcas y Descubrimiento')
    ) {
      achPct += getRelicValueAtLevel(RELIC_CONFIGS.relic_solid_gold_hop, relic.level);
    }
  }

  const afterAchPct = Math.round(baseRewardChapas * (1 + achPct / 100));
  const { totalPct: globalPct } = getGlobalMultiplierPct(activeRelics);
  const totalRewardChapas = Math.round(afterAchPct * (1 + globalPct / 100));

  return {
    totalRewardChapas,
    relicBonusChapas: Math.max(0, totalRewardChapas - baseRewardChapas),
  };
}

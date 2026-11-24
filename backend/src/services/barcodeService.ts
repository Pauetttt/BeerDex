import { and, asc, eq, inArray } from 'drizzle-orm';
import { AppDatabase, schema } from '../db';
import {
  expandUpceToEan13,
  EXTRA_BARCODE_TO_BEER_NAME,
  GS1_PREFIX_TO_BRAND,
  isValidEan13,
} from './barcodeCatalog';

export interface ResolvedBeerRow {
  id: number;
  brandId: number;
  brandName: string;
  name: string;
  format: 'lata' | 'botellin' | 'litrona';
  barcode: string;
  style: string;
  abv: string;
  country: string;
}

export interface ResolvedBeerResult {
  beer: ResolvedBeerRow;
  needsVarietyConfirm: boolean;
  relatedBrandNames?: string[];
  isPack?: boolean;
}

export const BEER_SELECT_FIELDS = {
  id: schema.beers.id,
  brandId: schema.beers.brandId,
  brandName: schema.brands.name,
  name: schema.beers.name,
  format: schema.beers.format,
  barcode: schema.beers.barcode,
  style: schema.beers.style,
  abv: schema.beers.abv,
  country: schema.beers.country,
};

export function buildBarcodeCandidates(code: string): string[] {
  const candidates = new Set<string>();
  if (code.length === 8) {
    candidates.add(code);
    const expanded = expandUpceToEan13(code);
    if (expanded) candidates.add(expanded);
  } else if (code.length === 12) {
    const e13 = `0${code}`;
    if (isValidEan13(e13)) {
      candidates.add(e13);
      candidates.add(code);
    } else {
      candidates.add(code);
    }
  } else if (code.length === 14) {
    candidates.add(code);
    if (code.startsWith('0') && isValidEan13(code.slice(1))) {
      candidates.add(code.slice(1));
    }
  } else {
    candidates.add(code);
  }
  return Array.from(candidates);
}

// Ordenadas de marca más específica/sub-marca a casa matriz para evitar falsos positivos
const BRAND_KEYWORDS: Array<{ brandName: string; keywords: string[] }> = [
  { brandName: '1906', keywords: ['1906', 'red vintage', 'black coupage', 'galician irish red'] },
  { brandName: 'Estrella Galicia', keywords: ['estrella galicia', 'hijos de rivera'] },
  { brandName: 'Mahou', keywords: ['mahou'] },
  { brandName: 'Alhambra', keywords: ['alhambra'] },
  { brandName: 'La Salve', keywords: ['la salve', 'sirimiri', 'txirene', 'botxo'] },
  { brandName: 'La Virgen', keywords: ['la virgen', 'jamonera', 'madrid lager'] },
  { brandName: 'Voll-Damm', keywords: ['voll-damm', 'voll damm', 'vall-damm'] },
  { brandName: 'Estrella de Levante', keywords: ['estrella de levante', 'estrella levante', 'punta este', 'verna'] },
  { brandName: 'Turia', keywords: ['turia', 'cerveza turia'] },
  { brandName: 'Victoria', keywords: ['cerveza victoria', 'victoria malaga', 'malacati', 'marengo', 'vendeja', 'pasos largos'] },
  { brandName: 'Keler', keywords: ['keler', 'keler 18'] },
  {
    brandName: 'Estrella Damm',
    keywords: [
      'estrella damm',
      'free damm',
      'damm lemon',
      'inedit',
      'complot',
      'daura',
      'xibeca',
      'bock-damm',
      'ak damm',
      'rosa blanca damm',
    ],
  },
  { brandName: 'San Miguel', keywords: ['san miguel', 'magna', 'selecta', 'manila'] },
  { brandName: 'Cruzcampo', keywords: ['cruzcampo'] },
  { brandName: 'Moritz', keywords: ['moritz', 'epidor'] },
  { brandName: 'Ámbar', keywords: ['ambar', 'la zaragozana', 'caesaraugusta'] },
  { brandName: 'El Águila', keywords: ['el aguila', 'aguila sin filtrar', 'aguila dorada', 'aguila 1900', 'cerveza aguila'] },
  { brandName: 'Tropical', keywords: ['cerveza tropical', 'tropical pilsen', 'tropical limon', 'tropical 1924'] },
  { brandName: 'Amstel', keywords: ['amstel'] },
  { brandName: 'Desperados', keywords: ['desperados'] },
  { brandName: 'Heineken', keywords: ['heineken'] },
  { brandName: 'Dorada', keywords: ['dorada pilsen', 'dorada especial', 'dorada sin', 'cerveza dorada'] },
  { brandName: 'El Alcázar', keywords: ['el alcazar', 'cerveza alcazar'] },
  { brandName: 'La Sagra', keywords: ['la sagra', 'mulata', 'criolla'] },
  { brandName: 'Guinness', keywords: ['guinness', 'hop house'] },
  { brandName: 'Franziskaner', keywords: ['franziskaner', 'natur russ'] },
  { brandName: 'Paulaner', keywords: ['paulaner', 'salvator'] },
  { brandName: 'Budweiser', keywords: ['budweiser', 'bud light', 'bud ice'] },
  { brandName: 'Stella Artois', keywords: ['stella artois'] },
  { brandName: 'Leffe', keywords: ['leffe'] },
  { brandName: 'Delirium Tremens', keywords: ['delirium tremens', 'delirium nocturnum', 'delirium red', 'delirium argentum', 'deliria', 'huyghe'] },
  { brandName: 'Carlsberg', keywords: ['carlsberg', 'sort guld'] },
  { brandName: 'Pilsner Urquell', keywords: ['pilsner urquell'] },
  { brandName: 'BrewDog', keywords: ['brewdog', 'punk ipa', 'hazy jane', 'elvis juice'] },
  {
    brandName: 'Modelo',
    keywords: [
      'modelo especial',
      'negra modelo',
      'modelo ambar',
      'modelo oro',
      'modelo chelada',
      'modelo pura malta',
      'modelo trigo',
      'cerveza modelo',
    ],
  },
  { brandName: 'Corona', keywords: ['corona extra', 'coronita', 'corona cero', 'corona light', 'corona sunbrew', 'cerveza corona'] },
  { brandName: 'Asahi', keywords: ['asahi', 'nama jokki'] },
  { brandName: 'Peroni', keywords: ['peroni', 'nastro azzurro'] },
  { brandName: 'Sapporo', keywords: ['sapporo', 'sorachi 1984', 'yebisu'] },
  { brandName: 'Super Bock', keywords: ['super bock', 'superbock'] },
  { brandName: 'Sagres', keywords: ['sagres'] },
];

const VARIETY_TOKENS = [
  'tostada',
  'negra',
  'dunkel',
  'stout',
  'porter',
  'ipa',
  'session',
  'sin filtrar',
  'unfiltered',
  'sin gluten',
  'gluten free',
  'senza glutine',
  'sem gluten',
  'radler',
  'limon',
  'limao',
  'shandy',
  '1906',
  'red vintage',
  'black coupage',
  'irish red',
  'clasica',
  'maestra',
  'doble lupulo',
  'barrica',
  'bourbon',
  'rose',
  '1925',
  'roja',
  'especial roja',
  'citra',
  'baltic',
  'tradicional',
  'jamonera',
  '360',
  'trigo',
  'castiza',
  'veraniega',
  'voll',
  'free',
  'complot',
  'inedit',
  'daura',
  'bock',
  'xibeca',
  'magna',
  'selecta',
  'manila',
  'fresca',
  'eco',
  'gran reserva',
  'andalusian',
  'tremenda',
  'export',
  '1900',
  'triple zero',
  'caesaraugusta',
  'morena',
  'silver',
  'extra cold',
  'pure malt',
  'draught',
  'foreign',
  'original',
  'hop house',
  'west indies',
  'dublin',
  'nitro',
  'cold brew',
  'salvator',
  'oktoberfest',
  'hell',
  'kristall',
  'zwickl',
  'blonde',
  'brune',
  'triple',
  'ruby',
  'rituel',
  'ambree',
  'royale',
  'nectar',
  'punk',
  'elvis',
  'hazy',
  'lost',
  'black heart',
  'wingman',
  'dead pony',
  'nanny',
  'familiar',
  'light',
  'sunbrew',
  'coronita',
  'nastro azzurro',
  'nastro',
  'capri',
  'rossa',
  'doppio',
  'puro malto',
  'tradizionale',
  'dorada',
  'marzen',
  'stark',
  'punta este',
  'verna',
  'marengo',
  'pasos largos',
  'malacati',
  'vendeja',
  'diez',
  'oro',
  'extra',
  '1924',
  'epidor',
  'red ipa',
  'sirimiri',
  'munich',
  'txirene',
  'botxo',
  'lucia',
  'bohemia',
  'criolla',
  'blanca',
  'mulata',
  'calabaza',
  'summer',
  'bud light',
  'select',
  'bud ice',
  'platinum',
  'solstice',
  'midnight',
  'elephant',
  '1883',
  'special brew',
  'zitrone',
  'blutorange',
  'holunder',
  'royal',
  'leicht',
  'natur russ',
  'mojito',
  'lime',
  'red',
  'sangre',
  'virgin',
  'black',
  'tropical',
  'ginger',
  'nocturno',
  'flare',
  'berry',
  'nocturnum',
  'argentum',
  'christmas',
  'deliria',
  'chelada',
  'ambar',
  'pura malta',
  'nama jokki',
  'dry zero',
  'the rich',
  'style free',
  'sorachi',
  'gold star',
  'yebisu',
  'kuro',
  'abadia',
  'green',
  'tango',
  'preta',
  'coruja',
  'branca',
  'libera',
  'cruda',
  'gran riserva',
];

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9,.\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasWholeToken(haystack: string, token: string): boolean {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`).test(haystack);
}

function isZeroAlcoholText(rawText: string, normText: string): boolean {
  return (
    /\b0(?:[,.]0+)?\s*%/.test(rawText.toLowerCase()) ||
    /\b0[,.]0\b|sin alcohol|sin alchol|sans alcool|sem alcool|alkoholfrei|alcohol[\s-]*free|non alcoholic|alcoholvrij|\bcero\b|\bzero\b|\bpunk af\b|\bhazy af\b/.test(
      normText
    )
  );
}

function detectOffContainerFormat(
  formatText: string
): 'lata' | 'botellin' | 'litrona' | null {
  const mp = formatText.match(/\b(\d+)\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*(cl|ml|l)\b/);
  let unitMl: number | null = null;
  if (mp) {
    const val = parseFloat(mp[2].replace(',', '.'));
    if (mp[3] === 'cl') unitMl = val * 10;
    else if (mp[3] === 'l') unitMl = val * 1000;
    else unitMl = val;
    if (unitMl >= 620) return 'litrona';
  } else {
    const single = formatText.match(/\b(\d+(?:[.,]\d+)?)\s*(cl|ml|l)\b/);
    if (single) {
      const val = parseFloat(single[1].replace(',', '.'));
      if (single[2] === 'cl') unitMl = val * 10;
      else if (single[2] === 'l') unitMl = val * 1000;
      else unitMl = val;
      if (unitMl >= 620 || /litrona|xibeca/.test(formatText)) return 'litrona';
    } else if (/litrona|xibeca/.test(formatText)) {
      return 'litrona';
    }
  }

  if (
    /\blatas?\b|\bcans?\b|\bcanette|\bblik\b|\bdosen?\b|\balumini|\b50\s?cl\b|\b500\s?ml\b|\b44\s?cl\b|\b440\s?ml\b|\b0[,.]5\s?l/.test(
      formatText
    ) &&
    !/botell|vidrio|glass|bouteille|flasche/.test(formatText)
  ) {
    return 'lata';
  }
  if (
    /\bbotell|\bvidrio\b|\bglass\b|\bcristal\b|\bflasche|\bbouteille|\bfles\b|\b25\s?cl\b|\b20\s?cl\b|\b21\s?cl\b|\b35[,.]5\s?cl\b|\b355\s?ml/.test(
      formatText
    )
  ) {
    return 'botellin';
  }
  if (mp && unitMl !== null && unitMl <= 260) {
    return 'botellin';
  }
  return null;
}

function findLongestPrefixMatch(candidates: string[]) {
  const sortedPrefixes = [...GS1_PREFIX_TO_BRAND].sort(
    (a, b) => b.prefix.length - a.prefix.length
  );
  for (const entry of sortedPrefixes) {
    if (candidates.some((cand) => cand.startsWith(entry.prefix))) {
      return entry;
    }
  }
  return undefined;
}

async function resolveFromOpenFoodFacts(
  db: AppDatabase,
  code: string,
  candidates: string[]
): Promise<ResolvedBeerResult | undefined> {
  if (process.env.NODE_ENV === 'test') return undefined;

  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`,
      {
        headers: {
          'User-Agent': 'BeerDexAPI/1.0 (https://beerdex.workers.dev)',
        },
        signal: AbortSignal.timeout(3200),
      }
    );
    if (!res.ok) return undefined;

    const data = (await res.json()) as {
      status?: number;
      product?: {
        product_name?: string;
        product_name_es?: string;
        product_name_en?: string;
        product_name_fr?: string;
        product_name_de?: string;
        product_name_pt?: string;
        generic_name?: string;
        generic_name_es?: string;
        abbreviated_product_name?: string;
        brands?: string;
        quantity?: string;
        packaging?: string;
        packaging_tags?: string[];
        categories?: string;
        categories_tags?: string[];
        nutriments?: {
          alcohol?: number;
          alcohol_value?: number;
          alcohol_100g?: number;
        };
      };
    };
    if (data.status !== 1 || !data.product) return undefined;

    const p = data.product;
    const packagingStr = [p.packaging || '', ...(p.packaging_tags || [])].join(' ');
    const categoriesStr = [p.categories || '', ...(p.categories_tags || [])].join(' ');
    const rawStr = `${p.brands || ''} ${p.product_name_es || ''} ${p.product_name || ''} ${p.product_name_en || ''} ${p.product_name_fr || ''} ${p.product_name_de || ''} ${p.product_name_pt || ''} ${p.generic_name_es || ''} ${p.generic_name || ''} ${p.abbreviated_product_name || ''} ${p.quantity || ''} ${packagingStr} ${categoriesStr}`;
    const combined = normalizeText(rawStr);

    const hasNonBeerToken =
      /\bolio\b|\bhuile\b|\baceite\b|\bvino\b|\bwine\b|\bporto\b|\bcidre\b|\bcider\b|\blevadura\b|\bpopcorn\b|\bcheese\b|\bqueso\b|\bhummus\b|\bsushi\b|\bramen\b|\bketchup\b|\bbread\b|\bburger\b/.test(
        combined
      );
    const hasBeerCategoryToken =
      /\bcerveza\b|\bcerveja\b|\bbiere\b|\bbeer\b|\bbirra\b|\bbier\b|\bpivo\b|\balus\b|\blager\b|\bpilsner\b|\bipa\b|\bstout\b|\bweissbier\b|\bradler\b/.test(
        combined
      );
    if (hasNonBeerToken && !hasBeerCategoryToken) {
      return undefined;
    }

    let matchedBrandName: string | undefined;
    for (const entry of BRAND_KEYWORDS) {
      if (entry.brandName === 'Budweiser' && (combined.includes('budvar') || combined.includes('czech'))) {
        continue;
      }
      if (entry.brandName === 'Victoria' && (combined.includes('bitters') || combined.includes('chelada'))) {
        continue;
      }
      if (entry.brandName === 'Modelo' && (combined.includes('corona') || combined.includes('coronita'))) {
        continue;
      }
      if (entry.brandName === 'Corona' && combined.includes('modelo')) {
        continue;
      }
      if (entry.keywords.some((kw) => hasWholeToken(combined, kw))) {
        matchedBrandName = entry.brandName;
        break;
      }
    }

    const prefixEntry = findLongestPrefixMatch(candidates);
    if (!matchedBrandName) {
      matchedBrandName = prefixEntry?.brandName;
    }

    if (!matchedBrandName) return undefined;

    const brandBeers = await db
      .select(BEER_SELECT_FIELDS)
      .from(schema.beers)
      .innerJoin(schema.brands, eq(schema.beers.brandId, schema.brands.id))
      .where(eq(schema.brands.name, matchedBrandName))
      .orderBy(asc(schema.beers.id));

    if (brandBeers.length === 0) return undefined;

    const rawAbv = p.nutriments?.alcohol_value ?? p.nutriments?.alcohol ?? p.nutriments?.alcohol_100g;
    const offAbv = typeof rawAbv === 'number' && Number.isFinite(rawAbv) ? rawAbv : null;

    const offIsZero = isZeroAlcoholText(rawStr, combined) || (offAbv !== null && offAbv <= 0.5);
    const formatText = normalizeText(
      `${p.product_name_es || ''} ${p.product_name || ''} ${p.product_name_en || ''} ${p.product_name_fr || ''} ${p.product_name_de || ''} ${p.product_name_pt || ''} ${p.generic_name_es || ''} ${p.quantity || ''} ${packagingStr}`
    );
    const offFormat = detectOffContainerFormat(formatText);

    let bestBeer = brandBeers[0];
    let bestScore = -999;

    for (const candidate of brandBeers) {
      const candNorm = normalizeText(`${candidate.name} ${candidate.style}`);
      let score = 0;

      const candIsZero =
        candidate.style === '0,0%' || isZeroAlcoholText('', candNorm) || Number(candidate.abv) <= 0.5;
      if (offIsZero === candIsZero) {
        score += offIsZero ? 14 : 3;
      } else {
        score -= 18;
      }

      if (offFormat) {
        if (candidate.format === offFormat) {
          score += 8;
        } else {
          score -= 4;
        }
      }

      if (offAbv !== null) {
        const diff = Math.abs(Number(candidate.abv) - offAbv);
        if (diff <= 0.15) {
          score += 14;
        } else if (diff <= 0.35) {
          score += 9;
        } else if (diff <= 0.6) {
          score += 4;
        } else if (diff >= 1.0) {
          score -= 10;
        }
      }

      for (const token of VARIETY_TOKENS) {
        const inOff = hasWholeToken(combined, token);
        const inCand = hasWholeToken(candNorm, token);
        if (inOff && inCand) {
          score += 14;
        } else if (inOff && !inCand) {
          score -= 10;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestBeer = candidate;
      }
    }

    return {
      beer: bestBeer,
      needsVarietyConfirm: bestScore < 14,
      relatedBrandNames: prefixEntry?.relatedBrandNames,
      isPack:
        code.length === 14 ||
        /pack|caja|\b\d+\s*[x×*]\s*\d+/i.test(rawStr),
    };
  } catch {
    return undefined;
  }
}

export async function resolveBeerByBarcode(
  db: AppDatabase,
  code: string
): Promise<ResolvedBeerResult | undefined> {
  const candidates = buildBarcodeCandidates(code);
  const dbCandidates = candidates.filter((c) => c.length <= 13);

  // 1) Coincidencia exacta por código de barras primario en BD
  if (dbCandidates.length > 0) {
    const directRows = await db
      .select(BEER_SELECT_FIELDS)
      .from(schema.beers)
      .innerJoin(schema.brands, eq(schema.beers.brandId, schema.brands.id))
      .where(inArray(schema.beers.barcode, dbCandidates));

    const directRow =
      directRows.find((r) => r.barcode === code) || directRows[0];
    if (directRow) {
      return { beer: directRow, needsVarietyConfirm: false, isPack: code.length === 14 };
    }
  }

  // 2) Coincidencia en el diccionario de códigos de barras comerciales alternativos (unidades y packs/cajas)
  for (const cand of candidates) {
    const aliasTarget = EXTRA_BARCODE_TO_BEER_NAME[cand];
    if (!aliasTarget) continue;
    const [aliasRow] = await db
      .select(BEER_SELECT_FIELDS)
      .from(schema.beers)
      .innerJoin(schema.brands, eq(schema.beers.brandId, schema.brands.id))
      .where(
        and(
          eq(schema.brands.name, aliasTarget.brandName),
          eq(schema.beers.name, aliasTarget.beerName)
        )
      );
    if (aliasRow) {
      return { beer: aliasRow, needsVarietyConfirm: false, isPack: true };
    }
  }

  // 3) Consulta en tiempo real a Open Food Facts para variantes de lote/envase/pack de las 41 marcas
  const offResolved = await resolveFromOpenFoodFacts(
    db,
    candidates[0],
    candidates
  );
  if (offResolved) return offResolved;

  // 4) Coincidencia por prefijo oficial GS1 más largo de fabricante cervecero (solicita confirmación de variedad)
  const prefixMatch = findLongestPrefixMatch(candidates);
  if (prefixMatch) {
    const brandBeers = await db
      .select(BEER_SELECT_FIELDS)
      .from(schema.beers)
      .innerJoin(schema.brands, eq(schema.beers.brandId, schema.brands.id))
      .where(eq(schema.brands.name, prefixMatch.brandName))
      .orderBy(asc(schema.beers.id));

    if (brandBeers.length > 0) {
      const defaultBeer =
        brandBeers.find((b) => b.name === prefixMatch.defaultBeerName) ||
        brandBeers[0];
      return {
        beer: defaultBeer,
        needsVarietyConfirm: true,
        relatedBrandNames: prefixMatch.relatedBrandNames,
        isPack: code.length === 14,
      };
    }
  }

  return undefined;
}

export async function getScopedBrandBeers(
  db: AppDatabase,
  resolved: ResolvedBeerResult
): Promise<ResolvedBeerRow[]> {
  const brandScopeNames = Array.from(
    new Set([resolved.beer.brandName, ...(resolved.relatedBrandNames || [])])
  );

  const scopedBeers = await db
    .select(BEER_SELECT_FIELDS)
    .from(schema.beers)
    .innerJoin(schema.brands, eq(schema.beers.brandId, schema.brands.id))
    .where(
      brandScopeNames.length > 1
        ? inArray(schema.brands.name, brandScopeNames)
        : eq(schema.beers.brandId, resolved.beer.brandId)
    )
    .orderBy(asc(schema.beers.id));

  return [...scopedBeers].sort((a, b) => {
    const aPrimary = a.brandId === resolved.beer.brandId ? 0 : 1;
    const bPrimary = b.brandId === resolved.beer.brandId ? 0 : 1;
    if (aPrimary !== bPrimary) return aPrimary - bPrimary;
    return a.id - b.id;
  });
}

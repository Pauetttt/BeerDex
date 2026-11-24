export interface OpenFoodFactsProduct {
  product_name?: string;
  product_name_es?: string;
  brands?: string;
  quantity?: string;
  countries?: string;
  nutriments?: {
    alcohol?: number;
    alcohol_value?: number;
  };
  categories_tags?: string[];
}

export interface CsvDraftRow {
  brand_name: string;
  brand_logo_url: string;
  brand_history: string;
  beer_name: string;
  format: 'lata' | 'botellin' | 'litrona';
  barcode: string;
  short_history: string;
  style: string;
  abv: string;
  country: string;
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function inferFormat(quantity?: string, name?: string): 'lata' | 'botellin' | 'litrona' {
  const hay = `${quantity || ''} ${name || ''}`.toLowerCase();
  if (/1\s?l|100\s?cl|1000\s?ml|litrona/.test(hay)) return 'litrona';
  if (/lata|can/.test(hay)) return 'lata';
  return 'botellin';
}

function inferStyle(abv: number, name: string, tags: string[] = []): string {
  const hay = `${name} ${tags.join(' ')}`.toLowerCase();
  if (abv === 0 || /0[,.]0|sin alcohol|alcohol-free|non-alcoholic/.test(hay)) {
    return '0,0%';
  }
  if (/ipa|india pale/.test(hay)) return 'IPA';
  if (/stout|porter|negra|dark|dunkel/.test(hay)) return 'Negra';
  if (/tostada|amber|bock|doble malta/.test(hay)) return 'Tostada';
  if (/trigo|weiss|wheat|witbier/.test(hay)) return 'Trigo';
  return 'Lager';
}

export function mapOffProductToCsvRow(
  barcode: string,
  product: OpenFoodFactsProduct
): CsvDraftRow {
  const brandRaw = (product.brands || 'Marca Desconocida').split(',')[0].trim();
  const brandSlug = brandRaw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const beerName = (product.product_name_es || product.product_name || 'Cerveza').trim();
  const abvNum = Number(
    product.nutriments?.alcohol_value ?? product.nutriments?.alcohol ?? 5.0
  );
  const safeAbv = Number.isFinite(abvNum) && abvNum >= 0 ? abvNum : 5.0;
  const format = inferFormat(product.quantity, beerName);
  const style = inferStyle(safeAbv, beerName, product.categories_tags);
  const country = (product.countries || 'España').split(',')[0].replace(/^en:/, '').trim();

  const draftBase = `${beerName} de ${brandRaw} en formato ${format}, estilo ${style} (${safeAbv.toFixed(1)}% vol.), elaborada en ${country} con carácter cervecero equilibrado y refrescante.`;
  const shortHistory =
    draftBase.length < 120
      ? draftBase.padEnd(120, ' ').trimEnd()
      : draftBase.slice(0, 150);

  return {
    brand_name: brandRaw,
    brand_logo_url: `brand://${brandSlug || 'custom'}`,
    brand_history: `Historia oficial de ${brandRaw}.`,
    beer_name: beerName,
    format,
    barcode: barcode.trim(),
    short_history: shortHistory,
    style,
    abv: safeAbv.toFixed(2),
    country,
  };
}

export function formatDraftAsCsvLine(row: CsvDraftRow): string {
  return [
    row.brand_name,
    row.brand_logo_url,
    row.brand_history,
    row.beer_name,
    row.format,
    row.barcode,
    row.short_history,
    row.style,
    row.abv,
    row.country,
  ]
    .map(csvEscape)
    .join(',');
}

async function runCli(): Promise<void> {
  const barcode = (process.argv[2] || '').trim();
  if (!/^\d{8}$|^\d{13}$/.test(barcode)) {
    console.error('Uso: npm run catalog:lookup -- <codigo_ean8_o_ean13>');
    process.exit(1);
  }

  const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Error consultando Open Food Facts (${res.status})`);
    process.exit(1);
  }

  const json = (await res.json()) as {
    status?: number;
    product?: OpenFoodFactsProduct;
  };
  if (json.status !== 1 || !json.product) {
    console.error(`Producto no encontrado en Open Food Facts para EAN ${barcode}.`);
    process.exit(1);
  }

  const row = mapOffProductToCsvRow(barcode, json.product);
  console.log('\n# Copia y revisa la historia (120-150 chars) antes de importar:');
  console.log(formatDraftAsCsvLine(row));
  console.log(`# Longitud actual de short_history: ${row.short_history.length} caracteres\n`);
}

if (require.main === module) {
  runCli().catch((err) => {
    console.error('[BeerDex Lookup] Error:', err);
    process.exit(1);
  });
}

import fs from 'node:fs';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { AppDatabase, closeDb, initDb, schema } from './index';
import { isValidEan13 } from '../services/barcodeCatalog';
import { invalidateCatalogCache } from '../services/catalogCache';

export interface CatalogImportRow {
  brand_name: string;
  brand_logo_url?: string;
  brand_history?: string;
  beer_name: string;
  format: 'lata' | 'botellin' | 'litrona';
  barcode: string;
  short_history: string;
  style: string;
  abv: string;
  country: string;
}

const catalogRowSchema = z.object({
  brand_name: z.string().trim().min(1, 'brand_name obligatorio'),
  brand_logo_url: z.string().trim().optional(),
  brand_history: z.string().trim().optional(),
  beer_name: z.string().trim().min(1, 'beer_name obligatorio'),
  format: z.enum(['lata', 'botellin', 'litrona']),
  barcode: z
    .string()
    .trim()
    .refine(
      (code) => /^\d{8}$/.test(code) || isValidEan13(code),
      'barcode debe ser EAN-8 o EAN-13 con dígito de control válido'
    ),
  short_history: z
    .string()
    .trim()
    .min(120, 'short_history debe tener al menos 120 caracteres')
    .max(150, 'short_history no puede superar los 150 caracteres'),
  style: z.string().trim().min(1, 'style obligatorio'),
  abv: z.coerce
    .number()
    .min(0, 'abv no puede ser negativo')
    .max(25, 'abv demasiado alto')
    .transform((n) => n.toFixed(2)),
  country: z.string().trim().min(1, 'country obligatorio'),
});

export function parseCsvLines(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const clean = content.replace(/^\uFEFF/, '');
  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i];
    const next = clean[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\r' && next === '\n') {
      row.push(field);
      if (row.some((cell) => cell.trim() !== '')) rows.push(row);
      row = [];
      field = '';
      i += 1;
    } else if (ch === '\n' || ch === '\r') {
      row.push(field);
      if (row.some((cell) => cell.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  row.push(field);
  if (row.some((cell) => cell.trim() !== '')) rows.push(row);
  return rows;
}

export function parseCatalogCsv(content: string): CatalogImportRow[] {
  const matrix = parseCsvLines(content);
  if (matrix.length < 2) {
    throw new Error('El archivo CSV debe contener cabecera y al menos una fila.');
  }

  const headers = matrix[0].map((h) => h.trim());
  const rows: CatalogImportRow[] = [];

  for (let i = 1; i < matrix.length; i += 1) {
    const values = matrix[i];
    const rawObj: Record<string, string> = {};
    for (let col = 0; col < headers.length; col += 1) {
      rawObj[headers[col]] = (values[col] ?? '').trim();
    }
    const parsed = catalogRowSchema.safeParse(rawObj);
    if (!parsed.success) {
      const msg = parsed.error.issues
        .map((iss) => `${iss.path.join('.')}: ${iss.message}`)
        .join('; ');
      throw new Error(`Fila CSV ${i + 1} inválida: ${msg}`);
    }
    rows.push(parsed.data);
  }

  return rows;
}

export async function importCatalogEntries(
  db: AppDatabase,
  rawEntries: unknown[]
): Promise<{ brandsProcessed: number; beersUpserted: number }> {
  const validated = rawEntries.map((item, idx) => {
    const res = catalogRowSchema.safeParse(item);
    if (!res.success) {
      const msg = res.error.issues
        .map((iss) => `${iss.path.join('.')}: ${iss.message}`)
        .join('; ');
      throw new Error(`Entrada #${idx + 1} inválida: ${msg}`);
    }
    return res.data;
  });

  const brandIdCache = new Map<string, number>();

  for (const row of validated) {
    let brandId = brandIdCache.get(row.brand_name);
    if (!brandId) {
      const [brand] = await db
        .insert(schema.brands)
        .values({
          name: row.brand_name,
          logoUrl: row.brand_logo_url || null,
          history: row.brand_history || null,
        })
        .onConflictDoUpdate({
          target: schema.brands.name,
          set: {
            ...(row.brand_logo_url ? { logoUrl: row.brand_logo_url } : {}),
            ...(row.brand_history ? { history: row.brand_history } : {}),
          },
        })
        .returning();
      brandId = brand.id;
      brandIdCache.set(row.brand_name, brandId);
    }

    await db
      .insert(schema.beers)
      .values({
        brandId,
        name: row.beer_name,
        format: row.format,
        barcode: row.barcode,
        shortHistory: row.short_history,
        style: row.style,
        abv: row.abv,
        country: row.country,
      })
      .onConflictDoUpdate({
        target: schema.beers.barcode,
        set: {
          brandId,
          name: row.beer_name,
          format: row.format,
          shortHistory: row.short_history,
          style: row.style,
          abv: row.abv,
          country: row.country,
        },
      });
  }

  await db.execute(
    sql`SELECT setval(pg_get_serial_sequence('brands', 'id'), COALESCE((SELECT MAX(id) FROM brands), 1))`
  );
  await db.execute(
    sql`SELECT setval(pg_get_serial_sequence('beers', 'id'), COALESCE((SELECT MAX(id) FROM beers), 1))`
  );

  invalidateCatalogCache();

  return {
    brandsProcessed: brandIdCache.size,
    beersUpserted: validated.length,
  };
}

async function runCli(): Promise<void> {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error(
      'Uso: npm run catalog:import -- <ruta-al-archivo.csv|json>'
    );
    process.exit(1);
  }

  const resolvedPath = path.resolve(process.cwd(), fileArg);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Archivo no encontrado: ${resolvedPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(resolvedPath, 'utf8');
  const entries = resolvedPath.toLowerCase().endsWith('.json')
    ? (JSON.parse(content) as unknown[])
    : parseCatalogCsv(content);

  const db = await initDb();
  const result = await importCatalogEntries(db, entries);
  console.log(
    `[BeerDex Import] Completado: ${result.brandsProcessed} marcas procesadas, ${result.beersUpserted} cervezas importadas/actualizadas.`
  );
  await closeDb();
}

if (require.main === module) {
  runCli().catch((err) => {
    console.error('[BeerDex Import] Error:', err);
    process.exit(1);
  });
}

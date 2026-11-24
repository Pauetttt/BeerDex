import { eq } from 'drizzle-orm';
import { closeDb, initDb, schema } from './index';
import { seedDatabase } from './seedData';
import { backfillUserChapasIfNeeded } from '../services/profileService';

async function main(): Promise<void> {
  const db = await initDb();
  const summary = await seedDatabase(db);

  const pendingUsers = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.chapasBackfilled, false));

  for (const u of pendingUsers) {
    await backfillUserChapasIfNeeded(db, u.id);
  }

  console.log(
    `[BeerDex Seed] Completado: ${summary.brands} marcas, ${summary.beers} cervezas, ` +
      `${summary.achievements} logros, ${summary.titles} títulos, ${summary.icons} iconos, ${summary.cosmetics} cosméticos.` +
      (pendingUsers.length > 0 ? ` Backfill Chapas: ${pendingUsers.length} usuarios.` : '')
  );
  await closeDb();
}

main().catch((err) => {
  console.error('[BeerDex Seed] Error:', err);
  process.exit(1);
});

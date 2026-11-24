import { sql } from 'drizzle-orm';
import { app } from './app';
import { env } from './config/env';
import { getDbDriver, initDb, schema } from './db';
import { seedDatabase } from './db/seedData';

async function bootstrap(): Promise<void> {
  const db = await initDb();
  const driver = getDbDriver();

  // En modo local PGlite, si la BD está vacía la sembramos automáticamente para desarrollo plug-and-play
  if (driver === 'pglite') {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.brands);
    if (count === 0) {
      const summary = await seedDatabase(db);
      console.log(
        `[BeerDex Local DB] Semilla automática cargada: ${summary.brands} marcas, ${summary.beers} cervezas, ${summary.achievements} logros.`
      );
    }
  }

  app.listen(env.port, () => {
    console.log(
      `[BeerDex API] Escuchando en http://localhost:${env.port} (driver: ${driver})`
    );
  });
}

bootstrap().catch((err) => {
  console.error('[BeerDex API] Fallo al arrancar:', err);
  process.exit(1);
});

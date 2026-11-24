import { bindings, defineConfig } from 'cf/config';

export default defineConfig({
  accountId: 'f8942e72520ed05bb0feda16350d950a',
  worker: {
    name: 'beerdex',
    entrypoint: './worker/index.ts',
    compatibilityDate: '2026-11-24',
    workersDev: true,
    assets: {
      notFoundHandling: 'single-page-application',
      runWorkerFirst: ['/api/*'],
    },
    placement: {
      region: 'aws:eu-central-1',
    },
    observability: {
      enabled: true,
      logs: { enabled: true, headSamplingRate: 1 },
      traces: { enabled: true, headSamplingRate: 0.1 },
    },
    env: {
      AI: bindings.ai(),
      ANTI_CHEAT_STRICT: bindings.text('true'),
      DATABASE_URL: bindings.secret(),
      JWT_SECRET: bindings.secret(),
      JWT_REFRESH_SECRET: bindings.secret(),
      BLOB_READ_WRITE_TOKEN: bindings.secret(),
      FRONTEND_URL: bindings.text('*'),
      NODE_ENV: bindings.text('production'),
    },
  },
});

import path from 'node:path';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import multer from 'multer';
import { env, isGeminiConfigured, isWorkersAiConfigured } from './config/env';
import { isWorkersRuntime } from './config/runtimeBindings';
import { getDbDriver, initDb } from './db';
import achievementsRouter from './routes/achievements';
import authRouter from './routes/auth';
import beerdexRouter from './routes/beerdex';
import friendsRouter from './routes/friends';
import meRouter from './routes/me';
import shopRouter from './routes/shop';
import { getActiveStorageProvider } from './services/storageService';
import { HttpError } from './utils/httpError';

export const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      const configured = env.frontendUrl;
      if (!origin || configured === '*') {
        callback(null, true);
        return;
      }
      const allowed = configured
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      callback(null, allowed.includes(origin));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '3mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(async (_req, _res, next) => {
  try {
    await initDb();
    next();
  } catch (err) {
    next(err);
  }
});

// Servir imágenes locales en desarrollo Node cuando no se usa almacenamiento cloud
if (typeof __dirname === 'string' && !isWorkersRuntime()) {
  const uploadsDir = path.resolve(__dirname, '../uploads');
  app.use('/uploads', express.static(uploadsDir));
}

app.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'beerdex-api',
    health: '/api/health',
  });
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'beerdex-api',
    driver: getDbDriver(),
    storage: getActiveStorageProvider(),
    antiCheat: isGeminiConfigured()
      ? 'gemini'
      : isWorkersAiConfigured()
        ? 'workers-ai'
        : 'disabled',
  });
});

app.use('/api/auth', authRouter);
app.use('/api/me', meRouter);
app.use('/api/achievements', achievementsRouter);
app.use('/api/shop', shopRouter);
app.use('/api', beerdexRouter);
app.use('/api', friendsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: err.message,
      ...(err.details ?? {}),
    });
    return;
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        error: 'La foto supera el tamaño máximo de 2 MB.',
      });
      return;
    }
    res.status(400).json({ error: `Error al subir archivo: ${err.message}` });
    return;
  }

  console.error('[BeerDex API Error]', err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

export default app;

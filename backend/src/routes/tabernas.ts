import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db';
import { AuthenticatedRequest, requireAuth } from '../middleware/authMiddleware';
import {
  createTaberna,
  deleteTaberna,
  exploreTabernas,
  getTabernaDetail,
  getTabernaMission,
  getTabernaRanking,
  joinTaberna,
  kickTabernaMember,
  leaveTaberna,
  listMyTabernas,
  listTabernaRequests,
  respondTabernaRequest,
  scanForTaberna,
  updateTaberna,
} from '../services/tabernaService';
import { asyncHandler, HttpError, isUuid } from '../utils/httpError';

const router = Router();
router.use(requireAuth);

const createTabernaSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'El nombre de la Taberna debe tener al menos 3 caracteres.')
    .max(30, 'El nombre de la Taberna no puede superar los 30 caracteres.'),
  description: z
    .string()
    .trim()
    .max(200, 'La descripción no puede superar los 200 caracteres.')
    .default(''),
  visibility: z.enum(['public', 'private']).default('public'),
  minBeers: z.coerce
    .number()
    .int()
    .min(0, 'El requisito mínimo de cervezas debe ser 0 o mayor.')
    .max(10000)
    .default(0),
});

const updateTabernaSchema = z
  .object({
    description: z
      .string()
      .trim()
      .max(200, 'La descripción no puede superar los 200 caracteres.')
      .optional(),
    visibility: z.enum(['public', 'private']).optional(),
    minBeers: z.coerce
      .number()
      .int()
      .min(0, 'El requisito mínimo de cervezas debe ser 0 o mayor.')
      .max(10000)
      .optional(),
  })
  .refine(
    (data) =>
      data.description !== undefined ||
      data.visibility !== undefined ||
      data.minBeers !== undefined,
    { message: 'Debes indicar al menos un campo a actualizar.' }
  );

const scanTabernaSchema = z
  .object({
    code: z.string().trim().optional(),
    beerId: z.coerce.number().int().positive().optional(),
    frameBase64: z
      .string()
      .max(2_500_000, 'La captura enviada es demasiado grande.')
      .optional(),
  })
  .refine((d) => Boolean(d.code || d.beerId), {
    message: 'Debes enviar un código de barras o el ID de cerveza.',
  });

function assertUuidParam(value: unknown, label: string): string {
  const str = String(value || '').trim();
  if (!isUuid(str)) {
    throw new HttpError(400, `${label} inválido.`);
  }
  return str;
}

router.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const tabernas = await listMyTabernas(db, req.userId!);
    res.json({ tabernas });
  })
);

// Declarar /explore y /ranking ANTES de /:id para evitar colisión de rutas
router.get(
  '/explore',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const tabernas = await exploreTabernas(db, req.userId!, q);
    res.json({ tabernas });
  })
);

router.get(
  '/ranking',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const scope = req.query.scope === 'monthly' ? 'monthly' : 'global';
    const result = await getTabernaRanking(db, req.userId!, scope);
    res.json(result);
  })
);

router.post(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = createTabernaSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message || 'Datos inválidos.');
    }
    const db = getDb();
    const result = await createTaberna(db, req.userId!, parsed.data);
    res.status(201).json(result);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const tabernaId = assertUuidParam(req.params.id, 'ID de Taberna');
    const db = getDb();
    const detail = await getTabernaDetail(db, tabernaId, req.userId!);
    res.json(detail);
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const tabernaId = assertUuidParam(req.params.id, 'ID de Taberna');
    const parsed = updateTabernaSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message || 'Datos inválidos.');
    }
    const db = getDb();
    const taberna = await updateTaberna(db, tabernaId, req.userId!, parsed.data);
    res.json({ taberna });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const tabernaId = assertUuidParam(req.params.id, 'ID de Taberna');
    const db = getDb();
    const result = await deleteTaberna(db, tabernaId, req.userId!);
    res.json(result);
  })
);

router.post(
  '/:id/join',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const tabernaId = assertUuidParam(req.params.id, 'ID de Taberna');
    const db = getDb();
    const result = await joinTaberna(db, tabernaId, req.userId!);
    res.json(result);
  })
);

router.post(
  '/:id/leave',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const tabernaId = assertUuidParam(req.params.id, 'ID de Taberna');
    const db = getDb();
    const result = await leaveTaberna(db, tabernaId, req.userId!);
    res.json(result);
  })
);

router.get(
  '/:id/requests',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const tabernaId = assertUuidParam(req.params.id, 'ID de Taberna');
    const db = getDb();
    const requests = await listTabernaRequests(db, tabernaId, req.userId!);
    res.json({ requests });
  })
);

router.post(
  '/:id/requests/:rid/accept',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const tabernaId = assertUuidParam(req.params.id, 'ID de Taberna');
    const requestId = assertUuidParam(req.params.rid, 'ID de solicitud');
    const db = getDb();
    const result = await respondTabernaRequest(
      db,
      tabernaId,
      requestId,
      req.userId!,
      'accept'
    );
    res.json(result);
  })
);

router.post(
  '/:id/requests/:rid/reject',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const tabernaId = assertUuidParam(req.params.id, 'ID de Taberna');
    const requestId = assertUuidParam(req.params.rid, 'ID de solicitud');
    const db = getDb();
    const result = await respondTabernaRequest(
      db,
      tabernaId,
      requestId,
      req.userId!,
      'reject'
    );
    res.json(result);
  })
);

router.delete(
  '/:id/members/:userId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const tabernaId = assertUuidParam(req.params.id, 'ID de Taberna');
    const targetUserId = assertUuidParam(req.params.userId, 'ID de usuario');
    const db = getDb();
    const result = await kickTabernaMember(db, tabernaId, req.userId!, targetUserId);
    res.json(result);
  })
);

router.get(
  '/:id/mission',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const tabernaId = assertUuidParam(req.params.id, 'ID de Taberna');
    const db = getDb();
    const mission = await getTabernaMission(db, tabernaId);
    res.json({ mission });
  })
);

router.post(
  '/:id/scan',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const tabernaId = assertUuidParam(req.params.id, 'ID de Taberna');
    const parsed = scanTabernaSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message || 'Datos de escaneo inválidos.');
    }
    const db = getDb();
    const result = await scanForTaberna(db, tabernaId, req.userId!, parsed.data);
    res.json(result);
  })
);

export default router;

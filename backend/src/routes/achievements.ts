import { Router } from 'express';
import { getDb } from '../db';
import { AuthenticatedRequest, requireAuth } from '../middleware/authMiddleware';
import { getUserAchievementsList } from '../services/profileService';
import { asyncHandler } from '../utils/httpError';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const result = await getUserAchievementsList(db, req.userId!);
    res.json(result);
  })
);

export default router;

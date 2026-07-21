import { Router } from 'express';
import { getOverview } from '../controllers/metricsController';
import { authMiddleware, requirePermission } from '../middlewares/auth';

const router = Router();

router.get('/:location_id?', authMiddleware, requirePermission('DASHBOARD'), getOverview);

export default router;

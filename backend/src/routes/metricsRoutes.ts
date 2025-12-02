import { Router } from 'express';
import { getOverview } from '../controllers/metricsController';
import { authMiddleware, requirePermission } from '../middlewares/auth';

const router = Router();

router.get('/', authMiddleware, requirePermission('DASHBOARD'), getOverview);

export default router;

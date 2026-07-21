import { Router } from 'express';
import { getOverview } from '../controllers/metricsController';
import { authMiddleware, requirePermission } from '../middlewares/auth';

const router = Router();

// Query params suportados: from, to, status e location (código da loja/unidade)
router.get('/', authMiddleware, requirePermission('DASHBOARD'), getOverview);

export default router;

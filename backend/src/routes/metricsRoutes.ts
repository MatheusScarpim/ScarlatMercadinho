import { Router } from 'express';
import { getOverview } from '../controllers/metricsController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

router.get('/', authMiddleware, getOverview);

export default router;

import { Router } from 'express';
import * as controller from '../controllers/pendingProductController';
import { authMiddleware, requirePermission } from '../middlewares/auth';

const router = Router();

router.get('/', authMiddleware, requirePermission('PRODUCTS'), controller.listPendingProducts);
router.post('/:id/resolve', authMiddleware, requirePermission('PRODUCTS'), controller.resolvePendingProduct);
router.post('/:id/ignore', authMiddleware, requirePermission('PRODUCTS'), controller.ignorePendingProduct);

export default router;

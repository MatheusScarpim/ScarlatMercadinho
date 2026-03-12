import { Router } from 'express';
import * as controller from '../controllers/batchController';
import { authMiddleware, requirePermission } from '../middlewares/auth';

const router = Router();

// Rotas públicas (usadas pelo quiosque)
router.get('/expiring', controller.listExpiringBatches);
router.get('/product/:productId/price', controller.getProductPrice);
router.get('/product/:productId', controller.listProductBatches);

// Rotas protegidas (admin)
router.get('/critical-count', authMiddleware, requirePermission('EXPIRING_PRODUCTS'), controller.getCriticalCount);
router.post('/update-prices', authMiddleware, requirePermission('EXPIRING_PRODUCTS'), controller.updateBatchPrices);
router.post('/migrate', authMiddleware, requirePermission('EXPIRING_PRODUCTS'), controller.migrateBatches);
router.patch('/:id/discount', authMiddleware, requirePermission('EXPIRING_PRODUCTS'), controller.updateBatchDiscount);

export default router;

import { Router } from 'express';
import * as controller from '../controllers/productController';
import * as refreshController from '../controllers/refreshController';
import { authMiddleware, adminOnly, requirePermission } from '../middlewares/auth';

const router = Router();

// Refresh de preços (admin only)
router.post('/refresh', authMiddleware, adminOnly, refreshController.triggerRefresh);
router.get('/refresh/status', authMiddleware, adminOnly, refreshController.refreshStatus);
router.post('/refresh/abort', authMiddleware, adminOnly, refreshController.refreshAbort);
router.get('/refresh/stream', authMiddleware, adminOnly, refreshController.refreshStream);

router.get('/price-outliers', authMiddleware, requirePermission('PRODUCTS'), controller.listPriceOutliers);

router.post('/', authMiddleware, requirePermission('PRODUCTS'), controller.createProduct);
router.get('/', controller.listProducts);
router.get('/barcode/:barcode', controller.findByBarcode);
router.get('/:id', controller.getProduct);
router.put('/:id', authMiddleware, requirePermission('PRODUCTS'), controller.updateProduct);
router.delete('/:id', authMiddleware, requirePermission('PRODUCTS'), controller.deleteProduct);

export default router;

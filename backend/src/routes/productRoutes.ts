import { Router } from 'express';
import * as controller from '../controllers/productController';
import { authMiddleware, requirePermission } from '../middlewares/auth';

const router = Router();

router.post('/', authMiddleware, requirePermission('PRODUCTS'), controller.createProduct);
router.get('/', controller.listProducts);
router.get('/barcode/:barcode', controller.findByBarcode);
router.get('/:id', controller.getProduct);
router.put('/:id', authMiddleware, requirePermission('PRODUCTS'), controller.updateProduct);
router.delete('/:id', authMiddleware, requirePermission('PRODUCTS'), controller.deleteProduct);

export default router;

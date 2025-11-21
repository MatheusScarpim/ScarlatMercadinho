import { Router } from 'express';
import * as controller from '../controllers/productController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

router.post('/', authMiddleware, controller.createProduct);
router.get('/', controller.listProducts);
router.get('/barcode/:barcode', controller.findByBarcode);
router.get('/:id', controller.getProduct);
router.put('/:id', authMiddleware, controller.updateProduct);
router.delete('/:id', authMiddleware, controller.deleteProduct);

export default router;

import { Router } from 'express';
import * as controller from '../controllers/stockMovementController';
import { authMiddleware, requirePermission } from '../middlewares/auth';

const router = Router();

router.use(authMiddleware, requirePermission(['STOCK_MOVEMENTS', 'PRODUCTS']));

router.get('/', controller.listMovements);
router.get('/summary', controller.summary);
router.post('/', controller.createAdjustment);
router.post('/transfer', controller.transfer);

export default router;

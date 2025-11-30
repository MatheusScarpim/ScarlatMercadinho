import { Router } from 'express';
import * as controller from '../controllers/stockMovementController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

router.get('/', controller.listMovements);
router.get('/summary', controller.summary);
router.post('/', authMiddleware, controller.createAdjustment);
router.post('/transfer', authMiddleware, controller.transfer);

export default router;

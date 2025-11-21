import { Router } from 'express';
import * as controller from '../controllers/stockMovementController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

router.get('/', controller.listMovements);
router.post('/', authMiddleware, controller.createAdjustment);

export default router;

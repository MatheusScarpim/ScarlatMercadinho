import { Router } from 'express';
import * as controller from '../controllers/unitController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

router.post('/', authMiddleware, controller.createUnit);
router.get('/', controller.listUnits);
router.get('/:id', controller.getUnit);
router.put('/:id', authMiddleware, controller.updateUnit);
router.delete('/:id', authMiddleware, controller.deleteUnit);

export default router;

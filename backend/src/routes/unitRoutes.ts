import { Router } from 'express';
import * as controller from '../controllers/unitController';
import { authMiddleware, requirePermission } from '../middlewares/auth';

const router = Router();

router.post('/', authMiddleware, requirePermission('UNITS'), controller.createUnit);
router.get('/', controller.listUnits);
router.get('/:id', controller.getUnit);
router.put('/:id', authMiddleware, requirePermission('UNITS'), controller.updateUnit);
router.delete('/:id', authMiddleware, requirePermission('UNITS'), controller.deleteUnit);

export default router;

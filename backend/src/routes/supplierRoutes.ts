import { Router } from 'express';
import * as controller from '../controllers/supplierController';
import { authMiddleware, requirePermission } from '../middlewares/auth';

const router = Router();

router.post('/', authMiddleware, requirePermission('SUPPLIERS'), controller.createSupplier);
router.get('/', controller.listSuppliers);
router.get('/:id', controller.getSupplier);
router.put('/:id', authMiddleware, requirePermission('SUPPLIERS'), controller.updateSupplier);
router.delete('/:id', authMiddleware, requirePermission('SUPPLIERS'), controller.deleteSupplier);

export default router;

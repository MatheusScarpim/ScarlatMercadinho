import { Router } from 'express';
import * as controller from '../controllers/supplierController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

router.post('/', authMiddleware, controller.createSupplier);
router.get('/', controller.listSuppliers);
router.get('/:id', controller.getSupplier);
router.put('/:id', authMiddleware, controller.updateSupplier);
router.delete('/:id', authMiddleware, controller.deleteSupplier);

export default router;

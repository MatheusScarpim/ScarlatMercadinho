import { Router } from 'express';
import * as controller from '../controllers/saleController';
import { authMiddleware, requirePermission, kioskOrAuth } from '../middlewares/auth';

const router = Router();

router.post('/', kioskOrAuth, controller.createSale);
router.post('/:id/items', kioskOrAuth, controller.addItem);
router.put('/:id/items/:itemId', kioskOrAuth, controller.updateItem);
router.delete('/:id/items/:itemId', kioskOrAuth, controller.removeItem);
router.post('/:id/complete', kioskOrAuth, controller.completeSale);
router.post('/:id/cancel', kioskOrAuth, controller.cancelSale);
router.put('/:id/customer', kioskOrAuth, controller.setCustomer);
router.get('/', authMiddleware, requirePermission('SALES'), controller.listSales);
router.get('/:id', authMiddleware, requirePermission('SALES'), controller.getSale);

export default router;

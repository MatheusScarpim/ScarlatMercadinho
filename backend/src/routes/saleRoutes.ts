import { Router } from 'express';
import * as controller from '../controllers/saleController';

const router = Router();

router.post('/', controller.createSale);
router.post('/:id/items', controller.addItem);
router.put('/:id/items/:itemId', controller.updateItem);
router.delete('/:id/items/:itemId', controller.removeItem);
router.post('/:id/complete', controller.completeSale);
router.post('/:id/cancel', controller.cancelSale);
router.put('/:id/customer', controller.setCustomer);
router.get('/', controller.listSales);
router.get('/:id', controller.getSale);

export default router;

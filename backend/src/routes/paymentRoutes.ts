import { Router } from 'express';
import { createPaymentIntent, paymentStatus, pointIntentStatus, cancelPointPayment } from '../controllers/paymentController';

const router = Router();

router.post('/sales/:saleId', createPaymentIntent);
router.get('/status/:paymentId', paymentStatus);
router.post('/point/:intentId/cancel', cancelPointPayment);
router.get('/point/:intentId', pointIntentStatus);

export default router;

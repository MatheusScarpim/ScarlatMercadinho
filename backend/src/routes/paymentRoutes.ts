import { Router } from 'express';
import { createPaymentIntent, paymentStatus, pointIntentStatus, cancelPointPayment, configureDevice, deviceStatus } from '../controllers/paymentController';

const router = Router();

router.post('/sales/:saleId', createPaymentIntent);
router.get('/status/:paymentId', paymentStatus);

// Rotas de device ANTES das rotas com :intentId
router.post('/point/device/configure', configureDevice);
router.get('/point/device/status', deviceStatus);

router.post('/point/:intentId/cancel', cancelPointPayment);
router.get('/point/:intentId', pointIntentStatus);

export default router;

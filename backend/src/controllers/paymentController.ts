import { Request, Response } from 'express';
import { ApiError } from '../utils/apiError';
import {
  createPixPaymentIntent,
  createPointPaymentIntent,
  getPaymentStatus,
  getPointIntentStatus
} from '../services/paymentGatewayService';

function resolvePointType(method: string, paymentType?: string) {
  if (paymentType === 'credit' || paymentType === 'debit') {
    return paymentType;
  }
  if (method === 'CREDIT_CARD') return 'credit';
  if (method === 'DEBIT_CARD') return 'debit';
  return undefined;
}

export async function createPaymentIntent(req: Request, res: Response) {
  const saleId = req.params.saleId;
  const method = (req.body.method || '').toUpperCase();

  if (!method) {
    throw new ApiError(400, 'Payment method is required');
  }

  if (method === 'PIX') {
    const providerResponse = await createPixPaymentIntent(saleId);
    return res.json({
      saleId,
      method,
      providerResponse
    });
  }

  const pointType = resolvePointType(method, req.body.paymentType);
  if (pointType) {
    const providerResponse = await createPointPaymentIntent(saleId, pointType);
    return res.json({
      saleId,
      method: 'POINT',
      paymentType: pointType,
      providerResponse
    });
  }

  throw new ApiError(400, 'Unsupported payment method');
}

export async function paymentStatus(req: Request, res: Response) {
  const paymentId = req.params.paymentId;
  if (!paymentId) {
    throw new ApiError(400, 'paymentId is required');
  }
  const status = await getPaymentStatus(paymentId);
  res.json(status);
}

export async function cancelPointPayment(req: Request, res: Response) {
  const intentId = req.params.intentId;
  if (!intentId) throw new ApiError(400, 'intentId is required');
  // Mantém stub para registro de tentativa; backend já tentou todos os caminhos de cancelamento e falhou.
  res.status(501).json({ message: 'Cancelamento não suportado via API. Use a maquininha para cancelar.' });
}

export async function pointIntentStatus(req: Request, res: Response) {
  const intentId = req.params.intentId;
  if (!intentId) throw new ApiError(400, 'intentId is required');
  const result = await getPointIntentStatus(intentId);
  res.json(result);
}

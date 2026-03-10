import { Request, Response } from 'express';
import {
  PaymentMethodRequiredError,
  UnsupportedPaymentMethodError,
} from '../errors/paymentErrors';
import {
  createPixPaymentIntent,
  createPointPaymentIntent,
  getPaymentStatus,
  getPointIntentStatus,
  configurePointDevice,
  getPointDeviceStatus
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
    throw new PaymentMethodRequiredError();
  }

  if (method === 'PIX') {
    const cpf = req.body.cpf || undefined;
    const providerResponse = await createPixPaymentIntent(saleId, cpf);
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

  throw new UnsupportedPaymentMethodError(method);
}

export async function paymentStatus(req: Request, res: Response) {
  const paymentId = req.params.paymentId;
  if (!paymentId) {
    throw new PaymentMethodRequiredError();
  }
  const status = await getPaymentStatus(paymentId);
  res.json(status);
}

export async function cancelPointPayment(req: Request, res: Response) {
  const intentId = req.params.intentId;
  if (!intentId) throw new PaymentMethodRequiredError();
  res.status(501).json({ message: 'Cancelamento não suportado via API. Use a maquininha para cancelar.' });
}

export async function pointIntentStatus(req: Request, res: Response) {
  const intentId = req.params.intentId;
  if (!intentId) throw new PaymentMethodRequiredError();
  const result = await getPointIntentStatus(intentId);
  res.json(result);
}

export async function configureDevice(_req: Request, res: Response) {
  const result = await configurePointDevice();
  res.json(result);
}

export async function deviceStatus(_req: Request, res: Response) {
  const result = await getPointDeviceStatus();
  res.json(result);
}

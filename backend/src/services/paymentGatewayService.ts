import { MercadoPagoConfig, Payment as MercadoPagoPayment } from 'mercadopago';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';
import { SaleModel } from '../models/Sale';
import { SaleItemModel } from '../models/SaleItem';
import { sanitizeSaleItems } from './saleService';

type PointPaymentType = 'credit' | 'debit';

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

function getMpClient() {
  if (!env.mpAccessToken) {
    throw new ApiError(500, 'MERCADO_PAGO_ACCESS_TOKEN not configured');
  }
  return new MercadoPagoConfig({ accessToken: env.mpAccessToken });
}

async function ensureSaleOpen(saleId: string) {
  const sale = await SaleModel.findById(saleId);
  if (!sale) {
    throw new ApiError(404, 'Sale not found');
  }
  if (sale.status !== 'OPEN') {
    throw new ApiError(400, 'Sale is not open for payment');
  }
  return sale;
}

async function getSaleItemsWithProducts(saleId: string) {
  const items = await SaleItemModel.find({ sale: saleId }).populate('product');
  if (!items.length) throw new ApiError(400, 'Sale has no items');
  return items;
}

function safeTotalAmount(items: any[], totals?: { totalAmount?: number }) {
  const rawTotal = totals && Number.isFinite(totals.totalAmount) ? totals.totalAmount : calcTotal(items);
  const total = Math.max(0, Number(Number(rawTotal || 0).toFixed(2)));
  if (total <= 0) {
    console.warn('[PAYMENTS] Total calculado zero/negativo', {
      rawTotal,
      items: items.map((i) => ({
        product: (i as any).product?._id || (i as any).product,
        unitPrice: i.unitPrice,
        qty: i.quantity,
        discount: i.discount,
        total: i.total
      }))
    });
  }
  return total;
}

function buildDescription(items: any[]) {
  return items
    .map((item) => {
      const product = (item as any).product;
      const name = product?.name || 'Item';
      return `${name} (${item.quantity}x)`;
    })
    .join(', ');
}

function calcTotal(items: any[]) {
  return items.reduce((sum, item) => sum + item.total, 0);
}

export async function createPixPaymentIntent(saleId: string) {
  await ensureSaleOpen(saleId);
  const { totals } = await sanitizeSaleItems(saleId);
  const items = await getSaleItemsWithProducts(saleId);
  const totalAmount = safeTotalAmount(items, totals);
  if (totalAmount <= 0) {
    throw new ApiError(400, 'transaction_amount must be positive');
  }
  const description = buildDescription(items);

  const payment = new MercadoPagoPayment(getMpClient());
  const body = {
    transaction_amount: totalAmount,
    description: description || 'Pagamento Mercadinho',
    payment_method_id: 'pix',
    payer: {
      email: 'pagamentos@scarlat.com'
    },
    metadata: {
      saleId
    }
  };

  const result = await payment.create({ body });

  return {
    qrCode: result.point_of_interaction?.transaction_data?.qr_code ?? null,
    qrCodeBase64: result.point_of_interaction?.transaction_data?.qr_code_base64 ?? null,
    paymentId: result.id?.toString() ?? '',
    status: result.status,
    status_detail: result.status_detail
  };
}

async function fetchPointIntent(intentId: string) {
  const url = `https://api.mercadopago.com/point/integration-api/payment-intents/${intentId}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.mpAccessToken}`,
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text || 'Point API error');
  }
  return (await res.json()) as any;
}

async function waitForPointCompletion(intentId: string, maxAttempts = 15, baseIntervalMs = 2000) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const status = await fetchPointIntent(intentId);
    const state = status.state || status.status;
    if (['APPROVED', 'approved', 'FINISHED'].includes(state)) {
      return status;
    }
    if (['REJECTED', 'rejected', 'CANCELED', 'cancelled', 'EXPIRED', 'expired'].includes(state)) {
      throw new ApiError(400, `Pagamento não aprovado: ${state}`);
    }
    await new Promise((resolve) => setTimeout(resolve, baseIntervalMs));
  }
  throw new ApiError(504, 'Tempo limite aguardando pagamento na maquininha');
}

export async function createPointPaymentIntent(
  saleId: string,
  paymentType: PointPaymentType
) {
  await ensureSaleOpen(saleId);
  const { totals } = await sanitizeSaleItems(saleId);
  const items = await getSaleItemsWithProducts(saleId);
  const totalAmount = safeTotalAmount(items, totals);
  if (totalAmount <= 0) {
    throw new ApiError(400, 'transaction_amount must be positive');
  }
  const description = buildDescription(items);

  if (!env.mpPointDeviceId) {
    throw new ApiError(500, 'MERCADO_PAGO_POINT_DEVICE_ID not configured');
  }

  const amountInCents = Math.round(totalAmount * 100);
  const requestData: any = {
    amount: amountInCents,
    description: description || 'Pagamento Mercadinho',
    payment: {
      type: paymentType === 'credit' ? 'credit_card' : 'debit_card',
      ...(paymentType === 'credit' && { installments: 1, installments_cost: 'seller' })
    },
    additional_info: {
      external_reference: saleId,
      print_on_terminal: false
    }
  };

  const createUrl = `https://api.mercadopago.com/point/integration-api/devices/${env.mpPointDeviceId}/payment-intents`;
  const res = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.mpAccessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestData)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text || 'Point API error');
  }

  const paymentIntent = (await res.json()) as any;
  return {
    intentId: paymentIntent.id,
    state: paymentIntent.state || paymentIntent.status,
    payment: paymentIntent
  };
}

export async function getPaymentStatus(paymentId: string) {
  const payment = new MercadoPagoPayment(getMpClient());
  const result = await payment.get({ id: Number(paymentId) });
  if (!result) {
    throw new ApiError(404, 'Pagamento não encontrado');
  }
  return {
    status: result.status,
    status_detail: result.status_detail,
    paymentId: result.id,
    date_created: result.date_created,
    date_approved: result.date_approved,
    payment_method: result.payment_method,
    transaction_amount: result.transaction_amount,
    description: result.description
  };
}

export async function cancelPointPaymentIntent(intentId: string) {
  // 1) tenta endpoint de transaction se houver
  let intent;
  try {
    intent = await getPointIntentStatus(intentId);
    console.log('[point-cancel] intent status', JSON.stringify(intent, null, 2));
    const orderId = intent?.order?.id || intent?.order_id;
    const transactionId =
      intent?.payment?.id ||
      intent?.payment_id ||
      intent?.transactions?.[0]?.id ||
      intent?.transaction_id;
    if (orderId && transactionId) {
      console.log('[point-cancel] cancelling via order/transaction', { orderId, transactionId });
      return await cancelOrderTransaction(orderId, transactionId);
    }
  } catch (err) {
    console.log('[point-cancel] no order/transaction, fallback', errorMessage(err));
  }

  const baseWithDevice = env.mpPointDeviceId
    ? `https://api.mercadopago.com/point/integration-api/devices/${env.mpPointDeviceId}/payment-intents/${intentId}`
    : '';
  const baseGeneric = `https://api.mercadopago.com/point/integration-api/payment-intents/${intentId}`;

  // 2) tenta endpoints /cancel
  const cancelEndpoints: { url: string; method: string }[] = [
    baseWithDevice && { url: `${baseWithDevice}/cancel`, method: 'POST' },
    baseWithDevice && { url: `${baseWithDevice}/cancel`, method: 'PUT' },
    baseWithDevice && { url: `${baseWithDevice}/cancel`, method: 'PATCH' },
    baseGeneric && { url: `${baseGeneric}/cancel`, method: 'POST' },
    baseGeneric && { url: `${baseGeneric}/cancel`, method: 'PUT' },
    baseGeneric && { url: `${baseGeneric}/cancel`, method: 'PATCH' }
  ].filter(Boolean) as any;

  for (const { url, method } of cancelEndpoints) {
    try {
      console.log('[point-cancel] trying', method, url);
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${env.mpAccessToken}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        try {
          return await res.json();
        } catch {
          return { status: 'cancelled' };
        }
      }
      const body = await res.text();
      console.log('[point-cancel] failed', { url, method, status: res.status, body });
    } catch (err: any) {
      console.log('[point-cancel] error', method, url, err?.message || err);
    }
  }

  // 3) loop de DELETE enquanto estado estiver ON_TERMINAL
  const deleteTargets = [baseWithDevice, baseGeneric].filter(Boolean) as string[];
  let attempts = 0;
  while (attempts < 10) {
    try {
      const status = await getPointIntentStatus(intentId);
      const state = (status?.state || status?.status || '').toUpperCase();
      console.log('[point-cancel] delete loop state', state);
      if (state && state !== 'ON_TERMINAL') {
        return { status: state };
      }
      for (const target of deleteTargets) {
        const res = await fetch(target, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${env.mpAccessToken}`,
            'Content-Type': 'application/json'
          }
        });
        if (res.ok) {
          return { status: 'cancelled' };
        }
        const body = await res.text();
        console.log('[point-cancel] delete failed', { url: target, status: res.status, body });
        if (res.status === 409 || res.status === 423) {
          continue;
        }
      }
    } catch (err) {
      console.log('[point-cancel] delete loop error', errorMessage(err));
    }
    attempts++;
    await new Promise((resolve) => setTimeout(resolve, 700));
  }

  throw new ApiError(500, 'Point API cancel error');
}

export async function getPointIntentStatus(intentId: string) {
  const url = `https://api.mercadopago.com/point/integration-api/payment-intents/${intentId}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.mpAccessToken}`,
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text || 'Point API status error');
  }
  return res.json();
}

async function cancelOrderTransaction(orderId: string, transactionId: string) {
  const url = `https://api.mercadopago.com/v1/orders/${orderId}/transactions/${transactionId}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${env.mpAccessToken}`,
      'Content-Type': 'application/json'
    }
  });
  if (res.status === 204 || res.status === 200) {
    return { status: 'cancelled' };
  }
  const body = await res.text();
  throw new ApiError(res.status, body || 'Point order transaction cancel error');
}

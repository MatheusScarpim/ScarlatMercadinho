import { MercadoPagoConfig, Payment as MercadoPagoPayment } from 'mercadopago';
import { env } from '../config/env';
import { SaleModel } from '../models/Sale';
import { SaleItemModel } from '../models/SaleItem';
import { sanitizeSaleItems } from './saleService';
import {
  PaymentError,
  MissingAccessTokenError,
  MissingDeviceIdError,
  SaleNotFoundError,
  SaleNotOpenError,
  SaleEmptyError,
  SaleZeroAmountError,
  PixQrCodeGenerationError,
  PixPaymentNotFoundError,
  PixStatusCheckError,
  PointPaymentTimeoutError,
  PointCancelFailedError,
  PointConnectionError,
  parsePointApiError,
  parseMpSdkError,
  parsePointState,
  getErrorFromPaymentStatus,
} from '../errors/paymentErrors';

type PointPaymentType = 'credit' | 'debit';

// ─── Configurar maquininha no modo PDV (auto-exibe pagamento) ───────────────

export async function configurePointDevice(): Promise<{ success: boolean; mode?: string; error?: string }> {
  if (!env.mpAccessToken || !env.mpPointDeviceId) {
    return { success: false, error: 'Access token ou device ID não configurados' };
  }

  const url = `https://api.mercadopago.com/point/integration-api/devices/${env.mpPointDeviceId}`;
  const body = JSON.stringify({ operating_mode: 'PDV' });
  const headers = {
    Authorization: `Bearer ${env.mpAccessToken}`,
    'Content-Type': 'application/json'
  };

  // Tenta PATCH primeiro, depois PUT (dependendo da versão da API do MP)
  for (const method of ['PATCH', 'PUT'] as const) {
    try {
      console.log(`[POINT] Tentando ${method} para configurar modo PDV...`);
      const res = await fetch(url, { method, headers, body });

      if (res.ok) {
        let data: any = {};
        try { data = await res.json(); } catch { /* sem body */ }
        console.log('[POINT] Maquininha configurada no modo PDV:', JSON.stringify(data));
        return { success: true, mode: data?.operating_mode || 'PDV' };
      }

      const text = await res.text();
      console.warn(`[POINT] ${method} falhou (${res.status}):`, text);

      // Se 405 (Method Not Allowed), tenta o próximo método
      if (res.status === 405) continue;

      // Outros erros, retorna
      return { success: false, error: `HTTP ${res.status}: ${text}` };
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Unknown error';
      console.error(`[POINT] Erro de rede no ${method}:`, msg);
      return { success: false, error: msg };
    }
  }

  return { success: false, error: 'Nenhum método HTTP funcionou para configurar o device' };
}

export async function getPointDeviceStatus(): Promise<any> {
  if (!env.mpAccessToken || !env.mpPointDeviceId) {
    throw new MissingDeviceIdError();
  }

  const url = `https://api.mercadopago.com/point/integration-api/devices/${env.mpPointDeviceId}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.mpAccessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw parsePointApiError(res.status, text, `device:${env.mpPointDeviceId}`);
  }

  return res.json();
}

function getMpClient() {
  if (!env.mpAccessToken) {
    throw new MissingAccessTokenError();
  }
  return new MercadoPagoConfig({ accessToken: env.mpAccessToken });
}

async function ensureSaleOpen(saleId: string) {
  const sale = await SaleModel.findById(saleId);
  if (!sale) {
    throw new SaleNotFoundError(saleId);
  }
  if (sale.status !== 'OPEN') {
    throw new SaleNotOpenError(saleId, sale.status);
  }
  return sale;
}

async function getSaleItemsWithProducts(saleId: string) {
  const items = await SaleItemModel.find({ sale: saleId }).populate('product');
  if (!items.length) throw new SaleEmptyError(saleId);
  return items;
}

function safeTotalAmount(items: any[], saleId: string, totals?: { totalAmount?: number }) {
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
    throw new SaleZeroAmountError(saleId, total);
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

// ─── PIX ────────────────────────────────────────────────────────────────────

export async function createPixPaymentIntent(saleId: string) {
  await ensureSaleOpen(saleId);
  const { totals } = await sanitizeSaleItems(saleId);
  const items = await getSaleItemsWithProducts(saleId);
  const totalAmount = safeTotalAmount(items, saleId, totals);
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

  let result: any;
  try {
    result = await payment.create({ body });
  } catch (err: unknown) {
    const paymentError = parseMpSdkError(err);
    console.error('[PIX] Erro ao criar pagamento PIX:', paymentError.code, paymentError.message);
    throw paymentError;
  }

  // Valida resposta
  if (!result) {
    throw new PixQrCodeGenerationError('Empty response from Mercado Pago');
  }

  // Verifica se já foi rejeitado na criação
  if (result.status === 'rejected') {
    const error = getErrorFromPaymentStatus('rejected', result.status_detail, result.id?.toString());
    if (error) throw error;
  }

  const qrCode = result.point_of_interaction?.transaction_data?.qr_code ?? null;
  const qrCodeBase64 = result.point_of_interaction?.transaction_data?.qr_code_base64 ?? null;

  if (!qrCode && !qrCodeBase64) {
    throw new PixQrCodeGenerationError('QR code data not returned by Mercado Pago');
  }

  return {
    qrCode,
    qrCodeBase64,
    paymentId: result.id?.toString() ?? '',
    status: result.status,
    status_detail: result.status_detail
  };
}

// ─── PIX Status ─────────────────────────────────────────────────────────────

export async function getPaymentStatus(paymentId: string) {
  const payment = new MercadoPagoPayment(getMpClient());

  let result: any;
  try {
    result = await payment.get({ id: Number(paymentId) });
  } catch (err: unknown) {
    const paymentError = parseMpSdkError(err);
    // Se for 404, usar erro específico
    if (paymentError.status === 404) {
      throw new PixPaymentNotFoundError(paymentId);
    }
    console.error('[PIX-STATUS] Erro ao consultar status:', paymentError.code, paymentError.message);
    throw new PixStatusCheckError(paymentId, paymentError.message);
  }

  if (!result) {
    throw new PixPaymentNotFoundError(paymentId);
  }

  // Verifica se há erro no status
  const statusError = getErrorFromPaymentStatus(
    result.status || '',
    result.status_detail || '',
    paymentId
  );

  return {
    status: result.status,
    status_detail: result.status_detail,
    paymentId: result.id,
    date_created: result.date_created,
    date_approved: result.date_approved,
    payment_method: result.payment_method,
    transaction_amount: result.transaction_amount,
    description: result.description,
    // Inclui info de erro se existir (para o frontend saber)
    ...(statusError && statusError.status >= 400 ? {
      error_code: statusError.code,
      error_message: statusError.userMessage,
      retryable: statusError.retryable
    } : {})
  };
}

// ─── Point (Maquininha) ─────────────────────────────────────────────────────

async function fetchPointIntent(intentId: string) {
  const url = `https://api.mercadopago.com/point/integration-api/payment-intents/${intentId}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${env.mpAccessToken}`,
        'Content-Type': 'application/json'
      }
    });
  } catch (err: unknown) {
    throw new PointConnectionError((err as Error)?.message || 'fetch failed');
  }

  if (!res.ok) {
    const text = await res.text();
    throw parsePointApiError(res.status, text, `intent:${intentId}`);
  }

  return (await res.json()) as any;
}

async function waitForPointCompletion(intentId: string, maxAttempts = 15, baseIntervalMs = 2000) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let status: any;
    try {
      status = await fetchPointIntent(intentId);
    } catch (err: unknown) {
      // Se for erro de rede/timeout, continua tentando
      if (err instanceof PaymentError && err.retryable && attempt < maxAttempts - 1) {
        console.warn(`[POINT] Attempt ${attempt + 1}: ${err.code} - ${err.message}`);
        await new Promise((resolve) => setTimeout(resolve, baseIntervalMs));
        continue;
      }
      throw err;
    }

    const state = status.state || status.status;
    const parsed = parsePointState(state);

    if (parsed.isTerminal) {
      if (parsed.error) throw parsed.error;
      return status; // APPROVED/FINISHED
    }

    await new Promise((resolve) => setTimeout(resolve, baseIntervalMs));
  }

  throw new PointPaymentTimeoutError();
}

export async function createPointPaymentIntent(
  saleId: string,
  paymentType: PointPaymentType
) {
  await ensureSaleOpen(saleId);
  const { totals } = await sanitizeSaleItems(saleId);
  const items = await getSaleItemsWithProducts(saleId);
  const totalAmount = safeTotalAmount(items, saleId, totals);
  const description = buildDescription(items);

  if (!env.mpPointDeviceId) {
    throw new MissingDeviceIdError();
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

  let res: Response;
  try {
    res = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.mpAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
  } catch (err: unknown) {
    throw new PointConnectionError((err as Error)?.message || 'fetch failed');
  }

  if (!res.ok) {
    const text = await res.text();
    const error = parsePointApiError(res.status, text, `device:${env.mpPointDeviceId}`);
    console.error('[POINT] Erro ao criar intent:', error.code, error.message);
    throw error;
  }

  const paymentIntent = (await res.json()) as any;
  console.log('[POINT] Intent criado:', JSON.stringify(paymentIntent));
  return {
    intentId: paymentIntent.id,
    state: paymentIntent.state || paymentIntent.status,
    payment: paymentIntent
  };
}

// ─── Point Status ───────────────────────────────────────────────────────────

export async function getPointIntentStatus(intentId: string) {
  const url = `https://api.mercadopago.com/point/integration-api/payment-intents/${intentId}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${env.mpAccessToken}`,
        'Content-Type': 'application/json'
      }
    });
  } catch (err: unknown) {
    throw new PointConnectionError((err as Error)?.message || 'fetch failed');
  }

  if (!res.ok) {
    const text = await res.text();
    throw parsePointApiError(res.status, text, `intent:${intentId}`);
  }

  const data = await res.json();
  console.log('[POINT-STATUS] Resposta MP bruta:', JSON.stringify(data));
  const state = (data as any)?.state || (data as any)?.status;

  // Adiciona info de erro se for estado terminal com erro
  if (state) {
    const parsed = parsePointState(state);
    if (parsed.isTerminal && parsed.error) {
      return {
        ...data,
        error_code: parsed.error.code,
        error_message: parsed.error.userMessage,
        retryable: parsed.error.retryable
      };
    }
  }

  return data;
}

// ─── Point Cancel ───────────────────────────────────────────────────────────

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
    const msg = err instanceof PaymentError ? `${err.code}: ${err.message}` : String(err);
    console.log('[point-cancel] no order/transaction, fallback', msg);
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
      const state = ((status as any)?.state || (status as any)?.status || '').toUpperCase();
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
      const msg = err instanceof PaymentError ? `${err.code}: ${err.message}` : String(err);
      console.log('[point-cancel] delete loop error', msg);
    }
    attempts++;
    await new Promise((resolve) => setTimeout(resolve, 700));
  }

  throw new PointCancelFailedError('All cancel attempts exhausted');
}

async function cancelOrderTransaction(orderId: string, transactionId: string) {
  const url = `https://api.mercadopago.com/v1/orders/${orderId}/transactions/${transactionId}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${env.mpAccessToken}`,
        'Content-Type': 'application/json'
      }
    });
  } catch (err: unknown) {
    throw new PointConnectionError((err as Error)?.message || 'cancel order fetch failed');
  }

  if (res.status === 204 || res.status === 200) {
    return { status: 'cancelled' };
  }
  const body = await res.text();
  throw parsePointApiError(res.status, body, 'order-cancel');
}

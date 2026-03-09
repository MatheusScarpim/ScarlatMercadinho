import { ApiError } from '../utils/apiError';

// ─── Classe base para erros de pagamento ────────────────────────────────────
export class PaymentError extends ApiError {
  code: string;
  userMessage: string;
  retryable: boolean;

  constructor(
    status: number,
    code: string,
    message: string,
    userMessage: string,
    retryable = false
  ) {
    super(status, message);
    this.code = code;
    this.userMessage = userMessage;
    this.retryable = retryable;
  }
}

// ─── Exceções de configuração ───────────────────────────────────────────────
export class MissingAccessTokenError extends PaymentError {
  constructor() {
    super(500, 'MP_MISSING_ACCESS_TOKEN', 'MERCADO_PAGO_ACCESS_TOKEN not configured', 'Erro de configuração do sistema de pagamento. Contate o administrador.', false);
  }
}

export class MissingDeviceIdError extends PaymentError {
  constructor() {
    super(500, 'MP_MISSING_DEVICE_ID', 'MERCADO_PAGO_POINT_DEVICE_ID not configured', 'Maquininha de cartão não configurada. Contate o administrador.', false);
  }
}

export class InvalidAccessTokenError extends PaymentError {
  constructor() {
    super(401, 'MP_INVALID_ACCESS_TOKEN', 'Invalid Mercado Pago access token', 'Credenciais do sistema de pagamento inválidas. Contate o administrador.', false);
  }
}

// ─── Exceções de venda ──────────────────────────────────────────────────────
export class SaleNotFoundError extends PaymentError {
  constructor(saleId: string) {
    super(404, 'SALE_NOT_FOUND', `Sale ${saleId} not found`, 'Venda não encontrada.', false);
  }
}

export class SaleNotOpenError extends PaymentError {
  constructor(saleId: string, currentStatus: string) {
    super(400, 'SALE_NOT_OPEN', `Sale ${saleId} is ${currentStatus}, not OPEN`, 'Esta venda já foi finalizada ou cancelada.', false);
  }
}

export class SaleEmptyError extends PaymentError {
  constructor(saleId: string) {
    super(400, 'SALE_EMPTY', `Sale ${saleId} has no items`, 'Adicione produtos antes de realizar o pagamento.', false);
  }
}

export class SaleZeroAmountError extends PaymentError {
  constructor(saleId: string, amount: number) {
    super(400, 'SALE_ZERO_AMOUNT', `Sale ${saleId} total is ${amount}`, 'O valor total da venda deve ser maior que zero.', false);
  }
}

// ─── Exceções de método de pagamento ────────────────────────────────────────
export class UnsupportedPaymentMethodError extends PaymentError {
  constructor(method: string) {
    super(400, 'UNSUPPORTED_PAYMENT_METHOD', `Unsupported payment method: ${method}`, `Método de pagamento "${method}" não é suportado.`, false);
  }
}

export class PaymentMethodRequiredError extends PaymentError {
  constructor() {
    super(400, 'PAYMENT_METHOD_REQUIRED', 'Payment method is required', 'Selecione uma forma de pagamento.', false);
  }
}

// ─── Exceções PIX ───────────────────────────────────────────────────────────
export class PixQrCodeGenerationError extends PaymentError {
  constructor(detail?: string) {
    super(502, 'PIX_QR_CODE_GENERATION_FAILED', `Failed to generate PIX QR code: ${detail || 'unknown'}`, 'Não foi possível gerar o QR Code PIX. Tente novamente.', true);
  }
}

export class PixPaymentPendingError extends PaymentError {
  constructor(paymentId: string) {
    super(200, 'PIX_PAYMENT_PENDING', `PIX payment ${paymentId} is pending`, 'Aguardando pagamento PIX...', false);
  }
}

export class PixPaymentExpiredError extends PaymentError {
  constructor(paymentId: string) {
    super(400, 'PIX_PAYMENT_EXPIRED', `PIX payment ${paymentId} expired`, 'O QR Code PIX expirou. Gere um novo pagamento.', true);
  }
}

export class PixPaymentRejectedError extends PaymentError {
  constructor(paymentId: string, reason?: string) {
    super(400, 'PIX_PAYMENT_REJECTED', `PIX payment ${paymentId} rejected: ${reason || 'unknown'}`, 'Pagamento PIX rejeitado. Tente novamente com outro método.', true);
  }
}

export class PixPaymentCancelledError extends PaymentError {
  constructor(paymentId: string) {
    super(400, 'PIX_PAYMENT_CANCELLED', `PIX payment ${paymentId} cancelled`, 'Pagamento PIX foi cancelado.', true);
  }
}

export class PixPaymentRefundedError extends PaymentError {
  constructor(paymentId: string) {
    super(400, 'PIX_PAYMENT_REFUNDED', `PIX payment ${paymentId} refunded`, 'Pagamento PIX foi estornado.', false);
  }
}

export class PixPaymentChargebackError extends PaymentError {
  constructor(paymentId: string) {
    super(400, 'PIX_PAYMENT_CHARGEBACK', `PIX payment ${paymentId} chargebacked`, 'Pagamento PIX sofreu chargeback.', false);
  }
}

export class PixPaymentInMediationError extends PaymentError {
  constructor(paymentId: string) {
    super(400, 'PIX_PAYMENT_IN_MEDIATION', `PIX payment ${paymentId} in mediation`, 'Pagamento PIX está em mediação/disputa.', false);
  }
}

export class PixPaymentNotFoundError extends PaymentError {
  constructor(paymentId: string) {
    super(404, 'PIX_PAYMENT_NOT_FOUND', `PIX payment ${paymentId} not found`, 'Pagamento PIX não encontrado. Gere um novo pagamento.', true);
  }
}

export class PixStatusCheckError extends PaymentError {
  constructor(paymentId: string, detail?: string) {
    super(502, 'PIX_STATUS_CHECK_FAILED', `Failed to check PIX status for ${paymentId}: ${detail || 'unknown'}`, 'Erro ao verificar status do PIX. Tente novamente.', true);
  }
}

// ─── Exceções de cartão (status_detail do Mercado Pago) ─────────────────────
export class CardRejectedBadFilledCardNumberError extends PaymentError {
  constructor() {
    super(400, 'cc_rejected_bad_filled_card_number', 'Card number is incorrect', 'Número do cartão incorreto. Verifique e tente novamente.', true);
  }
}

export class CardRejectedBadFilledDateError extends PaymentError {
  constructor() {
    super(400, 'cc_rejected_bad_filled_date', 'Card expiration date is incorrect', 'Data de validade do cartão incorreta.', true);
  }
}

export class CardRejectedBadFilledSecurityCodeError extends PaymentError {
  constructor() {
    super(400, 'cc_rejected_bad_filled_security_code', 'Card security code is incorrect', 'Código de segurança (CVV) incorreto.', true);
  }
}

export class CardRejectedBadFilledOtherError extends PaymentError {
  constructor() {
    super(400, 'cc_rejected_bad_filled_other', 'Card data is incorrect', 'Dados do cartão incorretos. Verifique e tente novamente.', true);
  }
}

export class CardRejectedBlacklistError extends PaymentError {
  constructor() {
    super(400, 'cc_rejected_blacklist', 'Card is blacklisted', 'Não foi possível processar o pagamento com este cartão. Use outro cartão.', false);
  }
}

export class CardRejectedCallForAuthorizeError extends PaymentError {
  constructor() {
    super(400, 'cc_rejected_call_for_authorize', 'Card requires bank authorization', 'O cartão requer autorização do banco. Entre em contato com sua operadora e tente novamente.', true);
  }
}

export class CardRejectedCardDisabledError extends PaymentError {
  constructor() {
    super(400, 'cc_rejected_card_disabled', 'Card is disabled', 'Cartão desabilitado. Entre em contato com sua operadora para ativá-lo.', false);
  }
}

export class CardRejectedDuplicatedPaymentError extends PaymentError {
  constructor() {
    super(400, 'cc_rejected_duplicated_payment', 'Duplicated payment detected', 'Pagamento duplicado detectado. Verifique se o pagamento anterior já foi processado.', false);
  }
}

export class CardRejectedHighRiskError extends PaymentError {
  constructor() {
    super(400, 'cc_rejected_high_risk', 'Payment rejected due to high risk', 'Pagamento recusado por segurança. Use outro método de pagamento.', false);
  }
}

export class CardRejectedInsufficientAmountError extends PaymentError {
  constructor() {
    super(400, 'cc_rejected_insufficient_amount', 'Insufficient card balance', 'Saldo insuficiente no cartão. Use outro cartão ou método de pagamento.', true);
  }
}

export class CardRejectedInvalidInstallmentsError extends PaymentError {
  constructor() {
    super(400, 'cc_rejected_invalid_installments', 'Invalid installments for this card', 'Número de parcelas inválido para este cartão.', true);
  }
}

export class CardRejectedMaxAttemptsError extends PaymentError {
  constructor() {
    super(400, 'cc_rejected_max_attempts', 'Maximum payment attempts reached', 'Limite de tentativas excedido. Aguarde alguns minutos e tente novamente.', true);
  }
}

export class CardRejectedOtherReasonError extends PaymentError {
  constructor(detail?: string) {
    super(400, 'cc_rejected_other_reason', `Card rejected: ${detail || 'other reason'}`, 'Pagamento recusado pela operadora. Tente com outro cartão.', true);
  }
}

// ─── Exceções Point (Maquininha) ────────────────────────────────────────────
export class PointDeviceNotFoundError extends PaymentError {
  constructor(deviceId: string) {
    super(404, 'POINT_DEVICE_NOT_FOUND', `Point device ${deviceId} not found`, 'Maquininha não encontrada. Verifique se está ligada e conectada.', true);
  }
}

export class PointDeviceOfflineError extends PaymentError {
  constructor(deviceId: string) {
    super(503, 'POINT_DEVICE_OFFLINE', `Point device ${deviceId} is offline`, 'Maquininha está offline. Verifique a conexão com a internet.', true);
  }
}

export class PointDeviceBusyError extends PaymentError {
  constructor(deviceId: string) {
    super(409, 'POINT_DEVICE_BUSY', `Point device ${deviceId} is busy`, 'Maquininha ocupada com outro pagamento. Aguarde e tente novamente.', true);
  }
}

export class PointIntentAlreadyExistsError extends PaymentError {
  constructor() {
    super(409, 'POINT_INTENT_ALREADY_EXISTS', 'A payment intent already exists for this device', 'Já existe um pagamento pendente na maquininha. Cancele-o primeiro.', true);
  }
}

export class PointIntentNotFoundError extends PaymentError {
  constructor(intentId: string) {
    super(404, 'POINT_INTENT_NOT_FOUND', `Payment intent ${intentId} not found`, 'Intenção de pagamento não encontrada na maquininha.', false);
  }
}

export class PointPaymentRejectedError extends PaymentError {
  constructor(state: string, detail?: string) {
    super(400, 'POINT_PAYMENT_REJECTED', `Point payment rejected: ${state} - ${detail || ''}`, 'Pagamento rejeitado na maquininha. Tente novamente.', true);
  }
}

export class PointPaymentCancelledError extends PaymentError {
  constructor() {
    super(400, 'POINT_PAYMENT_CANCELLED', 'Point payment cancelled by user or terminal', 'Pagamento cancelado na maquininha.', true);
  }
}

export class PointPaymentExpiredError extends PaymentError {
  constructor() {
    super(400, 'POINT_PAYMENT_EXPIRED', 'Point payment expired (timeout on terminal)', 'Pagamento expirou na maquininha. Tente novamente.', true);
  }
}

export class PointPaymentTimeoutError extends PaymentError {
  constructor() {
    super(504, 'POINT_PAYMENT_TIMEOUT', 'Timeout waiting for point payment confirmation', 'Tempo limite aguardando confirmação na maquininha.', true);
  }
}

export class PointCancelFailedError extends PaymentError {
  constructor(detail?: string) {
    super(500, 'POINT_CANCEL_FAILED', `Failed to cancel point payment: ${detail || 'unknown'}`, 'Não foi possível cancelar o pagamento. Cancele diretamente na maquininha (botão vermelho).', false);
  }
}

export class PointConnectionError extends PaymentError {
  constructor(detail?: string) {
    super(503, 'POINT_CONNECTION_ERROR', `Point API connection error: ${detail || 'unknown'}`, 'Erro de conexão com a maquininha. Verifique a internet.', true);
  }
}

export class PointInvalidAmountError extends PaymentError {
  constructor(amount: number) {
    super(400, 'POINT_INVALID_AMOUNT', `Invalid amount for point: ${amount}`, 'Valor inválido para pagamento na maquininha.', false);
  }
}

// ─── Exceções da API Mercado Pago (códigos numéricos) ───────────────────────
export class MpApiError extends PaymentError {
  mpErrorCode?: number;

  constructor(status: number, code: string, message: string, userMessage: string, retryable: boolean, mpErrorCode?: number) {
    super(status, code, message, userMessage, retryable);
    this.mpErrorCode = mpErrorCode;
  }
}

export class MpBadRequestError extends MpApiError {
  constructor(detail?: string) {
    super(400, 'MP_BAD_REQUEST', `Mercado Pago bad request: ${detail || ''}`, 'Dados inválidos enviados ao sistema de pagamento.', false);
  }
}

export class MpUnauthorizedError extends MpApiError {
  constructor() {
    super(401, 'MP_UNAUTHORIZED', 'Mercado Pago unauthorized', 'Credenciais do Mercado Pago inválidas ou expiradas. Contate o administrador.', false);
  }
}

export class MpForbiddenError extends MpApiError {
  constructor() {
    super(403, 'MP_FORBIDDEN', 'Mercado Pago forbidden', 'Acesso negado ao Mercado Pago. Contate o administrador.', false);
  }
}

export class MpNotFoundError extends MpApiError {
  constructor(resource?: string) {
    super(404, 'MP_NOT_FOUND', `Mercado Pago resource not found: ${resource || ''}`, 'Recurso não encontrado no Mercado Pago.', false);
  }
}

export class MpConflictError extends MpApiError {
  constructor(detail?: string) {
    super(409, 'MP_CONFLICT', `Mercado Pago conflict: ${detail || ''}`, 'Conflito no processamento do pagamento. Tente novamente.', true);
  }
}

export class MpTooManyRequestsError extends MpApiError {
  constructor() {
    super(429, 'MP_RATE_LIMIT', 'Mercado Pago rate limit exceeded', 'Muitas requisições ao sistema de pagamento. Aguarde alguns segundos.', true);
  }
}

export class MpInternalError extends MpApiError {
  constructor(detail?: string) {
    super(502, 'MP_INTERNAL_ERROR', `Mercado Pago internal error: ${detail || ''}`, 'Erro interno do Mercado Pago. Tente novamente em alguns instantes.', true);
  }
}

export class MpServiceUnavailableError extends MpApiError {
  constructor() {
    super(503, 'MP_SERVICE_UNAVAILABLE', 'Mercado Pago service unavailable', 'Mercado Pago temporariamente indisponível. Tente novamente em alguns instantes.', true);
  }
}

export class MpTimeoutError extends MpApiError {
  constructor() {
    super(504, 'MP_TIMEOUT', 'Mercado Pago request timeout', 'Tempo limite de comunicação com o Mercado Pago. Tente novamente.', true);
  }
}

export class MpNetworkError extends MpApiError {
  constructor(detail?: string) {
    super(503, 'MP_NETWORK_ERROR', `Network error communicating with Mercado Pago: ${detail || ''}`, 'Erro de rede ao comunicar com o Mercado Pago. Verifique a internet.', true);
  }
}

// ─── Exceções de validação Mercado Pago (códigos específicos da API) ────────
export class MpInvalidCardNumberError extends MpApiError {
  constructor() {
    super(400, 'MP_INVALID_CARD_NUMBER', 'Invalid card number (MP error 3001)', 'Número do cartão inválido.', true, 3001);
  }
}

export class MpInvalidExpiryMonthError extends MpApiError {
  constructor() {
    super(400, 'MP_INVALID_EXPIRY_MONTH', 'Invalid expiry month (MP error 3002)', 'Mês de validade do cartão inválido.', true, 3002);
  }
}

export class MpInvalidExpiryYearError extends MpApiError {
  constructor() {
    super(400, 'MP_INVALID_EXPIRY_YEAR', 'Invalid expiry year (MP error 3003)', 'Ano de validade do cartão inválido.', true, 3003);
  }
}

export class MpInvalidCvvError extends MpApiError {
  constructor() {
    super(400, 'MP_INVALID_CVV', 'Invalid CVV (MP error 3004)', 'Código de segurança (CVV) inválido.', true, 3004);
  }
}

export class MpInvalidDocumentError extends MpApiError {
  constructor() {
    super(400, 'MP_INVALID_DOCUMENT', 'Invalid document number (MP error 3007)', 'Número de documento (CPF/CNPJ) inválido.', true, 3007);
  }
}

export class MpInvalidEmailError extends MpApiError {
  constructor() {
    super(400, 'MP_INVALID_EMAIL', 'Invalid email format (MP error 3008)', 'Formato de e-mail inválido.', true, 3008);
  }
}

export class MpInvalidPaymentMethodError extends MpApiError {
  constructor() {
    super(400, 'MP_INVALID_PAYMENT_METHOD', 'Invalid payment method (MP error 3014)', 'Método de pagamento inválido.', false, 3014);
  }
}

export class MpAmountOverLimitError extends MpApiError {
  constructor() {
    super(400, 'MP_AMOUNT_OVER_LIMIT', 'Amount over limit (MP error 4003)', 'Valor acima do limite permitido pelo Mercado Pago.', false, 4003);
  }
}

export class MpAmountBelowMinimumError extends MpApiError {
  constructor() {
    super(400, 'MP_AMOUNT_BELOW_MINIMUM', 'Amount below minimum (MP error 4004)', 'Valor abaixo do mínimo permitido (R$ 0,01).', false, 4004);
  }
}

export class MpPaymentAlreadyCancelledError extends MpApiError {
  constructor() {
    super(400, 'MP_PAYMENT_ALREADY_CANCELLED', 'Payment already cancelled (MP error 4001)', 'Pagamento já foi cancelado anteriormente.', false, 4001);
  }
}

export class MpTokenExpiredError extends MpApiError {
  constructor() {
    super(400, 'MP_TOKEN_EXPIRED', 'Payment token expired (MP error 4050)', 'Token de pagamento expirado. Tente novamente.', true, 4050);
  }
}

export class MpAlreadyPostedError extends MpApiError {
  constructor() {
    super(409, 'MP_ALREADY_POSTED', 'Payment already posted (MP error 2001)', 'Este pagamento já foi registrado anteriormente.', false, 2001);
  }
}

export class MpInvalidCredentialError extends MpApiError {
  constructor() {
    super(401, 'MP_INVALID_CREDENTIAL', 'Invalid credential (MP error 2000)', 'Credenciais do Mercado Pago inválidas. Contate o administrador.', false, 2000);
  }
}

// ─── Exceções de finalização ────────────────────────────────────────────────
export class SaleCompletionError extends PaymentError {
  constructor(saleId: string, detail?: string) {
    super(500, 'SALE_COMPLETION_FAILED', `Failed to complete sale ${saleId}: ${detail || 'unknown'}`, 'Pagamento aprovado mas houve erro ao finalizar a venda. Contate o administrador.', false);
  }
}

export class StockMovementError extends PaymentError {
  constructor(saleId: string, detail?: string) {
    super(500, 'STOCK_MOVEMENT_FAILED', `Failed stock movement for sale ${saleId}: ${detail || 'unknown'}`, 'Erro ao atualizar estoque após pagamento. Contate o administrador.', false);
  }
}

// ─── Mapa de status_detail do MP → Exceção ──────────────────────────────────
const STATUS_DETAIL_MAP: Record<string, () => PaymentError> = {
  cc_rejected_bad_filled_card_number: () => new CardRejectedBadFilledCardNumberError(),
  cc_rejected_bad_filled_date: () => new CardRejectedBadFilledDateError(),
  cc_rejected_bad_filled_security_code: () => new CardRejectedBadFilledSecurityCodeError(),
  cc_rejected_bad_filled_other: () => new CardRejectedBadFilledOtherError(),
  cc_rejected_blacklist: () => new CardRejectedBlacklistError(),
  cc_rejected_call_for_authorize: () => new CardRejectedCallForAuthorizeError(),
  cc_rejected_card_disabled: () => new CardRejectedCardDisabledError(),
  cc_rejected_duplicated_payment: () => new CardRejectedDuplicatedPaymentError(),
  cc_rejected_high_risk: () => new CardRejectedHighRiskError(),
  cc_rejected_insufficient_amount: () => new CardRejectedInsufficientAmountError(),
  cc_rejected_invalid_installments: () => new CardRejectedInvalidInstallmentsError(),
  cc_rejected_max_attempts: () => new CardRejectedMaxAttemptsError(),
  cc_rejected_other_reason: () => new CardRejectedOtherReasonError(),
  rejected_by_bank: () => new PaymentError(400, 'REJECTED_BY_BANK', 'Payment rejected by bank', 'Pagamento rejeitado pelo banco. Tente com outro cartão.', true),
  rejected_by_regulations: () => new PaymentError(400, 'REJECTED_BY_REGULATIONS', 'Payment rejected by regulations', 'Pagamento rejeitado por regulamentação. Use outro método.', false),
  rejected_insufficient_data: () => new PaymentError(400, 'REJECTED_INSUFFICIENT_DATA', 'Insufficient data for payment', 'Dados insuficientes para processar o pagamento.', true),
  rejected_other_reason: () => new PaymentError(400, 'REJECTED_OTHER_REASON', 'Payment rejected for other reason', 'Pagamento recusado. Tente com outro método de pagamento.', true),
  pending_contingency: () => new PaymentError(200, 'PENDING_CONTINGENCY', 'Payment pending due to contingency', 'Pagamento pendente - processando em modo de contingência.', false),
  pending_review_manual: () => new PaymentError(200, 'PENDING_REVIEW_MANUAL', 'Payment pending manual review', 'Pagamento em análise manual. Aguarde a aprovação.', false),
  pending_waiting_transfer: () => new PaymentError(200, 'PENDING_WAITING_TRANSFER', 'Waiting for PIX transfer', 'Aguardando transferência PIX...', false),
  pending_waiting_payment: () => new PaymentError(200, 'PENDING_WAITING_PAYMENT', 'Waiting for payment', 'Aguardando pagamento...', false),
  accredited: () => new PaymentError(200, 'ACCREDITED', 'Payment accredited', 'Pagamento aprovado!', false),
};

export function getErrorFromStatusDetail(statusDetail: string): PaymentError | null {
  const factory = STATUS_DETAIL_MAP[statusDetail];
  return factory ? factory() : null;
}

// ─── Mapa de status do pagamento MP → Exceção ──────────────────────────────
export function getErrorFromPaymentStatus(status: string, statusDetail?: string, paymentId?: string): PaymentError | null {
  if (statusDetail) {
    const detailError = getErrorFromStatusDetail(statusDetail);
    if (detailError) return detailError;
  }

  const id = paymentId || 'unknown';
  switch (status) {
    case 'rejected':
      return new PaymentError(400, 'PAYMENT_REJECTED', `Payment ${id} rejected`, 'Pagamento rejeitado.', true);
    case 'cancelled':
      return new PaymentError(400, 'PAYMENT_CANCELLED', `Payment ${id} cancelled`, 'Pagamento cancelado.', true);
    case 'refunded':
      return new PixPaymentRefundedError(id);
    case 'charged_back':
      return new PixPaymentChargebackError(id);
    case 'in_mediation':
      return new PixPaymentInMediationError(id);
    case 'pending':
    case 'in_process':
    case 'authorized':
      return null; // Estados intermediários, não são erros
    case 'approved':
      return null;
    default:
      return null;
  }
}

// ─── Parser de erros HTTP da API do Mercado Pago ────────────────────────────
export function parsePointApiError(httpStatus: number, responseBody: string, context?: string): PaymentError {
  let parsed: any = null;
  try {
    parsed = JSON.parse(responseBody);
  } catch { /* não é JSON */ }

  const message = parsed?.message || parsed?.error || responseBody || 'Unknown error';
  const mpErrorCode = parsed?.cause?.[0]?.code || parsed?.error_code;

  // Mapa de códigos numéricos do MP
  if (mpErrorCode) {
    const numCode = Number(mpErrorCode);
    switch (numCode) {
      case 2000: return new MpInvalidCredentialError();
      case 2001: return new MpAlreadyPostedError();
      case 3001: return new MpInvalidCardNumberError();
      case 3002: return new MpInvalidExpiryMonthError();
      case 3003: return new MpInvalidExpiryYearError();
      case 3004: return new MpInvalidCvvError();
      case 3007: return new MpInvalidDocumentError();
      case 3008: return new MpInvalidEmailError();
      case 3014: return new MpInvalidPaymentMethodError();
      case 4001: return new MpPaymentAlreadyCancelledError();
      case 4003: return new MpAmountOverLimitError();
      case 4004: return new MpAmountBelowMinimumError();
      case 4050: return new MpTokenExpiredError();
    }
  }

  // Mapa por HTTP status
  switch (httpStatus) {
    case 400: return new MpBadRequestError(message);
    case 401: return new MpUnauthorizedError();
    case 403: return new MpForbiddenError();
    case 404: {
      // Tenta identificar se é device ou intent
      if (context?.includes('device')) return new PointDeviceNotFoundError(context);
      if (context?.includes('intent')) return new PointIntentNotFoundError(context);
      return new MpNotFoundError(context);
    }
    case 409: {
      const msg = (message || '').toLowerCase();
      if (msg.includes('busy') || msg.includes('processing')) return new PointDeviceBusyError(context || 'unknown');
      if (msg.includes('already') || msg.includes('intent')) return new PointIntentAlreadyExistsError();
      return new MpConflictError(message);
    }
    case 423: return new PointDeviceBusyError(context || 'unknown');
    case 429: return new MpTooManyRequestsError();
    case 500: return new MpInternalError(message);
    case 502: return new MpInternalError(message);
    case 503: return new MpServiceUnavailableError();
    case 504: return new MpTimeoutError();
    default:
      return new PaymentError(httpStatus, 'MP_UNKNOWN_ERROR', `Mercado Pago error ${httpStatus}: ${message}`, 'Erro inesperado no sistema de pagamento. Tente novamente.', true);
  }
}

// ─── Parser de erros da SDK do Mercado Pago ─────────────────────────────────
export function parseMpSdkError(err: unknown): PaymentError {
  if (err instanceof PaymentError) return err;

  const error = err as any;

  // Erros de rede (fetch/node)
  if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND' || error?.code === 'ECONNRESET') {
    return new MpNetworkError(error.message);
  }
  if (error?.code === 'ETIMEDOUT' || error?.code === 'ESOCKETTIMEDOUT' || error?.name === 'AbortError') {
    return new MpTimeoutError();
  }
  if (error?.type === 'system' || error?.code === 'UND_ERR_CONNECT_TIMEOUT') {
    return new MpNetworkError(error.message);
  }

  // Erros da SDK do Mercado Pago
  const status = error?.status || error?.statusCode || error?.response?.status;
  const apiError = error?.cause || error?.apiError || error?.error;
  const message = error?.message || String(err);

  if (status) {
    const body = JSON.stringify(apiError || error?.response?.data || { message });
    return parsePointApiError(status, body);
  }

  // status_detail no erro
  if (error?.status_detail) {
    const detailError = getErrorFromStatusDetail(error.status_detail);
    if (detailError) return detailError;
  }

  return new PaymentError(500, 'MP_UNKNOWN_SDK_ERROR', `Mercado Pago SDK error: ${message}`, 'Erro inesperado no processamento do pagamento. Tente novamente.', true);
}

// ─── Nomes amigáveis para todos os estados Point ────────────────────────────
const POINT_STATE_MAP: Record<string, { isTerminal: boolean; errorFactory?: () => PaymentError }> = {
  OPEN: { isTerminal: false },
  ON_TERMINAL: { isTerminal: false },
  PROCESSING: { isTerminal: false },
  PROCESSED: { isTerminal: false },
  APPROVED: { isTerminal: true },
  FINISHED: { isTerminal: true }, // FINISHED = processamento concluído, precisa checar payment.state
  REJECTED: { isTerminal: true, errorFactory: () => new PointPaymentRejectedError('REJECTED') },
  CANCELED: { isTerminal: true, errorFactory: () => new PointPaymentCancelledError() },
  CANCELLED: { isTerminal: true, errorFactory: () => new PointPaymentCancelledError() },
  EXPIRED: { isTerminal: true, errorFactory: () => new PointPaymentExpiredError() },
  ERROR: { isTerminal: true, errorFactory: () => new PaymentError(500, 'POINT_ERROR', 'Point terminal error', 'Erro na maquininha. Tente novamente.', true) },
  ABANDONED: { isTerminal: true, errorFactory: () => new PaymentError(400, 'POINT_ABANDONED', 'Payment abandoned on terminal', 'Pagamento abandonado na maquininha.', true) },
};

export function parsePointState(state: string): { isTerminal: boolean; error?: PaymentError } {
  const upper = (state || '').toUpperCase();
  const mapping = POINT_STATE_MAP[upper];
  if (!mapping) {
    return { isTerminal: false };
  }
  return {
    isTerminal: mapping.isTerminal,
    error: mapping.errorFactory?.()
  };
}

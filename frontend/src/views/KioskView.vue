<template>
  <div class="kiosk" @click="resetInactivity" @mousemove="resetInactivity" @keypress="resetInactivity"
    @touchstart="resetInactivity">
    <!-- Screensaver -->
    <div v-if="showScreensaver" class="screensaver" @click="exitScreensaver">
      <div class="screensaver-content">
        <div class="promo-carousel">
          <transition-group name="slide-fade" tag="div" class="carousel-track">
            <div v-for="(promo, index) in visiblePromos" :key="promo._id" class="promo-slide"
              :class="{ active: index === 0 }">
              <div class="promo-card">
                <div class="promo-badge">
                  <span class="discount-percent">-{{ promo.discountPercent }}%</span>
                  <span class="discount-label">OFF</span>
                </div>
                <div class="promo-image">
                  <img v-if="promo.product?.imageUrl" :src="promo.product.imageUrl" :alt="promo.product.name" />
                  <div v-else class="no-image">📦</div>
                </div>
                <div class="promo-details">
                  <h2 class="promo-title">{{ promo.product?.name }}</h2>
                  <div class="promo-prices">
                    <span class="price-original">De R$ {{ promo.originalSalePrice?.toFixed(2) }}</span>
                    <span class="price-current">Por R$ {{ promo.currentPrice?.toFixed(2) }}</span>
                  </div>
                  <div class="promo-expiry">
                    <svg viewBox="0 0 20 20" fill="currentColor" class="expiry-icon">
                      <path fill-rule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                        clip-rule="evenodd" />
                    </svg>
                    Válido até {{ formatDate(promo.expiryDate) }}
                  </div>
                </div>
              </div>
            </div>
          </transition-group>
        </div>
        <div class="screensaver-footer">
          <div class="tap-message">
            <svg viewBox="0 0 24 24" fill="none" class="tap-icon">
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
                fill="currentColor" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
            </svg>
            <span>Toque na tela para começar suas compras</span>
          </div>
        </div>
      </div>
    </div>

    <input class="scan-input" ref="barcodeInput" v-model="barcode" @keyup.enter="handleBarcode"
      aria-label="Leitor oculto" />

    <section class="workspace">
      <div class="right glass">
        <div class="cart-top">
          <h3>Carrinho</h3>
          <span class="chip">{{ totalItems }} itens</span>
          <div class="top-actions">
            <button class="ghost sm" @click="openBarcode">Digitar código</button>
            <button class="ghost sm" @click="openPromos">Promocoes</button>
            <button class="ghost sm" @click="showLocationModal = true">Trocar local</button>
          </div>
        </div>
        <div class="cart">
          <div v-for="item in cart" :key="item.saleItemId" class="cart-item">
            <div class="item-image">
              <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.name" />
              <div v-else class="no-image">📦</div>
            </div>
            <div class="item-info">
              <div class="item-header">
                <strong>{{ item.name }}</strong>
                <span v-if="item.discountPercent && item.discountPercent > 0" class="discount-tag">
                  -{{ item.discountPercent }}%
                </span>
              </div>
              <div class="item-prices">
                <p v-if="item.originalPrice" class="original-price">R$ {{ item.originalPrice.toFixed(2) }}</p>
                <p class="current-price" :class="{ 'discounted': item.discountPercent && item.discountPercent > 0 }">
                  R$ {{ item.price.toFixed(2) }}
                </p>
              </div>
            </div>
            <div class="count">
              <button @click="updateQty(item, item.quantity - 1)" :disabled="item.quantity <= 1">-</button>
              <input type="number" v-model.number="item.quantity" @change="updateQty(item, item.quantity)" />
              <button @click="updateQty(item, item.quantity + 1)">+</button>
            </div>
            <div class="item-total">
              <strong>R$ {{ (item.price * item.quantity).toFixed(2) }}</strong>
              <button class="link" @click="remove(item)" aria-label="Remover item">x</button>
            </div>
          </div>
          <div v-if="!cart.length" class="empty-cart">
            <div class="empty-icon">🛒</div>
            <p class="empty-title">Carrinho vazio</p>
            <p class="muted sm">Bipe um produto para começar suas compras</p>
          </div>
        </div>

        <div class="summary">
          <div class="summary-row">
            <span>Subtotal</span>
            <strong>R$ {{ subtotal.toFixed(2) }}</strong>
          </div>
          <div class="actions">
            <button class="ghost" @click="cancel">Cancelar compra</button>
            <button class="primary" :disabled="!cart.length" @click="openPayment">Finalizar compra</button>
          </div>
        </div>
      </div>
    </section>

    <!-- Modal escolha de local -->
    <div v-if="showLocationModal" class="modal">
      <div class="modal-box glass">
        <div class="modal-header">
          <div>
            <p class="eyebrow">Selecione o quiosque</p>
            <h3>Escolha o local</h3>
          </div>
          <button class="ghost" @click="closeLocationModal" :disabled="!chosenLocation">Fechar</button>
        </div>
        <div class="field">
          <label>Local</label>
          <select v-model="chosenLocation">
            <option value="" disabled>Selecione...</option>
            <option v-for="loc in locations" :key="loc._id" :value="loc.code">{{ loc.name }} ({{ loc.code }})</option>
          </select>
        </div>
        <div class="field">
          <label>Senha de troca</label>
          <input type="password" v-model="locationPasswordInput" placeholder="Digite a senha"
            @input="locationPasswordError = ''" />
          <p v-if="locationPasswordError" class="warning sm">{{ locationPasswordError }}</p>
        </div>
        <div class="actions modal-actions">
          <button class="primary" :disabled="!chosenLocation || !locationPasswordInput" @click="confirmLocation">
            Confirmar
          </button>
        </div>
      </div>
    </div>

    <div v-if="manualBarcodeOpen" class="modal">
      <div class="modal-box glass">
        <div class="modal-header">
          <h3>Digite o código de barras</h3>
          <button class="ghost" @click="closeBarcode">Fechar</button>
        </div>
        <input id="manual-barcode" v-model="manualBarcode" placeholder="Código de barras"
          @keyup.enter="confirmManualBarcode" />
        <div class="actions">
          <button class="ghost" @click="closeBarcode">Voltar</button>
          <button class="primary" @click="confirmManualBarcode">Confirmar</button>
        </div>
      </div>
    </div>

    <div v-if="showCustomerModal" class="modal">
      <div class="modal-box glass">
        <div class="modal-header">
          <h3>Possui cadastro?</h3>
          <button class="ghost" @click="backToBanner">Voltar ao banner</button>
        </div>

        <div v-if="customerStep === 'prompt'" class="customer-step">
          <p class="muted">Antes de iniciar, precisamos saber se já tem cadastro.</p>
          <div class="actions modal-actions">
            <button class="ghost" @click="chooseCustomerFlow(false)">Não</button>
            <button class="primary" @click="chooseCustomerFlow(true)">Sim</button>
          </div>
        </div>

        <div v-else-if="customerStep === 'cpf'" class="customer-step">
          <div class="field">
            <label>CPF</label>
            <input v-model="customerCpf" placeholder="Digite seu CPF" />
          </div>
          <p v-if="customerError" class="warning sm">{{ customerError }}</p>
          <div class="actions modal-actions">
            <button class="ghost" @click="resetCustomerFlow">Voltar</button>
            <button class="primary" @click="submitCustomer" :disabled="customerSubmitting">Confirmar</button>
          </div>
        </div>

        <div v-else-if="customerStep === 'register'" class="customer-step">
          <div class="field">
            <label>CPF</label>
            <input v-model="customerCpf" placeholder="Digite seu CPF" />
          </div>
          <div class="field">
            <label>Telefone</label>
            <input v-model="customerPhone" placeholder="(99) 99999-9999" />
          </div>
          <div class="field">
            <label>Email (opcional)</label>
            <input v-model="customerEmail" placeholder="voce@email.com" />
          </div>
          <p v-if="customerError" class="warning sm">{{ customerError }}</p>
          <div class="actions modal-actions">
            <button class="ghost" @click="resetCustomerFlow">Voltar</button>
            <button class="primary" @click="submitCustomer" :disabled="customerSubmitting">Cadastrar e iniciar</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="paymentOpen" class="modal">
      <div class="modal-box payment glass">
        <div class="modal-header">
          <div>
            <p class="eyebrow">finalizar compra</p>
            <h3>Confirme o pagamento</h3>
          </div>
          <button class="ghost" @click="closePayment">Fechar</button>
        </div>

        <div class="payment-total">
          <span>Total a pagar</span>
          <strong>R$ {{ subtotal.toFixed(2) }}</strong>
        </div>

        <div class="field">
          <label>Apartamento (opcional)</label>
          <input v-model="apartmentNote" placeholder="Ex: 302B" />
        </div>

        <div class="field">
          <label>Forma de pagamento</label>
          <div class="payment-options">
            <button v-for="opt in paymentOptions" :key="opt.value" type="button"
              :class="['pay-chip', paymentMethod === opt.value ? 'active' : '']" @click="setPayment(opt.value)">
              {{ opt.label }}
            </button>
          </div>
          <div v-if="paymentMethod === 'CREDIT_CARD' || paymentMethod === 'DEBIT_CARD'" class="payment-hint">
            <strong>Na maquininha:</strong> aperte o botão <span class="highlight success">verde</span> para pagar ou o
            <span class="highlight danger">vermelho</span> para cancelar.
          </div>
        </div>

        <div v-if="paymentMethod === 'PIX' && pixData.paymentId" class="pix-block glass">
          <p class="muted">Escaneie o QR para pagar com Pix.</p>
          <div class="pix-qr">
            <img v-if="pixData.qrCodeBase64" :src="`data:image/png;base64,${pixData.qrCodeBase64}`" alt="QR Pix" />
            <p v-else class="muted qr-text">{{ pixData.qrCode }}</p>
          </div>
          <p class="muted sm">ID pagamento: {{ pixData.paymentId }}</p>
        </div>

        <p v-if="paymentError" class="warning">{{ paymentError }}</p>

        <div v-if="paymentProcessing" class="payment-wait">
          <div class="pulse-loader" aria-hidden="true">
            <span></span><span></span><span></span>
          </div>
          <div class="wait-text">
            <p class="title">{{ paymentStatusText || 'Processando pagamento...' }}</p>
            <p class="muted sm" v-if="paymentMethod === 'PIX'">
              Estamos gerando e esperando o Pix. Isso leva poucos segundos.
            </p>
            <p class="muted sm" v-else>
              Confirme na maquininha: verde para pagar, vermelho para cancelar.
            </p>
          </div>
        </div>

        <div class="actions modal-actions">
          <button class="ghost" @click="cancelPayment">Cancelar pagamento</button>
          <button class="primary" @click="confirmPayment" :disabled="paymentProcessing">
            {{ paymentProcessing ? 'Aguardando...' : 'Confirmar pagamento' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showTerminalHint" class="modal">
      <div class="modal-box glass">
        <div class="modal-header">
          <h3>Confirme na maquininha</h3>
          <button class="ghost" @click="closeTerminalHint">Fechar</button>
        </div>
        <p class="muted">Pressione o botão verde na maquininha para pagar.</p>
        <p class="muted">Para cancelar, pressione o botão vermelho.</p>
        <div class="actions modal-actions">
          <button class="ghost" @click="closeTerminalHint">Voltar</button>
          <button class="primary" @click="confirmTerminalHint">Já apertei o verde</button>
        </div>
      </div>
    </div>

    <div v-if="showTerminalHint" class="modal">
      <div class="modal-box glass">
        <div class="modal-header">
          <h3>Confirme na maquininha</h3>
          <button class="ghost" @click="closeTerminalHint">Fechar</button>
        </div>
        <p class="muted emphasis">
          {{ terminalHintMode === 'pay'
            ? 'Pressione o botão verde na maquininha para pagar.'
            : 'Para cancelar, pressione o botão vermelho na maquininha.' }}
        </p>
        <div class="actions modal-actions">
          <button class="primary" @click="closeTerminalHint">Ok, entendi</button>
        </div>
      </div>
    </div>

    <div v-if="paymentSuccess" class="modal success">
      <div class="modal-box glass success-box">
        <div class="success-icon">✓</div>
        <h3>Compra concluída!</h3>
        <p class="muted">Pagamento registrado com sucesso. Obrigado!</p>
        <div class="payment-total">
          <span>Total</span>
          <strong>R$ {{ paymentTotal.toFixed(2) }}</strong>
        </div>
        <div class="actions modal-actions">
          <button class="primary" @click="closeSuccess">Fechar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, nextTick } from 'vue';
import { useKioskStore } from '../stores/kiosk';
import api from '../services/api';

const store = useKioskStore();
const barcode = ref('');
const barcodeInput = ref<HTMLInputElement | null>(null);
const manualBarcodeOpen = ref(false);
const manualBarcode = ref('');
const apartmentNote = ref('');
const paymentMethod = ref('PIX');
const paymentSuccess = ref(false);
const showCustomerModal = ref(false);
const paymentProcessing = ref(false);
const paymentStatusText = ref('');
const paymentError = ref('');
const paymentTotal = ref(0);
const showTerminalHint = ref(false);
const terminalHintMode = ref<'pay' | 'cancel'>('pay');
const pixData = ref<{ qrCode: string | null; qrCodeBase64: string | null; paymentId: string | null }>({
  qrCode: null,
  qrCodeBase64: null,
  paymentId: null
});
const pixStatus = ref('');
const paymentOptions = [
  { value: 'CREDIT_CARD', label: 'Credito' },
  { value: 'DEBIT_CARD', label: 'Debito' },
  { value: 'PIX', label: 'Pix' }
];

const cart = computed(() => store.cart);
const subtotal = computed(() => store.subtotal);
const totalItems = computed(() => store.totalItems);
const paymentOpen = ref(false);
const locations = ref<any[]>([]);
const defaultLocation = import.meta.env.VITE_KIOSK_LOCATION || 'central';
const chosenLocation = ref(store.selectedLocation || defaultLocation);
const showLocationModal = ref(!chosenLocation.value);
const locationPasswordInput = ref('');
const locationPasswordError = ref('');
const LOCATION_PASSWORD = import.meta.env.VITE_LOCATION_PASSWORD || '1234';
const customerStep = ref<'prompt' | 'cpf' | 'register'>('prompt');
const customerCpf = ref('');
const customerPhone = ref('');
const customerEmail = ref('');
const customerError = ref('');
const customerSubmitting = ref(false);

// Screensaver
const showScreensaver = ref(false);
const promos = ref<any[]>([]);
const currentPromoIndex = ref(0);
const inactivityTimer = ref<number | null>(null);
const carouselTimer = ref<number | null>(null);
const INACTIVITY_TIMEOUT = 60000; // 1 minuto
const CAROUSEL_INTERVAL = 5000; // 5 segundos por produto

const visiblePromos = computed(() => {
  if (!promos.value.length) return [];
  const total = promos.value.length;
  const current = currentPromoIndex.value % total;
  return [promos.value[current]];
});

async function loadPromos() {
  try {
    const { data } = await api.get('/batches/expiring', {
      params: { days: 30 }
    });
    promos.value = data.filter((batch: any) => batch.discountPercent > 0 && batch.product);
  } catch (error) {
    console.error('Failed to load promos:', error);
    promos.value = [];
  }
}

function startInactivityTimer() {
  clearInactivityTimer();
  inactivityTimer.value = window.setTimeout(() => {
    if (!paymentOpen.value && !manualBarcodeOpen.value && !showLocationModal.value && !showCustomerModal.value) {
      enterScreensaver();
    }
  }, INACTIVITY_TIMEOUT);
}

function clearInactivityTimer() {
  if (inactivityTimer.value) {
    clearTimeout(inactivityTimer.value);
    inactivityTimer.value = null;
  }
}

function resetInactivity() {
  if (showScreensaver.value) return;
  startInactivityTimer();
}

function enterScreensaver() {
  showCustomerModal.value = false;
  resetCustomerFlow();
  showScreensaver.value = true;
  currentPromoIndex.value = 0;
  loadPromos();
  startCarousel();
}

function exitScreensaver() {
  showScreensaver.value = false;
  stopCarousel();
  clearInactivityTimer();
  startCustomerFlow();
}

function startCustomerFlow() {
  resetCustomerFlow();
  showCustomerModal.value = true;
}

function chooseCustomerFlow(hasAccount: boolean) {
  customerError.value = '';
  customerStep.value = hasAccount ? 'cpf' : 'register';
}

async function submitCustomer() {
  customerError.value = '';
  const cpf = customerCpf.value.trim();
  const phone = customerPhone.value.trim();
  const email = customerEmail.value.trim();
  const persist = customerStep.value === 'register';
  if (!cpf) {
    customerError.value = 'Informe o CPF';
    return;
  }
  if (customerStep.value === 'register' && !phone) {
    customerError.value = 'Informe o telefone';
    return;
  }
  customerSubmitting.value = true;
  try {
    await store.setCustomer({
      cpf,
      phone: customerStep.value === 'register' ? phone : undefined,
      email: email || undefined
    }, { persist });
    resetCustomerFlow();
    showCustomerModal.value = false;
    resetInactivity();
    focusBarcode();
  } catch (error: any) {
    customerError.value = error?.response?.data?.message || error?.message || 'Erro ao salvar cadastro';
  } finally {
    customerSubmitting.value = false;
  }
}

function resetCustomerFlow() {
  customerStep.value = 'prompt';
  customerCpf.value = '';
  customerPhone.value = '';
  customerEmail.value = '';
  customerError.value = '';
}

function backToBanner() {
  showCustomerModal.value = false;
  enterScreensaver();
}

function startCarousel() {
  stopCarousel();
  carouselTimer.value = window.setInterval(() => {
    currentPromoIndex.value += 1;
  }, CAROUSEL_INTERVAL);
}

function stopCarousel() {
  if (carouselTimer.value) {
    clearInterval(carouselTimer.value);
    carouselTimer.value = null;
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

async function loadLocations() {
  try {
    const { data } = await api.get('/locations');
    locations.value = data;
    if (!chosenLocation.value && data.length) chosenLocation.value = data[0].code;
  } catch {
    locations.value = [];
    if (!chosenLocation.value) chosenLocation.value = defaultLocation;
  }
}

function confirmLocation() {
  if (!chosenLocation.value) return;
  if (locationPasswordInput.value !== LOCATION_PASSWORD) {
    locationPasswordError.value = 'Senha inválida';
    return;
  }
  store.setLocation(chosenLocation.value);
  closeLocationModal();
  focusBarcode();
}

function closeLocationModal() {
  showLocationModal.value = false;
  locationPasswordInput.value = '';
  locationPasswordError.value = '';
}

function paymentLabel(pay: string) {
  const map: Record<string, string> = {
    CREDIT_CARD: 'Cartao credito',
    DEBIT_CARD: 'Cartao debito',
    PIX: 'Pix'
  };
  return map[pay] || pay;
}

async function handleBarcode() {
  if (!barcode.value) return;
  await store.addByBarcode(barcode.value);
  barcode.value = '';
  focusBarcode();
}

async function updateQty(item: any, value: number) {
  const qty = Math.max(1, value);
  await store.changeQuantity(item, qty);
}

async function remove(item: any) {
  await store.remove(item);
}

function cancel() {
  store.resetCart();
}

async function cancelPayment() {
  paymentProcessing.value = false;
  paymentError.value = '';
  paymentStatusText.value = '';
  if (paymentMethod.value === 'CREDIT_CARD' || paymentMethod.value === 'DEBIT_CARD') {
    terminalHintMode.value = 'cancel';
    showTerminalHint.value = true;
    return;
  }
  closePayment();
}

function confirmTerminalHint() {
  showTerminalHint.value = false;
}

function closeTerminalHint() {
  showTerminalHint.value = false;
}

function openPayment() {
  if (!cart.value.length) return;
  paymentError.value = '';
  paymentTotal.value = subtotal.value;
  showTerminalHint.value = false;
  terminalHintMode.value = 'pay';
  paymentOpen.value = true;
}

function closePayment() {
  paymentOpen.value = false;
  pixData.value = { qrCode: null, qrCodeBase64: null, paymentId: null };
  pixStatus.value = '';
  showTerminalHint.value = false;
}

async function confirmPayment() {
  showTerminalHint.value = false;
  if (paymentMethod.value === 'CREDIT_CARD' || paymentMethod.value === 'DEBIT_CARD') {
    terminalHintMode.value = 'pay';
    showTerminalHint.value = true; // mostra instrução do botão verde enquanto envia
  }
  paymentError.value = '';
  paymentProcessing.value = true;
  const isMachine = paymentMethod.value === 'CREDIT_CARD' || paymentMethod.value === 'DEBIT_CARD';
  paymentStatusText.value = isMachine ? 'Aguardando confirmacao na maquininha...' : 'Gerando pagamento...';

  try {
    if (paymentMethod.value === 'PIX') {
      const result: any = await store.startPayment('PIX', apartmentNote.value);
      const provider = result?.provider || {};
      pixData.value = {
        qrCode: provider.qrCode || null,
        qrCodeBase64: provider.qrCodeBase64 || null,
        paymentId: provider.paymentId || null
      };
      paymentStatusText.value = 'Aguardando pagamento PIX...';
      await pollPixStatus(provider.paymentId);
    } else {
      const result: any = await store.startPayment(paymentMethod.value, apartmentNote.value);
      const provider = result?.provider || {};
      const state =
        provider?.payment?.state ||
        provider?.payment?.status ||
        provider?.state ||
        provider?.status ||
        provider?.status_detail ||
        '';
      const approvedStates = ['APPROVED', 'approved', 'FINISHED', 'finished', 'success', 'closed'];
      if (approvedStates.includes(state)) {
        paymentOpen.value = false;
        paymentTotal.value = subtotal.value || paymentTotal.value;
        paymentSuccess.value = true;
      } else if (provider?.intentId || provider?.payment?.id) {
        await pollPointStatus(provider.intentId || provider.payment?.id);
      } else {
        throw new Error('Estado do pagamento desconhecido');
      }
    }
  } catch (err: any) {
    paymentError.value = err?.response?.data?.message || err?.message || 'Erro ao processar pagamento';
  } finally {
    paymentProcessing.value = false;
  }
}

async function pollPixStatus(paymentId?: string) {
  if (!paymentId) throw new Error('ID do pagamento PIX nao retornado');
  pixStatus.value = 'pending';
  let attempts = 0;
  while (true) {
    if (!paymentOpen.value) return; // cancelado pelo usuario
    const { data } = await api.get(`/payments/status/${paymentId}`);
    const status = (data?.status || data?.status_detail || '').toLowerCase();
    if (['approved', 'accredited', 'completed'].includes(status)) {
      pixStatus.value = 'approved';
      await store.finalizeSale('PIX', apartmentNote.value);
      paymentOpen.value = false;
      paymentTotal.value = subtotal.value || paymentTotal.value;
      paymentSuccess.value = true;
      return;
    }
    if (['rejected', 'cancelled', 'canceled', 'expired'].includes(status)) {
      pixStatus.value = 'rejected';
      throw new Error(`Pagamento PIX ${status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000 + attempts * 300));
    attempts++;
  }
}

async function pollPointStatus(intentId: string) {
  if (paymentMethod.value !== 'CREDIT_CARD' && paymentMethod.value !== 'DEBIT_CARD') {
    return;
  }
  paymentStatusText.value = 'Aguardando confirmacao na maquininha...';
  let attempts = 0;
  while (true) {
    if (!paymentOpen.value) return;
    const { data } = await api.get(`/payments/point/${intentId}`);
    const state = (data?.state || data?.status || '').toLowerCase();
    if (['approved', 'finished', 'closed', 'approved'].includes(state)) {
      const totalPaid = subtotal.value || paymentTotal.value;
      await store.finalizeSale(paymentMethod.value, apartmentNote.value);
      paymentOpen.value = false;
      paymentTotal.value = totalPaid;
      paymentSuccess.value = true;
      return;
    }
    if (['rejected', 'cancelled', 'canceled', 'expired'].includes(state)) {
      // Se o terminal foi cancelado/rejeitado, só avisa sem erro (apenas para cartão)
      if (paymentMethod.value === 'PIX') {
        return;
      }
      terminalHintMode.value = 'cancel';
      showTerminalHint.value = true;
      paymentProcessing.value = false;
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000 + attempts * 300));
    attempts++;
  }
}

function focusBarcode() {
  setTimeout(() => barcodeInput.value?.focus(), 50);
}

onMounted(() => {
  loadLocations().finally(() => {
    if (store.selectedLocation) {
      showLocationModal.value = false;
      focusBarcode();
    }
  });
  startInactivityTimer();
});

onUnmounted(() => {
  clearInactivityTimer();
  stopCarousel();
});

function openBarcode() {
  manualBarcodeOpen.value = true;
  nextTick(() => {
    const el = document.getElementById('manual-barcode') as HTMLInputElement | null;
    el?.focus();
  });
}

function closeBarcode() {
  manualBarcodeOpen.value = false;
  focusBarcode();
}

function openPromos() {
  clearInactivityTimer();
  enterScreensaver();
}

async function confirmManualBarcode() {
  barcode.value = manualBarcode.value;
  await handleBarcode();
  manualBarcode.value = '';
  closeBarcode();
}

function setPayment(opt: string) {
  paymentMethod.value = opt;
  showTerminalHint.value = false;
  terminalHintMode.value = 'pay';
  paymentStatusText.value = '';
}

function closeSuccess() {
  paymentSuccess.value = false;
  enterScreensaver();
}
</script>

<style scoped>
.kiosk {
  padding: 16px 18px 24px;
  max-width: 1440px;
  margin: 0 auto;
}

.glass {
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  border-radius: var(--radius);
}

.workspace {
  margin-top: 12px;
  display: flex;
  justify-content: center;
  padding: 0 12px;
}

.scan-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  height: 0;
  width: 0;
}

.right {
  padding: 14px;
  min-height: 320px;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
}

.cart-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-bottom: 14px;
  border-bottom: 2px solid var(--border);
  margin-bottom: 4px;
}

.cart-top h3 {
  font-size: 24px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.top-actions {
  display: flex;
  gap: 8px;
}

.chip {
  background: rgba(16, 180, 157, 0.12);
  padding: 6px 10px;
  border-radius: 999px;
  color: var(--primary);
  border: 1px solid rgba(16, 180, 157, 0.3);
  font-weight: 600;
  transition: all 0.3s ease;
}

.empty-cart {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
  animation: fadeIn 0.5s ease;
}

.empty-icon {
  font-size: 80px;
  opacity: 0.2;
  margin-bottom: 16px;
  animation: float 3s ease-in-out infinite;
}

.empty-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 8px 0;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes float {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-10px);
  }
}

.cart {
  margin-top: 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  max-height: 80vh;
  min-height: 480px;
  overflow: auto;
  position: relative;
  background: var(--surface);
  padding: 20px;
}

.cart-item {
  display: grid;
  grid-template-columns: 80px 1.2fr 1fr 0.8fr;
  align-items: center;
  gap: 14px;
  padding: 16px;
  margin-bottom: 12px;
  border-radius: 16px;
  border: 2px solid transparent;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.9));
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: slideIn 0.4s ease-out;
  position: relative;
  overflow: hidden;
}

.cart-item::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(91, 231, 196, 0.05), transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.cart-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border-color: rgba(91, 231, 196, 0.3);
}

.cart-item:hover::before {
  opacity: 1;
}

.cart-item:active {
  transform: translateY(0);
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.item-image {
  width: 80px;
  height: 80px;
  border-radius: 14px;
  overflow: hidden;
  border: 2px solid var(--border);
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: transform 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.cart-item:hover .item-image {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.cart-item:hover .item-image img {
  transform: scale(1.1);
}

.no-image {
  font-size: 36px;
  opacity: 0.25;
  transition: all 0.3s ease;
}

.cart-item:hover .no-image {
  opacity: 0.4;
  transform: scale(1.1);
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.discount-tag {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
  animation: pulse 2s ease-in-out infinite;
  position: relative;
  overflow: hidden;
}

.discount-tag::after {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(90deg,
      transparent,
      rgba(255, 255, 255, 0.3),
      transparent);
  animation: shine 3s infinite;
}

@keyframes pulse {

  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
  }

  50% {
    transform: scale(1.05);
    box-shadow: 0 4px 8px rgba(239, 68, 68, 0.5);
  }
}

@keyframes shine {
  0% {
    transform: translateX(-100%) translateY(-100%) rotate(45deg);
  }

  100% {
    transform: translateX(100%) translateY(100%) rotate(45deg);
  }
}

.item-prices {
  display: flex;
  align-items: center;
  gap: 8px;
}

.original-price {
  text-decoration: line-through;
  color: var(--muted);
  font-size: 13px;
  margin: 0;
}

.current-price {
  margin: 0;
  font-weight: 600;
}

.current-price.discounted {
  color: #22c55e;
}

.count {
  display: flex;
  align-items: center;
  gap: 8px;
}

.count button {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border: 2px solid var(--border);
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.count button:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--primary), var(--primary-strong));
  border-color: var(--primary);
  color: white;
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(91, 231, 196, 0.3);
}

.count button:active:not(:disabled) {
  transform: scale(0.95);
}

.count button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.count input {
  width: 70px;
  text-align: center;
  padding: 10px;
  border-radius: 10px;
  border: 2px solid var(--border);
  font-weight: 600;
  font-size: 15px;
  transition: border-color 0.2s ease;
}

.count input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(91, 231, 196, 0.1);
}

.item-total {
  text-align: right;
}

.item-total button.link {
  line-height: 1;
  font-weight: 700;
  border-radius: 8px;
}

button {
  border: none;
  background: #e8eff4;
  color: var(--text);
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

button:active:not(:disabled) {
  transform: translateY(0);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button.primary {
  background: linear-gradient(120deg, var(--primary), var(--primary-strong));
  color: #0c1829;
  border: none;
  box-shadow: 0 2px 8px rgba(91, 231, 196, 0.3);
}

button.primary:hover:not(:disabled) {
  box-shadow: 0 6px 20px rgba(91, 231, 196, 0.4);
  transform: translateY(-2px);
}

button.primary::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transform: translateX(-100%);
  transition: transform 0.6s;
}

button.primary:hover::before {
  transform: translateX(100%);
}

button.ghost {
  background: transparent;
  border: 1px solid var(--border);
}

button.ghost:hover:not(:disabled) {
  background: rgba(91, 231, 196, 0.05);
  border-color: var(--primary);
  color: var(--primary);
}

button.link {
  background: transparent;
  border: none;
  color: #f16c7f;
  padding: 6px 8px;
  font-size: 18px;
  transition: all 0.2s ease;
}

button.link:hover {
  color: #dc2626;
  transform: scale(1.2);
}

.actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
}

.summary {
  margin-top: 16px;
  border-top: 2px solid var(--border);
  padding-top: 16px;
  background: linear-gradient(135deg, rgba(91, 231, 196, 0.02), rgba(91, 231, 196, 0.05));
  border-radius: 12px;
  padding: 16px;
  margin-top: 20px;
}

.field {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.field label {
  font-weight: 600;
  font-size: 14px;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 12px;
}

.field input,
.field select {
  padding: 12px 14px;
  border: 2px solid var(--border);
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  transition: all 0.2s ease;
  background: white;
}

.field input:focus,
.field select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(91, 231, 196, 0.1);
}

.field input::placeholder {
  color: var(--muted);
  opacity: 0.6;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-size: 18px;
}

.summary-row span {
  color: var(--muted);
  font-weight: 500;
}

.summary-row strong {
  font-size: 28px;
  color: var(--primary);
  font-weight: 700;
}

.muted {
  color: var(--muted);
}

.warning {
  color: #f16c7f;
  margin-top: 8px;
}

.payment-hint {
  margin-top: 12px;
  padding: 14px 16px;
  border: 2px solid #f59e0b;
  background: linear-gradient(135deg, #fffbeb, #fef3c7);
  border-radius: 14px;
  color: #92400e;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.15);
  animation: fadeIn 0.3s ease;
}

.payment-hint .highlight {
  padding: 2px 6px;
  border-radius: 6px;
  font-weight: 700;
}

.payment-hint .highlight.success {
  background: #dcfce7;
  color: #166534;
}

.payment-hint .highlight.danger {
  background: #fee2e2;
  color: #991b1b;
}

.emphasis {
  font-size: 16px;
  font-weight: 600;
}

.payment-wait {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 16px 0;
  padding: 16px 18px;
  border: 1px solid rgba(91, 231, 196, 0.35);
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(91, 231, 196, 0.1), rgba(91, 231, 196, 0.04));
  animation: fadeIn 0.25s ease;
}

.payment-wait .wait-text {
  flex: 1;
}

.payment-wait .wait-text p {
  margin: 0;
  font-weight: 600;
  color: var(--text);
}

.payment-wait .wait-text .title {
  font-size: 16px;
}

.pulse-loader {
  display: flex;
  gap: 6px;
  align-items: center;
}

.pulse-loader span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--primary);
  animation: pulse 1s ease-in-out infinite;
}

.pulse-loader span:nth-child(2) {
  animation-delay: 0.15s;
}

.pulse-loader span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes pulse {

  0%,
  100% {
    transform: translateY(0);
    opacity: 0.5;
  }

  50% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

.pix-block {
  margin: 16px 0;
  padding: 20px;
  background: linear-gradient(135deg, rgba(91, 231, 196, 0.03), rgba(91, 231, 196, 0.06));
  border: 2px solid rgba(91, 231, 196, 0.2);
  border-radius: 16px;
  animation: fadeIn 0.3s ease;
}

.pix-qr {
  display: grid;
  place-items: center;
  padding: 16px;
  border: 2px solid var(--border);
  border-radius: 16px;
  background: white;
  max-width: 280px;
  margin: 12px auto;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.pix-qr img {
  width: 100%;
  max-width: 240px;
  height: auto;
  border-radius: 8px;
}

.qr-text {
  word-break: break-all;
  text-align: center;
}

.spinner {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 3px solid rgba(91, 231, 196, 0.2);
  border-top-color: var(--primary);
  border-right-color: var(--primary);
  animation: spin 0.8s linear infinite;
  box-shadow: 0 2px 8px rgba(91, 231, 196, 0.3);
}

.sm {
  font-size: 12px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  padding: 20px;
  z-index: 20;
  animation: fadeIn 0.2s ease;
}

.modal-box {
  width: min(900px, 100%);
  padding: 18px;
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal.success {
  background: rgba(16, 185, 129, 0.1);
}

.modal.success .modal-box {
  width: min(420px, 90%);
  text-align: center;
  padding: 32px 22px 22px;
  animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.success-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: 900;
  margin: 0 auto 20px;
  box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4);
  animation: successPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s backwards;
}

@keyframes successPop {
  0% {
    transform: scale(0) rotate(-180deg);
    opacity: 0;
  }

  100% {
    transform: scale(1) rotate(0);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid var(--border);
}

.modal-header h3 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: var(--text);
}

.modal-header .eyebrow {
  text-transform: uppercase;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--primary);
  margin: 0 0 4px 0;
}

.customer-step {
  display: grid;
  gap: 12px;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

@media (max-width: 980px) {
  .workspace {
    flex-direction: column;
    display: flex;
    padding: 0 8px;
  }

  .cart {
    max-height: none;
    min-height: 0;
  }

  .cart-item {
    grid-template-columns: 60px 1fr;
    gap: 10px;
  }

  .item-image {
    width: 60px;
    height: 60px;
  }

  .count {
    grid-column: 1 / -1;
    justify-content: center;
  }

  .item-total {
    grid-column: 1 / -1;
    text-align: center;
  }

  .cart-top {
    position: static;
    background: none;
  }

  .hero {
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }

  .total {
    text-align: center;
  }
}
</style>

<style>
.modal-box.payment {
  width: min(900px, 100%);
  max-height: 90vh;
  overflow-y: auto;
}

.payment-total {
  background: linear-gradient(135deg, rgba(91, 231, 196, 0.08), rgba(91, 231, 196, 0.12));
  border: 2px solid rgba(91, 231, 196, 0.3);
  padding: 16px 18px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 4px 16px rgba(91, 231, 196, 0.15);
  transition: all 0.3s ease;
}

.payment-total:hover {
  box-shadow: 0 6px 24px rgba(91, 231, 196, 0.25);
  transform: translateY(-2px);
}

.payment-total span {
  font-size: 16px;
  color: var(--muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.payment-total strong {
  color: var(--primary-strong);
  font-size: 32px;
  font-weight: 800;
}

.payment-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}

.pay-chip {
  padding: 14px 20px;
  border-radius: 14px;
  border: 2px solid var(--border);
  background: linear-gradient(135deg, #ffffff, #f9fafb);
  color: var(--text);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 600;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.pay-chip::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(91, 231, 196, 0.1), rgba(91, 231, 196, 0.05));
  opacity: 0;
  transition: opacity 0.2s ease;
}

.pay-chip:hover::before {
  opacity: 1;
}

.pay-chip:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.pay-chip.active {
  border-color: var(--primary);
  background: linear-gradient(135deg, rgba(16, 180, 157, 0.15), rgba(16, 180, 157, 0.1));
  color: var(--primary-strong);
  box-shadow: 0 0 0 3px rgba(16, 180, 157, 0.15), 0 4px 12px rgba(91, 231, 196, 0.2);
  transform: scale(1.02);
}

.pay-chip.active::before {
  opacity: 0;
}

/* Screensaver */
.screensaver {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: linear-gradient(135deg, #0c1829 0%, #1a2942 50%, #0c1829 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.5s ease;
  cursor: pointer;
}

.screensaver-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  position: relative;
}

.promo-carousel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 1600px;
  position: relative;
}

.carousel-track {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  min-height: 350px;
}

.promo-slide {
  position: absolute;
  width: 100%;
  max-width: clamp(700px, 90vw, 1200px);
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.promo-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.9));
  border-radius: 20px;
  padding: 60px;
  min-height: 420px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  align-items: center;
  width: 100%;
  max-width: clamp(360px, 80vw, 1200px);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  position: relative;
  overflow: hidden;
  animation: scaleIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.promo-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(91, 231, 196, 0.1), transparent 50%, rgba(91, 231, 196, 0.05));
  pointer-events: none;
}

.promo-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  padding: 10px 14px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(239, 68, 68, 0.4);
  animation: pulse 2s ease-in-out infinite, rotate 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 2;
}

.discount-percent {
  font-size: 28px;
  font-weight: 900;
  line-height: 1;
  margin-bottom: 3px;
}

.discount-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

@keyframes rotate {
  from {
    transform: rotate(-10deg) scale(0);
  }

  to {
    transform: rotate(0) scale(1);
  }
}

.promo-image {
  width: 100%;
  height: 260px;
  border-radius: 14px;
  overflow: hidden;
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border: 2px solid rgba(91, 231, 196, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.15);
  position: relative;
}

.promo-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  animation: zoomIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.promo-image .no-image {
  font-size: 60px;
  opacity: 0.3;
}

@keyframes zoomIn {
  from {
    transform: scale(0.8);
    opacity: 0;
  }

  to {
    transform: scale(1);
    opacity: 1;
  }
}

.promo-details {
  display: flex;
  flex-direction: column;
  gap: 20px;
  animation: slideRight 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes slideRight {
  from {
    transform: translateX(-40px);
    opacity: 0;
  }

  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.promo-title {
  font-size: 28px;
  font-weight: 900;
  color: #0c1829;
  margin: 0;
  line-height: 1.2;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.promo-prices {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.price-original {
  font-size: 16px;
  color: #9ca3af;
  text-decoration: line-through;
  font-weight: 600;
}

.price-current {
  font-size: 36px;
  font-weight: 900;
  color: var(--primary);
  line-height: 1;
  text-shadow: 0 4px 8px rgba(91, 231, 196, 0.3);
}

.promo-expiry {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(245, 158, 11, 0.1);
  border: 2px solid rgba(245, 158, 11, 0.3);
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  color: #92400e;
}

.expiry-icon {
  width: 18px;
  height: 18px;
  color: #f59e0b;
  flex-shrink: 0;
}

.screensaver-footer {
  padding: 24px;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.tap-message {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 24px;
  background: linear-gradient(135deg, rgba(91, 231, 196, 0.2), rgba(91, 231, 196, 0.1));
  border: 2px solid rgba(91, 231, 196, 0.4);
  border-radius: 14px;
  color: var(--primary);
  font-size: 17px;
  font-weight: 700;
  animation: bounce 2s ease-in-out infinite;
  box-shadow: 0 8px 24px rgba(91, 231, 196, 0.3);
}

.tap-icon {
  width: 28px;
  height: 28px;
  color: var(--primary);
  animation: tapPulse 2s ease-in-out infinite;
}

@keyframes bounce {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-8px);
  }
}

@keyframes tapPulse {

  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }

  50% {
    transform: scale(1.2);
    opacity: 0.7;
  }
}

/* Transition animations */
.slide-fade-enter-active {
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-leave-active {
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-enter-from {
  transform: translateX(100%) scale(0.9);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateX(-100%) scale(0.9);
  opacity: 0;
}

@media (max-width: 1024px) {
  .promo-card {
    grid-template-columns: 1fr;
    gap: 16px;
    padding: 16px;
  }

  .promo-badge {
    top: 12px;
    right: 12px;
    padding: 8px 12px;
  }

  .discount-percent {
    font-size: 24px;
  }

  .discount-label {
    font-size: 10px;
  }

  .promo-image {
    height: 200px;
  }

  .promo-title {
    font-size: 22px;
  }

  .price-current {
    font-size: 28px;
  }

  .price-original {
    font-size: 14px;
  }

  .promo-expiry {
    font-size: 12px;
    padding: 8px 12px;
  }

  .tap-message {
    font-size: 15px;
    padding: 12px 20px;
  }

  .tap-icon {
    width: 24px;
    height: 24px;
  }
}
</style>

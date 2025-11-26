<template>
  <div class="kiosk">
    <input class="scan-input" ref="barcodeInput" v-model="barcode" @keyup.enter="handleBarcode" aria-label="Leitor oculto" />

    <section class="workspace">
      <div class="right glass">
        <div class="cart-top">
          <h3>Carrinho</h3>
          <span class="chip">{{ totalItems }} itens</span>
          <div class="top-actions">
            <button class="ghost sm" @click="openBarcode">Digitar código</button>
            <button class="ghost sm" @click="showLocationModal = true">Trocar local</button>
          </div>
        </div>
        <div class="cart">
          <div v-for="item in cart" :key="item.saleItemId" class="cart-item">
            <div>
              <strong>{{ item.name }}</strong>
              <p class="muted">R$ {{ item.price.toFixed(2) }}</p>
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
          <p v-if="!cart.length" class="muted">Bipe um produto para começar.</p>
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
          <input
            type="password"
            v-model="locationPasswordInput"
            placeholder="Digite a senha"
            @input="locationPasswordError = ''"
          />
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
        <input id="manual-barcode" v-model="manualBarcode" placeholder="Código de barras" @keyup.enter="confirmManualBarcode" />
        <div class="actions">
          <button class="ghost" @click="closeBarcode">Voltar</button>
          <button class="primary" @click="confirmManualBarcode">Confirmar</button>
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
            <button
              v-for="opt in paymentOptions"
              :key="opt.value"
              type="button"
              :class="['pay-chip', paymentMethod === opt.value ? 'active' : '']"
              @click="setPayment(opt.value)"
            >
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
          <div class="spinner" aria-hidden="true"></div>
          <div>
            <p>{{ paymentStatusText || 'Processando pagamento...' }}</p>
            <p class="muted sm" v-if="paymentMethod === 'PIX'">Aguardando confirmacao do Pix.</p>
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
        <h3>Compra concluida</h3>
        <p class="muted">Pagamento registrado. Obrigado!</p>
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
import { onMounted, ref, computed, nextTick } from 'vue';
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
const chosenLocation = ref(store.selectedLocation || '');
const showLocationModal = ref(!store.selectedLocation);
const locationPasswordInput = ref('');
const locationPasswordError = ref('');
const LOCATION_PASSWORD = import.meta.env.VITE_LOCATION_PASSWORD || '1234';

async function loadLocations() {
  try {
    const { data } = await api.get('/locations');
    locations.value = data;
    if (!chosenLocation.value && data.length) chosenLocation.value = data[0].code;
  } catch {
    locations.value = [];
    if (!chosenLocation.value) chosenLocation.value = 'default';
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
  grid-template-columns: 1.2fr 1fr 0.8fr;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid var(--border);
}
.cart-item:last-child {
  border-bottom: none;
}
.count {
  display: flex;
  align-items: center;
  gap: 8px;
}
.count input {
  width: 70px;
  text-align: center;
  padding: 10px;
  border-radius: 10px;
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
}
button.primary {
  background: linear-gradient(120deg, var(--primary), var(--primary-strong));
  color: #0c1829;
  border: none;
}
button.ghost {
  background: transparent;
  border: 1px solid var(--border);
}
button.link {
  background: transparent;
  border: none;
  color: #f16c7f;
  padding: 6px 8px;
  font-size: 18px;
}
.actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
}
.summary {
  margin-top: 16px;
  border-top: 1px solid var(--border);
  padding-top: 12px;
}
.field {
  display: grid;
  gap: 6px;
  margin-top: 10px;
}
.summary-row {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
  font-size: 18px;
}
.muted {
  color: var(--muted);
}
.warning {
  color: #f16c7f;
  margin-top: 8px;
}
.payment-hint {
  margin-top: 8px;
  padding: 10px 12px;
  border: 1px solid #f59e0b;
  background: #fffbeb;
  border-radius: 10px;
  color: #92400e;
  font-weight: 600;
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
  gap: 12px;
  margin: 12px 0;
  padding: 10px 12px;
  border: 1px dashed var(--border);
  border-radius: 12px;
  background: var(--surface-2);
}
.pix-block {
  margin: 12px 0;
  padding: 12px;
}
.pix-qr {
  display: grid;
  place-items: center;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  max-width: 260px;
  margin: 0 auto;
}
.pix-qr img {
  width: 100%;
  max-width: 240px;
  height: auto;
}
.qr-text {
  word-break: break-all;
  text-align: center;
}
.spinner {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  animation: spin 0.9s linear infinite;
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
  background: rgba(0, 0, 0, 0.35);
  display: grid;
  place-items: center;
  padding: 20px;
  z-index: 20;
}
.modal-box {
  width: min(900px, 100%);
  padding: 18px;
}
.modal.success .modal-box {
  width: min(420px, 90%);
  text-align: center;
  padding: 22px;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
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
  background: var(--surface-2);
  border: 1px solid var(--border);
  padding: 12px 14px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.payment-total strong {
  color: var(--primary);
  font-size: 24px;
}
.payment-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.pay-chip {
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: #f9fcfd;
  color: var(--text);
  transition: all 120ms ease;
}
.pay-chip.active {
  border-color: var(--primary);
  background: rgba(16, 180, 157, 0.12);
  color: var(--primary-strong);
  box-shadow: 0 0 0 2px rgba(16, 180, 157, 0.12);
}
.pay-chip:hover {
  border-color: var(--primary);
}
</style>

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
          <button class="ghost" @click="showLocationModal = false" :disabled="!chosenLocation">Fechar</button>
        </div>
        <div class="field">
          <label>Local</label>
          <select v-model="chosenLocation">
            <option value="" disabled>Selecione...</option>
            <option v-for="loc in locations" :key="loc._id" :value="loc.code">{{ loc.name }} ({{ loc.code }})</option>
          </select>
        </div>
        <div class="actions modal-actions">
          <button class="primary" :disabled="!chosenLocation" @click="confirmLocation">Confirmar</button>
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
        </div>

        <div class="actions modal-actions">
          <button class="ghost" @click="closePayment">Voltar</button>
          <button class="primary" @click="confirmPayment">Confirmar pagamento</button>
        </div>
      </div>
    </div>

    <div v-if="paymentSuccess" class="modal success">
      <div class="modal-box glass success-box">
        <h3>Compra concluída</h3>
        <p class="muted">Pagamento registrado. Obrigado!</p>
        <div class="payment-total">
          <span>Total</span>
          <strong>R$ {{ subtotal.toFixed(2) }}</strong>
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
const paymentMethod = ref('CASH');
const paymentSuccess = ref(false);
const paymentOptions = [
  { value: 'CASH', label: 'Dinheiro' },
  { value: 'CREDIT_CARD', label: 'Crédito' },
  { value: 'DEBIT_CARD', label: 'Débito' },
  { value: 'PIX', label: 'Pix' },
  { value: 'OTHER', label: 'Outros' }
];

const cart = computed(() => store.cart);
const subtotal = computed(() => store.subtotal);
const totalItems = computed(() => store.totalItems);
const paymentOpen = ref(false);
const locations = ref<any[]>([]);
const chosenLocation = ref(store.selectedLocation || '');
const showLocationModal = ref(true);

async function loadLocations() {
  try {
    const { data } = await api.get('/locations');
    locations.value = data;
    if (!chosenLocation.value && data.length) chosenLocation.value = data[0].code;
  } catch (err) {
    locations.value = [];
    if (!chosenLocation.value) chosenLocation.value = 'default';
  }
}

function confirmLocation() {
  if (!chosenLocation.value) return;
  store.setLocation(chosenLocation.value);
  showLocationModal.value = false;
  focusBarcode();
}

function paymentLabel(pay: string) {
  const map: Record<string, string> = {
    CASH: 'Dinheiro',
    CREDIT_CARD: 'Cartão crédito',
    DEBIT_CARD: 'Cartão débito',
    PIX: 'Pix',
    OTHER: 'Outros'
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

function openPayment() {
  if (!cart.value.length) return;
  paymentOpen.value = true;
}

function closePayment() {
  paymentOpen.value = false;
}

async function confirmPayment() {
  await store.complete(paymentMethod.value, apartmentNote.value);
  paymentOpen.value = false;
  paymentSuccess.value = true;
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
  max-width: 1200px;
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
  max-height: 70vh;
  min-height: 360px;
  overflow: auto;
  position: relative;
  background: var(--surface);
  padding: 16px;
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
  width: min(540px, 100%);
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
  width: min(640px, 100%);
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

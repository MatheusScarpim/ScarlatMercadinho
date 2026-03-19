<template>
  <div class="kiosk" @click="resetInactivity" @mousemove="resetInactivity" @keypress="resetInactivity"
    @touchstart="resetInactivity">
    <!-- Not Launched -->
    <div v-if="notLaunched" class="not-launched-overlay">
      <div class="not-launched-content">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="not-launched-icon">
          <path d="M12 8v4l3 3" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="12" cy="12" r="10"/>
        </svg>
        <h1 class="not-launched-title">Em breve</h1>
        <p class="not-launched-subtitle">{{ wl.brandName }} {{ wl.brandSubtitle }} ainda não foi lançado.</p>
        <p class="not-launched-date">Lançamento previsto: <strong>{{ launchDateFormatted }}</strong></p>
      </div>
    </div>

    <!-- Screensaver -->
    <div v-if="showScreensaver" class="screensaver" @click="exitScreensaver">
      <div class="screensaver-content">
        <div class="promo-carousel">
          <button v-if="promos.length > 1" class="carousel-arrow carousel-arrow-left" @click.stop="prevPromo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
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
          <button v-if="promos.length > 1" class="carousel-arrow carousel-arrow-right" @click.stop="nextPromo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <div v-if="promos.length > 1" class="carousel-dots">
            <span v-for="(_, i) in promos" :key="i" class="carousel-dot" :class="{ active: i === currentPromoIndex % promos.length }" @click.stop="goToPromo(i)" />
          </div>
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

    <!-- Alerta de produto auto-cadastrado -->
    <transition name="slide-down">
      <div v-if="store.autoCreatedAlert" class="auto-created-alert">
        <span class="auto-created-icon">&#x26A0;</span>
        <span>{{ store.autoCreatedAlert }}</span>
        <button class="auto-created-close" @click="store.autoCreatedAlert = ''">&#x2715;</button>
      </div>
    </transition>

    <section class="workspace">
      <div class="right glass">
        <div class="cart-top">
          <h3>Carrinho</h3>
          <span class="chip">{{ totalItems }} itens</span>
          <div class="top-actions">
            <button class="ghost sm" @click="openBarcode">Digitar código</button>
            <button class="ghost sm" @click="openProductSearch">Buscar produtos</button>
            <button class="ghost sm" @click="openPromos">Promoções</button>
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

    <!-- Modal busca de produtos -->
    <div v-if="showProductSearch" class="modal">
      <div class="modal-box glass product-search-modal">
        <div class="modal-header">
          <h3>Buscar produtos</h3>
          <button class="ghost" @click="closeProductSearch">Fechar</button>
        </div>

        <div class="search-bar">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref="searchInput"
            v-model="searchQuery"
            placeholder="Buscar por nome..."
            class="search-input"
            @input="onSearchInput"
          />
        </div>

        <div class="category-chips">
          <button
            :class="['chip-btn', searchCategory === '' ? 'active' : '']"
            @click="setSearchCategory('')"
          >Todas</button>
          <button
            v-for="cat in searchCategories"
            :key="cat._id"
            :class="['chip-btn', searchCategory === cat._id ? 'active' : '']"
            @click="setSearchCategory(cat._id)"
          >{{ cat.name }}</button>
        </div>

        <div v-if="searchLoading" class="search-status">
          <div class="pulse-loader"><span></span><span></span><span></span></div>
          <p class="muted sm">Buscando produtos...</p>
        </div>
        <div v-else-if="searchResults.length" class="product-grid">
          <div
            v-for="product in searchResults"
            :key="product._id"
            class="product-card"
            @click="selectProduct(product)"
          >
            <div class="product-card-img">
              <img
                v-if="product.imageUrl && !productImgErrors[product._id]"
                :src="product.imageUrl"
                :alt="product.name"
                @error="productImgErrors[product._id] = true"
              />
              <svg v-else class="product-card-placeholder" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
            </div>
            <div class="product-card-info">
              <span class="product-card-name">{{ product.name }}</span>
              <span class="product-card-price">R$ {{ Number(product.salePrice).toFixed(2) }}</span>
            </div>
          </div>
        </div>
        <div v-else class="search-status">
          <svg class="search-status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <p class="muted">{{ searchQuery || searchCategory ? 'Nenhum produto encontrado' : 'Busque por nome ou selecione uma categoria' }}</p>
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
          <div v-if="paymentMethod === 'PIX' && pixNeedsCpf && !pixData.paymentId" class="field pix-cpf-fallback">
            <label>CPF do pagador (obrigatório para Pix)</label>
            <input v-model="pixCpf" placeholder="000.000.000-00" maxlength="14"
              @input="formatPixCpf" inputmode="numeric" />
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
            <div v-else>
              <p class="muted sm">
                Aperte o botão <strong style="color: var(--success, green)">verde</strong> na maquininha para pagar.
              </p>
              <p class="muted sm">
                Para cancelar, aperte o botão <strong style="color: var(--danger, red)">vermelho</strong>.
              </p>
            </div>
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

    <!-- Chat de ajuda -->
    <HelpChat />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, nextTick } from 'vue';
import { useKioskStore } from '../stores/kiosk';
import api from '../services/api';
import wl from '../config/whitelabel';
import HelpChat from '../components/HelpChat.vue';

const store = useKioskStore();

const notLaunched = computed(() => {
  if (!wl.launchDate) return false;
  const launch = new Date(wl.launchDate + 'T00:00:00');
  return new Date() < launch;
});

const launchDateFormatted = computed(() => {
  if (!wl.launchDate) return '';
  const d = new Date(wl.launchDate + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
});

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
const pixCpf = ref('');
const pixNeedsCpf = ref(false);
const paymentIdleTimer = ref<number | null>(null);

// Busca de produtos
const showProductSearch = ref(false);
const searchQuery = ref('');
const searchCategory = ref('');
const searchResults = ref<any[]>([]);
const searchCategories = ref<any[]>([]);
const searchLoading = ref(false);
const searchInput = ref<HTMLInputElement | null>(null);
const productImgErrors = ref<Record<string, boolean>>({});
let searchDebounceTimer: number | null = null;
const PAYMENT_IDLE_TIMEOUT = 180000; // 3 minutos
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
      params: { days: 30, location: store.selectedLocation }
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
    if (!paymentOpen.value && !manualBarcodeOpen.value && !showLocationModal.value && !showCustomerModal.value && !showProductSearch.value) {
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
  if (!wl.kioskCpfRequired) {
    showCustomerModal.value = false;
    resetInactivity();
    focusBarcode();
    return;
  }
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

function prevPromo() {
  const total = promos.value.length;
  if (!total) return;
  currentPromoIndex.value = (currentPromoIndex.value - 1 + total) % total;
  restartCarousel();
}

function nextPromo() {
  const total = promos.value.length;
  if (!total) return;
  currentPromoIndex.value = (currentPromoIndex.value + 1) % total;
  restartCarousel();
}

function goToPromo(index: number) {
  currentPromoIndex.value = index;
  restartCarousel();
}

function restartCarousel() {
  stopCarousel();
  startCarousel();
}

function startCarousel() {
  stopCarousel();
  carouselTimer.value = window.setInterval(() => {
    currentPromoIndex.value = (currentPromoIndex.value + 1) % (promos.value.length || 1);
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

function startPaymentIdleTimer() {
  clearPaymentIdleTimer();
  paymentIdleTimer.value = window.setTimeout(() => {
    closePayment();
    store.resetCart();
    enterScreensaver();
  }, PAYMENT_IDLE_TIMEOUT);
}

function clearPaymentIdleTimer() {
  if (paymentIdleTimer.value) {
    clearTimeout(paymentIdleTimer.value);
    paymentIdleTimer.value = null;
  }
}

function openPayment() {
  if (!cart.value.length) return;
  paymentError.value = '';
  paymentTotal.value = subtotal.value;
  showTerminalHint.value = false;
  terminalHintMode.value = 'pay';
  pixNeedsCpf.value = false;
  pixCpf.value = '';
  paymentOpen.value = true;
  startPaymentIdleTimer();
}

function closePayment() {
  clearPaymentIdleTimer();
  paymentOpen.value = false;
  pixData.value = { qrCode: null, qrCodeBase64: null, paymentId: null };
  pixStatus.value = '';
  pixNeedsCpf.value = false;
  pixCpf.value = '';
  showTerminalHint.value = false;
}

async function confirmPayment() {
  showTerminalHint.value = false;
  paymentError.value = '';
  startPaymentIdleTimer();
  paymentProcessing.value = true;

  if (paymentMethod.value === 'PIX') {
    // Se o campo de CPF fallback está visível, salvar o CPF na venda antes
    if (pixNeedsCpf.value) {
      const cpfDigits = pixCpf.value.replace(/\D/g, '');
      if (cpfDigits.length !== 11) {
        paymentError.value = 'Informe um CPF válido com 11 dígitos.';
        paymentProcessing.value = false;
        return;
      }
      try {
        await api.put(`/sales/${store.saleId}/customer`, { cpf: cpfDigits });
      } catch {
        paymentError.value = 'Erro ao salvar CPF. Tente novamente.';
        paymentProcessing.value = false;
        return;
      }
    }

    paymentStatusText.value = 'Gerando pagamento...';
    try {
      const cpfForPix = pixNeedsCpf.value ? pixCpf.value.replace(/\D/g, '') : undefined;
      const result: any = await store.startPayment('PIX', apartmentNote.value, cpfForPix);
      const provider = result?.provider || {};
      pixData.value = {
        qrCode: provider.qrCode || null,
        qrCodeBase64: provider.qrCodeBase64 || null,
        paymentId: provider.paymentId || null
      };
      paymentStatusText.value = 'Aguardando pagamento PIX...';
      clearPaymentIdleTimer(); // PIX gerado, não expira por idle
      await pollPixStatus(provider.paymentId);
    } catch (err: any) {
      const data = err?.response?.data;
      const code = data?.code || '';
      // Se o erro é falta de CPF, mostrar campo fallback
      if (code === 'PIX_CPF_REQUIRED' || (data?.detail || '').includes('13253')) {
        pixNeedsCpf.value = true;
        paymentError.value = 'Informe seu CPF para pagar com Pix.';
        paymentProcessing.value = false;
        return;
      }
      paymentError.value = data?.message || err?.message || 'Erro ao processar pagamento';
    } finally {
      paymentProcessing.value = false;
    }
    return;
  }

  // ─── Cartão: cria intent uma vez, faz polling ─────────────────────
  paymentStatusText.value = 'Enviando para a maquininha...';

  try {
    const result: any = await store.startPayment(paymentMethod.value, apartmentNote.value);
    const provider = result?.provider || {};
    const intentId = provider?.intentId || provider?.payment?.id;

    if (!intentId) {
      throw new Error('Maquininha não retornou ID do pagamento. Verifique a conexão.');
    }

    paymentStatusText.value = 'Aguardando confirmacao na maquininha...';
    const pollResult = await pollPointStatus(intentId);

    if (pollResult === 'approved' || pollResult === 'cancelled_by_user') {
      return;
    }

    // pollResult === 'error' → mostra erro, usuário pode tentar de novo
    paymentProcessing.value = false;
  } catch (err: any) {
    const data = err?.response?.data;
    paymentError.value = data?.message || err?.message || 'Erro ao processar pagamento';
    paymentProcessing.value = false;
  }
}

async function pollPixStatus(paymentId?: string) {
  if (!paymentId) throw new Error('ID do pagamento PIX nao retornado');
  pixStatus.value = 'pending';
  let attempts = 0;
  const MAX_PIX_ATTEMPTS = 150; // ~5 minutos
  while (attempts < MAX_PIX_ATTEMPTS) {
    if (!paymentOpen.value) return; // cancelado pelo usuario
    let data: any;
    try {
      const res = await api.get(`/payments/status/${paymentId}`);
      data = res.data;
    } catch (pollErr: any) {
      const errData = pollErr?.response?.data;
      // Se for erro de rede/timeout, continua tentando
      if (errData?.retryable || !pollErr?.response) {
        console.warn('[PIX-POLL] Erro retentável:', errData?.code || pollErr?.message);
        await new Promise((resolve) => setTimeout(resolve, 3000));
        attempts++;
        continue;
      }
      // Erro não retentável
      pixStatus.value = 'error';
      throw new Error(errData?.message || pollErr?.message || 'Erro ao verificar PIX');
    }
    const status = (data?.status || data?.status_detail || '').toLowerCase();
    if (['approved', 'accredited', 'completed'].includes(status)) {
      pixStatus.value = 'approved';
      await store.finalizeSale('PIX', apartmentNote.value);
      paymentOpen.value = false;
      paymentTotal.value = subtotal.value || paymentTotal.value;
      paymentSuccess.value = true;
      return;
    }
    if (['rejected', 'cancelled', 'canceled'].includes(status)) {
      pixStatus.value = 'rejected';
      const msg = data?.error_message || `Pagamento PIX ${status}`;
      throw new Error(msg);
    }
    if (status === 'expired') {
      pixStatus.value = 'expired';
      throw new Error(data?.error_message || 'QR Code PIX expirou. Gere um novo pagamento.');
    }
    if (['refunded', 'charged_back'].includes(status)) {
      pixStatus.value = 'error';
      throw new Error(data?.error_message || `Pagamento PIX ${status}`);
    }
    if (status === 'in_mediation') {
      pixStatus.value = 'error';
      throw new Error(data?.error_message || 'Pagamento PIX está em disputa.');
    }
    await new Promise((resolve) => setTimeout(resolve, 2000 + attempts * 300));
    attempts++;
  }
  throw new Error('Tempo limite aguardando pagamento PIX. Gere um novo pagamento.');
}

async function pollPointStatus(intentId: string): Promise<'approved' | 'error' | 'cancelled_by_user'> {
  paymentStatusText.value = 'Aguardando confirmacao na maquininha...';
  let attempts = 0;
  const MAX_POINT_ATTEMPTS = 90; // ~3 minutos

  while (attempts < MAX_POINT_ATTEMPTS) {
    if (!paymentOpen.value) return 'cancelled_by_user';

    let data: any;
    try {
      const res = await api.get(`/payments/point/${intentId}`);
      data = res.data;
    } catch (pollErr: any) {
      const errData = pollErr?.response?.data;
      if (errData?.retryable || !pollErr?.response) {
        console.warn('[POINT-POLL] Erro retentável:', errData?.code || pollErr?.message);
        await new Promise((resolve) => setTimeout(resolve, 3000));
        attempts++;
        continue;
      }
      // Erro não retentável no polling
      paymentError.value = errData?.message || pollErr?.message || 'Erro ao verificar maquininha';
      return 'error';
    }

    const state = (data?.state || data?.status || '').toLowerCase();
    console.log('[POINT-POLL] Resposta MP:', JSON.stringify(data));

    // Extrai o resultado REAL do pagamento (pode estar em vários campos)
    const paymentResult = (
      data?.payment?.result ||
      data?.payment?.state ||
      data?.payment?.status ||
      data?.payment_status ||
      data?.payment_result ||
      data?.transactions?.[0]?.result ||
      data?.transactions?.[0]?.state ||
      data?.transactions?.[0]?.status ||
      ''
    ).toLowerCase();

    console.log('[POINT-POLL] state:', state, '| paymentResult:', paymentResult);

    // APPROVED direto ou FINISHED com payment.id = pagamento aprovado
    // A API Point do MP não retorna payment.result — FINISHED + payment.id já é aprovação
    const hasPaymentId = !!(data?.payment?.id || data?.payment_id);
    const isApproved =
      state === 'approved' ||
      (state === 'finished' && (hasPaymentId || ['approved', 'success', 'accredited'].includes(paymentResult)));

    if (isApproved) {
      const totalPaid = subtotal.value || paymentTotal.value;
      await store.finalizeSale(paymentMethod.value, apartmentNote.value);
      paymentOpen.value = false;
      paymentTotal.value = totalPaid;
      paymentSuccess.value = true;
      paymentProcessing.value = false;
      return 'approved';
    }

    // FINISHED sem payment.id e sem resultado claro = erro real
    if (state === 'finished') {
      console.warn('[POINT-POLL] FINISHED sem payment.id, paymentResult:', paymentResult);
      paymentError.value = data?.error_message || 'Pagamento não confirmado pela maquininha.';
      return 'error';
    }

    // Estados terminais de erro → retry
    if (['rejected', 'cancelled', 'canceled', 'expired', 'error', 'abandoned'].includes(state)) {
      console.warn('[POINT-POLL] Estado terminal:', state, '- reenviando');
      paymentError.value = data?.error_message || `Pagamento ${state}. Reenviando...`;
      return 'error';
    }

    await new Promise((resolve) => setTimeout(resolve, 2000 + Math.min(attempts, 10) * 300));
    attempts++;
  }

  paymentError.value = 'Tempo limite aguardando maquininha. Reenviando...';
  return 'error';
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
  clearPaymentIdleTimer();
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

// ─── Busca de produtos ────────────────────────────────────────────
async function loadCategories() {
  try {
    const { data } = await api.get('/categories');
    searchCategories.value = (data || []).filter((c: any) => c.active !== false);
  } catch {
    searchCategories.value = [];
  }
}

async function fetchProducts() {
  searchLoading.value = true;
  try {
    const params: Record<string, string> = { active: 'true', limit: '50', location: store.selectedLocation };
    if (searchQuery.value.trim()) params.search = searchQuery.value.trim();
    if (searchCategory.value) params.category = searchCategory.value;
    const { data } = await api.get('/products', { params });
    searchResults.value = data.data || data || [];
    productImgErrors.value = {};
  } catch {
    searchResults.value = [];
  } finally {
    searchLoading.value = false;
  }
}

function onSearchInput() {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = window.setTimeout(() => {
    fetchProducts();
  }, 300);
}

function setSearchCategory(catId: string) {
  searchCategory.value = catId;
  fetchProducts();
}

async function openProductSearch() {
  showProductSearch.value = true;
  searchQuery.value = '';
  searchCategory.value = '';
  searchResults.value = [];
  await loadCategories();
  fetchProducts();
  nextTick(() => searchInput.value?.focus());
}

function closeProductSearch() {
  showProductSearch.value = false;
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  focusBarcode();
}

async function selectProduct(product: any) {
  await store.addByProduct(product);
  resetInactivity();
}

async function confirmManualBarcode() {
  barcode.value = manualBarcode.value;
  await handleBarcode();
  manualBarcode.value = '';
  closeBarcode();
}

function formatPixCpf() {
  let digits = pixCpf.value.replace(/\D/g, '').slice(0, 11);
  if (digits.length > 9) digits = digits.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
  else if (digits.length > 6) digits = digits.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
  else if (digits.length > 3) digits = digits.replace(/(\d{3})(\d{1,3})/, '$1.$2');
  pixCpf.value = digits;
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
.not-launched-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: var(--bg, #f6f8fb);
  display: flex;
  align-items: center;
  justify-content: center;
}

.not-launched-content {
  text-align: center;
  padding: 40px;
}

.not-launched-icon {
  width: 80px;
  height: 80px;
  color: var(--primary, #10b49d);
  margin-bottom: 24px;
}

.not-launched-title {
  font-size: 48px;
  font-weight: 700;
  color: var(--text, #1f2937);
  margin: 0 0 12px;
}

.not-launched-subtitle {
  font-size: 20px;
  color: var(--muted, #5b6577);
  margin: 0 0 8px;
}

.not-launched-date {
  font-size: 18px;
  color: var(--muted, #5b6577);
  margin: 0;
}

.not-launched-date strong {
  color: var(--primary, #10b49d);
}

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
  .kiosk {
    padding: 0;
    margin: 0;
    max-width: 100%;
    height: 100vh;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .workspace {
    flex-direction: column;
    display: flex;
    flex: 1;
    padding: 0;
    margin: 0;
    overflow: hidden;
  }

  .right {
    padding: 10px;
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
    border-radius: 0;
    border: none;
    box-shadow: none;
  }

  .cart {
    flex: 1;
    max-height: none;
    min-height: 0;
    overflow-y: auto;
    padding: 10px;
    margin-top: 8px;
    -webkit-overflow-scrolling: touch;
  }

  .cart-top {
    position: static;
    background: none;
    flex-wrap: wrap;
    gap: 8px;
    padding: 6px 0 10px;
    flex-shrink: 0;
  }

  .cart-top h3 {
    font-size: 20px;
  }

  .top-actions {
    width: 100%;
    justify-content: stretch;
  }

  .top-actions button {
    flex: 1;
    padding: 12px 8px;
    font-size: 13px;
  }

  .cart-item {
    grid-template-columns: 56px 1fr auto;
    gap: 10px;
    padding: 12px;
    margin-bottom: 8px;
  }

  .item-image {
    width: 56px;
    height: 56px;
    border-radius: 10px;
  }

  .item-info strong {
    font-size: 14px;
  }

  .count {
    grid-column: 1 / -1;
    justify-content: center;
    gap: 12px;
  }

  .count button {
    width: 44px;
    height: 44px;
    font-size: 20px;
  }

  .count input {
    width: 60px;
    padding: 10px 6px;
    font-size: 16px;
  }

  .item-total {
    grid-column: 1 / -1;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
  }

  .item-total button.link {
    font-size: 20px;
    padding: 8px 12px;
  }

  .summary {
    padding: 12px;
    margin-top: 0;
    flex-shrink: 0;
    border-radius: 0;
  }

  .summary-row strong {
    font-size: 24px;
  }

  .summary .actions {
    flex-direction: column;
    gap: 8px;
  }

  .summary .actions button {
    width: 100%;
    padding: 16px;
    font-size: 16px;
  }

  .hero {
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }

  .total {
    text-align: center;
  }

  .empty-cart {
    padding: 40px 16px;
  }

  .empty-icon {
    font-size: 56px;
  }
}

.auto-created-alert {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffc107;
  border-radius: 10px;
  padding: 12px 20px;
  font-size: 15px;
  font-weight: 500;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  max-width: 90vw;
}

.auto-created-icon {
  font-size: 20px;
}

.auto-created-close {
  background: none;
  border: none;
  color: #856404;
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
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

.carousel-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  background: none;
  border: none;
  color: white;
  padding: 0;
  cursor: pointer;
  transition: opacity 0.25s ease;
  opacity: 0.7;
}

.carousel-arrow:hover {
  opacity: 1;
}

.carousel-arrow svg {
  width: 48px;
  height: 48px;
}

.carousel-arrow-left {
  left: 16px;
}

.carousel-arrow-right {
  right: 16px;
}

.carousel-dots {
  position: absolute;
  bottom: -32px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
}

.carousel-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: all 0.25s ease;
}

.carousel-dot.active {
  background: #5be7c4;
  transform: scale(1.3);
  box-shadow: 0 0 12px rgba(91, 231, 196, 0.5);
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

/* ─── Tablet portrait (600-980px) ─── */
@media (max-width: 980px) {
  .modal {
    padding: 12px;
  }

  .modal-box {
    width: 100%;
    padding: 16px;
  }

  .modal-box.payment {
    width: 100%;
    max-height: 95vh;
  }

  .modal-header h3 {
    font-size: 20px;
  }

  .payment-total strong {
    font-size: 26px;
  }

  .payment-options {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 8px;
  }

  .pay-chip {
    padding: 16px 10px;
    text-align: center;
    font-size: 15px;
  }

  .field input,
  .field select {
    padding: 14px;
    font-size: 16px;
  }

  .modal-actions {
    flex-direction: column-reverse;
    gap: 8px;
  }

  .modal-actions button {
    width: 100%;
    padding: 16px;
    font-size: 16px;
  }

  .pix-qr {
    max-width: 240px;
  }

  .pix-qr img {
    max-width: 200px;
  }

  .payment-wait {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }

  .customer-step .field input {
    padding: 16px;
    font-size: 18px;
  }
}

/* ─── Small tablet / phone portrait ─── */
@media (max-width: 600px) {
  .kiosk {
    padding: 8px 6px 16px;
  }

  .cart {
    max-height: 45vh;
    padding: 8px;
  }

  .cart-item {
    grid-template-columns: 48px 1fr;
    gap: 8px;
    padding: 10px;
  }

  .item-image {
    width: 48px;
    height: 48px;
  }

  .cart-top h3 {
    font-size: 18px;
  }

  .top-actions {
    flex-wrap: wrap;
  }

  .top-actions button {
    font-size: 12px;
    padding: 10px 6px;
  }

  .payment-options {
    grid-template-columns: 1fr;
  }

  .screensaver-content {
    padding: 16px;
  }

  .carousel-track {
    min-height: 250px;
  }

  .promo-card {
    padding: 14px;
    min-height: 300px;
  }

  .promo-image {
    height: 160px;
  }

  .promo-title {
    font-size: 18px;
  }

  .price-current {
    font-size: 24px;
  }
}

/* ─── Busca de produtos ────────────────────────────────── */
.product-search-modal {
  width: 92vw;
  max-width: 1100px;
  height: 88vh;
  display: flex;
  flex-direction: column;
  padding: 24px 28px;
  gap: 0;
}

.product-search-modal .modal-header {
  margin-bottom: 16px;
}

.search-bar {
  position: relative;
  margin-bottom: 14px;
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: var(--muted, #94a3b8);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 14px 16px 14px 44px;
  font-size: 16px;
  border: 2px solid var(--border, #e2e8f0);
  border-radius: 14px;
  outline: none;
  background: var(--bg, #f8fafc);
  color: var(--text, #1f2937);
  transition: border-color 0.2s, background 0.2s;
  box-sizing: border-box;
}

.search-input:focus {
  border-color: var(--primary, #10b49d);
  background: #fff;
}

.search-input::placeholder {
  color: var(--muted, #94a3b8);
}

.category-chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 12px;
  margin-bottom: 4px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
}

.category-chips::-webkit-scrollbar {
  height: 3px;
}

.category-chips::-webkit-scrollbar-thumb {
  background: var(--border, #d1d5db);
  border-radius: 3px;
}

.chip-btn {
  flex-shrink: 0;
  padding: 8px 18px;
  border-radius: 24px;
  border: 1.5px solid var(--border, #e2e8f0);
  background: #fff;
  color: var(--muted, #64748b);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.chip-btn:hover {
  border-color: var(--primary, #10b49d);
  color: var(--primary, #10b49d);
  background: rgba(16, 180, 157, 0.04);
}

.chip-btn.active {
  background: var(--primary, #10b49d);
  border-color: var(--primary, #10b49d);
  color: #fff;
  font-weight: 600;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  align-content: start;
  gap: 14px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  padding: 8px 4px;
  scrollbar-width: thin;
}

.product-grid::-webkit-scrollbar {
  width: 5px;
}

.product-grid::-webkit-scrollbar-thumb {
  background: var(--border, #d1d5db);
  border-radius: 5px;
}

.product-card {
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  border: 1.5px solid var(--border, #e5e7eb);
  background: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
}

.product-card:hover {
  border-color: var(--primary, #10b49d);
  box-shadow: 0 4px 20px rgba(16, 180, 157, 0.12);
  transform: translateY(-3px);
}

.product-card:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(16, 180, 157, 0.1);
}

.product-card-img {
  width: 100%;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  overflow: hidden;
  position: relative;
}

.product-card-img img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 12px;
  transition: transform 0.2s;
}

.product-card:hover .product-card-img img {
  transform: scale(1.05);
}

.product-card-placeholder {
  width: 48px;
  height: 48px;
  color: var(--border, #cbd5e1);
}

.product-card-info {
  padding: 10px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-top: 1px solid var(--border, #f1f5f9);
}

.product-card-name {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: var(--text, #1f2937);
}

.product-card-price {
  font-size: 16px;
  font-weight: 700;
  color: var(--primary, #10b49d);
  letter-spacing: -0.02em;
}

.search-status {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px 0;
}

.search-status-icon {
  width: 48px;
  height: 48px;
  color: var(--border, #cbd5e1);
}
</style>

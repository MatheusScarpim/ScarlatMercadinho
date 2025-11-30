<template>
  <div class="view-container">
    <div class="header">
      <h3>Compras / Entradas</h3>
      <div class="margin-pill" v-if="marginPercent !== null">
        Margem padrão: <strong>{{ marginPercent }}%</strong>
      </div>
      <div class="header-actions">
        <button class="btn btn-ghost" @click="exportPurchases">Exportar Excel</button>
        <button class="btn btn-primary" @click="openForm">Nova compra</button>
      </div>
    </div>

    <BaseModal :open="showForm" title="Nova compra" :onClose="closeForm">
      <form @submit.prevent="save" class="modal-form">
        <!-- Stepper -->
        <div class="stepper">
          <div class="step" :class="{ active: currentStep === 1, completed: currentStep > 1 }">
            <div class="step-number">{{ currentStep > 1 ? '✓' : '1' }}</div>
            <div class="step-info">
              <div class="step-title">Importação</div>
              <div class="step-subtitle">Nota ou manual</div>
            </div>
          </div>
          <div class="step-divider" :class="{ active: currentStep > 1 }"></div>
          <div class="step" :class="{ active: currentStep === 2, completed: currentStep > 2 }">
            <div class="step-number">{{ currentStep > 2 ? '✓' : '2' }}</div>
            <div class="step-info">
              <div class="step-title">Fornecedor</div>
              <div class="step-subtitle">Dados básicos</div>
            </div>
          </div>
          <div class="step-divider" :class="{ active: currentStep > 2 }"></div>
          <div class="step" :class="{ active: currentStep === 3, completed: currentStep > 3 }">
            <div class="step-number">{{ currentStep > 3 ? '✓' : '3' }}</div>
            <div class="step-info">
              <div class="step-title">Produtos</div>
              <div class="step-subtitle">Itens da compra</div>
            </div>
          </div>
        </div>

        <!-- Etapa 1: Método de Importação -->
        <div v-if="currentStep === 1" class="step-content">
          <div class="step-header">
            <h3>Como deseja criar a compra?</h3>
            <p class="muted">Escolha importar uma nota fiscal ou criar manualmente</p>
          </div>

          <div class="import-methods-wizard">
            <button type="button" class="import-option" :class="{ selected: importMethod === 'manual' }"
              @click="selectManualMethod">
              <div class="option-icon">✍️</div>
              <div class="option-content">
                <h4>Cadastrar manualmente</h4>
                <p class="muted small">Preencha os dados do fornecedor e produtos</p>
              </div>
            </button>

            <button type="button" class="import-option" :class="{ selected: importMethod === 'url' }"
              @click="importMethod = 'url'">
              <div class="option-icon">🔗</div>
              <div class="option-content">
                <h4>Importar com URL</h4>
                <p class="muted small">Cole a URL do QR Code da nota fiscal</p>
              </div>
            </button>

            <button type="button" class="import-option" :class="{ selected: importMethod === 'qrcode' }"
              @click="toggleQRScanner">
              <div class="option-icon">📷</div>
              <div class="option-content">
                <h4>Escanear QR Code</h4>
                <p class="muted small">Use a câmera para ler o QR da nota</p>
              </div>
            </button>
          </div>

          <!-- URL Import -->
          <div v-if="importMethod === 'url'" class="import-detail">
            <div class="input-row">
              <input v-model="nfceUrl" type="url" placeholder="https://www.nfce.fazenda...p=..." />
              <button class="btn btn-primary" type="button" @click="importFromNfceAndNext" :disabled="nfceLoading">
                {{ nfceLoading ? 'Importando...' : 'Importar e continuar' }}
              </button>
            </div>
          </div>

          <!-- QR Scanner -->
          <div v-if="importMethod === 'qrcode' && showQRScanner" class="import-detail">
            <div class="qr-scanner-wrapper">
              <div class="qr-video-container">
                <video ref="videoElement" autoplay playsinline class="qr-video"></video>
                <div class="qr-overlay">
                  <div class="qr-frame"></div>
                </div>
              </div>
              <p class="qr-instruction">Posicione o QR Code dentro da área destacada</p>
              <button type="button" class="btn btn-ghost" @click="stopQRScanner">Cancelar scanner</button>
            </div>
          </div>

          <!-- Processing State -->
          <div v-if="importMethod === 'qrcode' && !showQRScanner && nfceLoading" class="import-detail">
            <div class="processing-state">
              <div class="processing-spinner"></div>
              <div class="processing-content">
                <h4>Processando nota fiscal...</h4>
                <p class="muted small">Por favor aguarde enquanto importamos os dados</p>
              </div>
            </div>
          </div>

          <div v-if="nfceError" class="alert error">
            <span class="alert-icon">⚠️</span>
            <span>{{ nfceError }}</span>
          </div>
          <div v-if="nfceLoaded" class="alert success">
            <span class="alert-icon">✓</span>
            <span>Nota carregada com sucesso!</span>
          </div>
        </div>

        <!-- Etapa 2: Fornecedor -->
        <div v-if="currentStep === 2" class="step-content">
          <div class="step-header">
            <h3>Dados do Fornecedor</h3>
            <p class="muted">Informe os dados básicos da compra</p>
          </div>

          <div class="form-grid">
            <div class="field-block full">
              <label>Fornecedor</label>
              <select v-model="form.supplier" required>
                <option value="" disabled>Selecione o fornecedor</option>
                <option v-for="s in suppliers" :key="s._id" :value="s._id">{{ s.name }}</option>
              </select>
            </div>
            <div class="field-block">
              <label>Local</label>
              <select v-model="form.location" required>
                <option v-for="loc in locations" :key="loc._id" :value="loc.code">
                  {{ loc.name }} ({{ loc.code }})
                </option>
              </select>
            </div>
            <div class="field-block">
              <label>Nota / Pedido</label>
              <input v-model="form.invoiceNumber" placeholder="Opcional" />
            </div>
            <div class="field-block">
              <label>Data de Emissão</label>
              <input type="date" v-model="form.issueDate" required />
            </div>
            <div class="field-block">
              <label>Data de Chegada</label>
              <input type="date" v-model="form.arrivalDate" required />
            </div>
          </div>
        </div>

        <!-- Etapa 3: Produtos -->
        <div v-if="currentStep === 3" class="step-content">
          <div class="step-header">
            <h3>Produtos da Compra</h3>
            <p class="muted">Adicione os produtos e suas quantidades</p>
          </div>

          <div class="items-wizard">
            <div class="item-header-wizard">
              <button class="btn btn-primary" type="button" @click="addItem">+ Adicionar item</button>
            </div>

            <div class="form-items-list">
              <div class="form-item-card" v-for="(item, idx) in form.items" :key="idx">
                <div class="form-item-number">{{ idx + 1 }}</div>
                <div class="form-item-image" v-if="item.product">
                  <img v-if="getProductImageUrl(item.product)" :src="getProductImageUrl(item.product)!"
                    :alt="products.find((p: any) => p._id === item.product)?.name || 'Produto'"
                    @error="(e) => (e.target as HTMLImageElement).style.display = 'none'" />
                  <div v-else class="no-image">📦</div>
                </div>
                <div class="form-item-content">
                  <div class="form-item-row">
                    <div class="field-group">
                      <label class="small-label">Produto</label>
                      <select v-model="item.product" required>
                        <option value="" disabled>Selecione</option>
                        <option v-for="p in products" :key="p._id" :value="p._id">{{ p.name }}</option>
                      </select>
                    </div>
                    <div class="field-group small">
                      <label class="small-label">Quantidade</label>
                      <input type="number" v-model.number="item.quantity" min="1" placeholder="Qtde" />
                    </div>
                  </div>

                  <div class="form-item-row">
                    <div class="field-group">
                      <label class="small-label">Custo unitário</label>
                      <div class="input-with-prefix">
                        <span class="prefix">R$</span>
                        <input type="number" step="0.01" v-model.number="item.unitCost" min="0" placeholder="0,00" />
                      </div>
                    </div>
                    <div class="field-group">
                <label class="small-label">Preço de venda</label>
                <div class="input-with-prefix">
                  <span class="prefix">R$</span>
                  <input type="number" step="0.01" v-model.number="item.salePrice" min="0" placeholder="0,00" />
                </div>
                <button type="button" class="btn btn-ghost btn-suggest" @click="item.salePrice = Number(suggestedSalePrice(item).toFixed(2))">
                  Sugerido: R$ {{ suggestedSalePrice(item).toFixed(2) }}
                </button>
                    </div>
                    <div class="field-group">
                      <label class="small-label">Lote</label>
                      <input v-model="item.batchCode" placeholder="Ex: Lote123" />
                    </div>
                    <div class="field-group">
                      <label class="small-label">Vencimento</label>
                      <input type="date" v-model="item.expiryDate" />
                    </div>
                    <div class="field-group">
                      <label class="small-label">Total</label>
                      <div class="calculated-value primary">R$ {{ (item.quantity * item.unitCost || 0).toFixed(2) }}
                      </div>
                    </div>
                  </div>
                </div>
                <button class="btn-remove" type="button" @click="removeItem(idx)" title="Remover item">
                  <span>×</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Navigation Buttons -->
        <div class="wizard-footer">
          <div class="wizard-summary" v-if="currentStep === 3">
            <span class="muted">Total da compra</span>
            <strong class="total-value">R$ {{ total.toFixed(2) }}</strong>
          </div>
          <div class="wizard-actions">
            <button v-if="currentStep > 1" class="btn btn-ghost" type="button" @click="previousStep">
              ← Voltar
            </button>
            <button class="btn btn-ghost" type="button" @click="closeForm">
              Cancelar
            </button>
            <button v-if="currentStep < 3" class="btn btn-primary" type="button" @click="nextStep"
              :disabled="!canProceedFromStep1">
              Continuar →
            </button>
            <button v-if="currentStep === 3" class="btn btn-primary" type="submit">
              Salvar compra
            </button>
          </div>
        </div>
      </form>
    </BaseModal>

    <div class="purchases-grid">
      <div class="purchase-card glass" v-for="p in purchases" :key="p._id">
        <div class="purchase-header" @click="openPurchaseDetails(p)">
          <div class="purchase-info">
            <div class="purchase-date">
              <span class="eyebrow">{{ formatDate(p.createdAt) }}</span>
            </div>
            <div class="purchase-supplier">
              <h4>{{ p.supplier?.name }}</h4>
              <span class="muted">{{ p.items?.length || 0 }} {{ p.items?.length === 1 ? 'item' : 'itens' }}</span>
            </div>
          </div>
          <div class="purchase-summary">
            <div class="purchase-total">
              <span class="muted small">Total</span>
              <strong>R$ {{ p.totalAmount.toFixed(2) }}</strong>
            </div>
            <button class="expand-btn" type="button">
              <span>Ver itens</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <BaseModal v-if="selectedPurchase" :open="!!selectedPurchase"
      :title="`Compra de ${selectedPurchase?.supplier?.name || 'Fornecedor'}`" :onClose="closePurchaseDetails">
      <div class="purchase-detail-modal" v-if="selectedPurchase">
        <div class="detail-header">
          <div>
            <div class="eyebrow">Data</div>
            <strong>{{ formatDate(selectedPurchase.createdAt) }}</strong>
          </div>
          <div>
            <div class="eyebrow">Total</div>
            <strong>R$ {{ selectedPurchase.totalAmount?.toFixed(2) }}</strong>
          </div>
          <div>
            <div class="eyebrow">Itens</div>
            <strong>{{ selectedPurchase.items?.length || 0 }}</strong>
          </div>
        </div>

        <div class="detail-items">
          <div class="detail-row detail-head">
            <span>Produto</span>
            <span class="center">Qtde</span>
            <span class="center">Custo</span>
            <span class="right">Total</span>
          </div>
          <div class="detail-row" v-for="(item, idx) in selectedPurchase.items" :key="idx">
            <div class="detail-product">
              <div class="thumb">
                <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.product?.name || 'Produto'"
                  @error="(e) => (e.target as HTMLImageElement).style.display = 'none'" />
                <div v-else class="no-image">🖼️</div>
              </div>
              <div class="detail-product-info">
                <strong>{{ item.product?.name || 'Produto' }}</strong>
                <span class="muted small">EAN: {{ item.product?.barcode || '-' }}</span>
              </div>
            </div>
            <span class="center">{{ item.quantity }}</span>
            <span class="center">R$ {{ item.unitCost?.toFixed(2) }}</span>
            <span class="right primary">R$ {{ (item.quantity * item.unitCost).toFixed(2) }}</span>
          </div>
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import api from '../../services/api';
import BaseModal from '../../components/BaseModal.vue';
import { exportToCsv } from '../../utils/export';
import { fetchMargin } from '../../services/settings';
import { fetchNfce } from '../../services/nfce';
import { fetchCosmosProduct } from '../../services/cosmos';
import jsQR from 'jsqr';

const purchases = ref<any[]>([]);
const products = ref<any[]>([]);
const suppliers = ref<any[]>([]);
const locations = ref<any[]>([]);
const gtinLookups = ref<any[]>([]);
const showForm = ref(false);
const marginPercent = ref<number | null>(null);
const nfceUrl = ref('');
const nfceLoading = ref(false);
const nfceError = ref('');
const nfceLoaded = ref(false);
const selectedPurchase = ref<any | null>(null);
const importMethod = ref<'url' | 'qrcode' | 'manual'>('manual');
const showQRScanner = ref(false);
const videoElement = ref<HTMLVideoElement | null>(null);
const currentStep = ref(1);
let mediaStream: MediaStream | null = null;
let scanInterval: number | null = null;
const today = new Date().toISOString().slice(0, 10);
const form = reactive<any>({
  supplier: '',
  location: '',
  supplierName: '',
  supplierCnpj: '',
  supplierAddress: '',
  issueDate: today,
  arrivalDate: today,
  invoiceNumber: '',
  items: [{ product: '', name: '', barcode: '', quantity: 1, unitCost: 0, salePrice: 0, batchCode: '', expiryDate: '' }]
});

const total = computed(() => form.items.reduce((sum: number, i: any) => sum + i.quantity * i.unitCost, 0));

const canProceedFromStep1 = computed(() => {
  if (currentStep.value !== 1) return true;

  // Se for manual, pode avançar sempre
  if (importMethod.value === 'manual') return true;

  // Se for URL ou QR Code, só pode avançar se a nota foi carregada com sucesso
  return nfceLoaded.value;
});

function getProductImageUrl(productId: string): string | null {
  const product = products.value.find((p: any) => p._id === productId);
  if (!product || !product.barcode) return null;

  const gtinLookup = gtinLookups.value.find((g: any) => g.ean === product.barcode);
  return gtinLookup?.imageUrl || null;
}

function suggestedSalePrice(item: any) {
  const margin = marginPercent.value ?? 0;
  const base = Number(item.unitCost) || 0;
  return base * (1 + margin / 100);
}

function addItem() {
  form.items.push({
    product: '',
    name: '',
    barcode: '',
    quantity: 1,
    unitCost: 0,
    salePrice: 0,
    batchCode: '',
    expiryDate: ''
  });
}
function removeItem(idx: number) {
  form.items.splice(idx, 1);
}

function openPurchaseDetails(purchase: any) {
  selectedPurchase.value = purchase;
}

function closePurchaseDetails() {
  selectedPurchase.value = null;
}

function selectManualMethod() {
  importMethod.value = 'manual';
  stopQRScanner();
}

function nextStep() {
  if (currentStep.value < 3) {
    currentStep.value++;
  }
}

function previousStep() {
  if (currentStep.value > 1) {
    currentStep.value--;
  }
}

async function importFromNfceAndNext() {
  await importFromNfce();
  // Não avança automaticamente - usuário precisa clicar em "Continuar"
}

async function load() {
  const { data } = await api.get('/purchases/with-details');
  purchases.value = data;
}
async function loadProducts() {
  const res = await api.get('/products', { params: { page: 1, limit: 200, active: true } });
  products.value = res.data.data || res.data;
}

async function loadGtinLookups() {
  try {
    const res = await api.get('/cosmos/gtin-lookups');
    gtinLookups.value = res.data || [];
  } catch (error) {
    console.error('Failed to load gtin lookups:', error);
    gtinLookups.value = [];
  }
}

async function loadRefs() {
  const [supRes, locRes] = await Promise.all([api.get('/suppliers'), api.get('/locations')]);
  suppliers.value = supRes.data;
  locations.value = locRes.data;
  if (!form.supplier && suppliers.value.length) form.supplier = suppliers.value[0]._id;
  if (!form.location && locations.value.length) form.location = locations.value[0].code;
  if (form.items.length && !form.items[0].product && products.value.length) form.items[0].product = products.value[0]._id;
}

async function loadMargin() {
  try {
    marginPercent.value = await fetchMargin();
  } catch {
    marginPercent.value = null;
  }
}

async function save() {
  await api.post('/purchases', {
    ...form,
    items: form.items.map((i: any) => ({
      ...i,
      batchCode: i.batchCode || undefined,
      salePrice: typeof i.salePrice === 'number' ? i.salePrice : suggestedSalePrice(i),
      expiryDate: i.expiryDate || null
    })),
    issueDate: form.issueDate || new Date(),
    arrivalDate: form.arrivalDate || new Date()
  });
  await load();
  showForm.value = false;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString();
}

onMounted(() => {
  load();
  loadProducts();
  loadRefs();
  loadMargin();
  loadGtinLookups();
});

function openForm() {
  currentStep.value = 1;
  importMethod.value = 'manual';
  nfceError.value = '';
  nfceLoaded.value = false;
  nfceUrl.value = '';
  Object.assign(form, {
    supplier: suppliers.value[0]?._id || '',
    supplierName: '',
    supplierCnpj: '',
    supplierAddress: '',
    location: locations.value[0]?.code || '',
    issueDate: today,
    arrivalDate: today,
    invoiceNumber: '',
    items: [{
      product: products.value[0]?._id || '',
      name: '',
      barcode: '',
      quantity: 1,
      unitCost: 0,
      salePrice: 0,
      batchCode: '',
      expiryDate: ''
    }]
  });
  showForm.value = true;
}

function closeForm() {
  stopQRScanner();
  showForm.value = false;
  currentStep.value = 1;
}

async function exportPurchases() {
  const { data } = await api.get('/purchases', { params: { limit: 2000, page: 1 } });
  const list = data.data || data;
  const headers = ['Data', 'Fornecedor', 'Local', 'Total (R$)'];
  const rows = list.map((p: any) => [
    formatDate(p.createdAt),
    p.supplier?.name || '-',
    p.location || '-',
    p.totalAmount?.toFixed ? p.totalAmount.toFixed(2) : p.totalAmount
  ]);
  exportToCsv('compras.csv', headers, rows);
}

function parseDateToInput(dateStr: string | null | undefined) {
  if (!dateStr) return '';
  const parsed = new Date(dateStr);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
}

function normalizeDigits(value: string) {
  return (value || '').replace(/\D+/g, '');
}

function findProductIdLocal(barcode: string | null | undefined) {
  const code = (barcode || '').trim();
  if (!code) return '';
  const found = products.value.find((p: any) => p.barcode === code);
  return found?._id || '';
}

async function findOrFetchProductId(barcode: string | null | undefined) {
  const localId = findProductIdLocal(barcode);
  if (localId) return localId;

  const code = (barcode || '').trim();
  if (!code) return '';

  try {
    const { data } = await api.get(`/products/barcode/${code}`);
    const id = data?._id || '';
    if (id && !products.value.find((p: any) => p._id === id)) {
      products.value.unshift(data);
    }
    return id;
  } catch (error) {
    console.warn('[PURCHASES] Produto não encontrado pelo barcode importado', code, error);
    return '';
  }
}

async function ensureSupplierOnFrontend() {
  if (!form.supplierName && !form.supplierCnpj) return;
  const match = suppliers.value.find((s: any) => normalizeDigits(s.cnpj || '') === form.supplierCnpj);
  if (match) {
    form.supplier = match._id;
    return;
  }
  try {
    const { data } = await api.post('/suppliers', {
      name: form.supplierName || form.supplierCnpj || 'Fornecedor',
      cnpj: form.supplierCnpj || undefined,
      address: form.supplierAddress ? { street: form.supplierAddress } : undefined,
      active: true
    });
    suppliers.value.push(data);
    form.supplier = data._id;
  } catch {
    // silencioso; usuário ainda pode selecionar manualmente
  }
}

async function toggleQRScanner() {
  if (importMethod.value === 'qrcode' && showQRScanner.value) {
    stopQRScanner();
  } else {
    importMethod.value = 'qrcode';
    showQRScanner.value = true;
    await startQRScanner();
  }
}

async function startQRScanner() {
  try {
    nfceError.value = '';

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    });

    mediaStream = stream;

    if (videoElement.value) {
      videoElement.value.srcObject = stream;

      // Esperar o vídeo estar pronto
      videoElement.value.onloadedmetadata = () => {
        videoElement.value?.play().then(() => {
          console.log('Camera started successfully');
          // Aguardar um pouco antes de começar a escanear
          setTimeout(() => {
            if (showQRScanner.value) {
              scanQRCode();
            }
          }, 500);
        });
      };
    }
  } catch (err: any) {
    console.error('Camera error:', err);
    if (err.name === 'NotAllowedError') {
      nfceError.value = 'Permissão de câmera negada. Permita o acesso à câmera nas configurações do navegador.';
    } else if (err.name === 'NotFoundError') {
      nfceError.value = 'Nenhuma câmera encontrada no dispositivo.';
    } else {
      nfceError.value = 'Erro ao acessar a câmera. Verifique as permissões.';
    }
    stopQRScanner();
  }
}

function scanQRCode() {
  if (!videoElement.value || !showQRScanner.value) {
    console.log('Scanner stopped or video not ready');
    return;
  }

  // Verificar se o vídeo está pronto
  if (videoElement.value.readyState !== videoElement.value.HAVE_ENOUGH_DATA) {
    scanInterval = window.setTimeout(() => scanQRCode(), 100);
    return;
  }

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    console.error('Could not get canvas context');
    return;
  }

  const width = videoElement.value.videoWidth;
  const height = videoElement.value.videoHeight;

  if (width === 0 || height === 0) {
    scanInterval = window.setTimeout(() => scanQRCode(), 100);
    return;
  }

  canvas.width = width;
  canvas.height = height;

  context.drawImage(videoElement.value, 0, 0, width, height);
  const imageData = context.getImageData(0, 0, width, height);

  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'dontInvert'
  });

  if (code && code.data) {
    console.log('QR Code detected:', code.data);
    nfceUrl.value = code.data;
    stopQRScanner();
    importFromNfceAndNext();
  } else {
    scanInterval = window.setTimeout(() => scanQRCode(), 300);
  }
}

function stopQRScanner() {
  showQRScanner.value = false;

  if (scanInterval) {
    clearTimeout(scanInterval);
    scanInterval = null;
  }

  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }

  if (videoElement.value) {
    videoElement.value.srcObject = null;
  }
}

async function importFromNfce() {
  nfceError.value = '';
  nfceLoaded.value = false;
  if (!nfceUrl.value) {
    nfceError.value = 'Informe a URL da nota';
    return;
  }
  nfceLoading.value = true;
  try {
    const data = await fetchNfce(nfceUrl.value);
    form.issueDate = parseDateToInput(data.info?.emissao) || form.issueDate;
    form.arrivalDate = form.arrivalDate || form.issueDate;
    form.invoiceNumber = data.info?.numero || form.invoiceNumber;
    form.supplierName = data.emitente?.nome || form.supplierName;
    form.supplierCnpj = normalizeDigits(data.emitente?.cnpj || '');
    form.supplierAddress = data.emitente?.endereco || '';
    await ensureSupplierOnFrontend();
    const cosmosResponses = await Promise.all(
      data.itens.map((it: any) =>
        fetchCosmosProduct(it.eanComercial || it.codigo || '', it.descricao || undefined).catch(() => null)
      )
    );

    await loadProducts(); // inclui produtos recém-criados pelo Cosmos
    await loadGtinLookups(); // inclui lookups recém-criados pelo Cosmos

    const mappedItems = await Promise.all(
      data.itens.map(async (it: any, idx: number) => {
        const cosmos = cosmosResponses[idx];
        const barcode = it.eanComercial || it.codigo || '';
        const productId = await findOrFetchProductId(barcode);
        return {
          product: productId,
          name: cosmos?.name || it.descricao || '',
          barcode,
          quantity: it.quantidade || 1,
          unitCost: it.valorUnitario || 0,
          salePrice: Number(suggestedSalePrice({ unitCost: it.valorUnitario || 0 }).toFixed(2)),
          batchCode: '',
          expiryDate: ''
        };
      })
    );
    form.items = mappedItems;
    nfceLoaded.value = true;
  } catch (err: any) {
    nfceError.value = err?.response?.data?.message || err?.message || 'Erro ao importar NF-e/NFC-e';
  } finally {
    nfceLoading.value = false;
  }
}

onUnmounted(() => {
  stopQRScanner();
});
</script>

<style scoped>
.view-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-width: 1400px;
  gap: 8px;
  padding: 6px 8px 0;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.margin-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: rgba(91, 231, 196, 0.12);
  border: 1px solid rgba(91, 231, 196, 0.35);
  border-radius: 999px;
  font-size: 13px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card {
  margin-top: 12px;
  padding: 16px;
  height: 100%;
  border-radius: var(--radius);
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
  align-items: stretch;
}

/* Stepper */
.stepper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: var(--radius);
  border: 1px solid var(--border);
}

.step {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.step-number {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  transition: all 0.3s ease;
}

.step.active .step-number {
  background: linear-gradient(135deg, var(--primary), var(--primary-strong));
  border-color: var(--primary);
  color: #0c1829;
}

.step.completed .step-number {
  background: rgba(91, 231, 196, 0.2);
  border-color: var(--primary);
  color: var(--primary);
}

.step-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.step-title {
  font-weight: 600;
  font-size: 14px;
  transition: color 0.3s ease;
}

.step.active .step-title {
  color: var(--primary);
}

.step-subtitle {
  font-size: 12px;
  color: var(--muted);
}

.step-divider {
  flex: 1;
  height: 2px;
  background: var(--border);
  margin: 0 12px;
  transition: background 0.3s ease;
}

.step-divider.active {
  background: var(--primary);
}

/* Step Content */
.step-content {
  animation: fadeIn 0.3s ease;
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

.step-header {
  margin-bottom: 20px;
}

.step-header h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
}

.step-header p {
  margin: 0;
}

/* Import Methods Wizard */
.import-methods-wizard {
  display: grid;
  gap: 10px;
  margin-bottom: 16px;
}

.import-option {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;
}

.import-option:hover {
  background: rgba(91, 231, 196, 0.05);
  border-color: rgba(91, 231, 196, 0.3);
  transform: translateY(-2px);
}

.import-option.selected {
  background: rgba(91, 231, 196, 0.1);
  border-color: var(--primary);
}

.option-icon {
  font-size: 26px;
  flex-shrink: 0;
}

.option-content {
  flex: 1;
}

.option-content h4 {
  margin: 0 0 6px 0;
  font-size: 16px;
  font-weight: 600;
}

.option-content p {
  margin: 0;
}

.import-detail {
  margin-top: 16px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border);
  border-radius: 10px;
  animation: slideDown 0.3s ease;
}

/* Form Grid */
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.field-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
  
  .field-block.full {
    grid-column: 1 / -1;
  }
  
  .field-block label {
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--muted);
  }
  
  /* Items Wizard */
  .items-wizard {
    max-height: 400px;
    overflow-y: auto;
    padding-right: 8px;
  }
  
  .item-header-wizard {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 16px;
  }
  
  /* Wizard Footer */
  .wizard-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 20px;
    border-top: 2px solid var(--border);
    margin-top: 20px;
  }
  
  .wizard-summary {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .wizard-summary .muted {
    font-size: 13px;
  }
  
  .total-value {
    font-size: 24px;
    color: var(--primary);
    font-weight: 700;
  }
  
  .wizard-actions {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  
  .top-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 12px;
  }
  
  .items {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 10px;
    padding: 16px;
    border-radius: var(--radius);
    max-height: 500px;
    overflow-y: auto;
  }
  
  .item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border);
  }
  
  .item-header h4 {
    margin: 4px 0;
  }
  
.form-items-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-item-card {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border);
  border-radius: 10px;
  position: relative;
  transition: all 0.2s ease;
  }
  
  .form-item-card:hover {
    background: rgba(91, 231, 196, 0.03);
    border-color: rgba(91, 231, 196, 0.3);
  }
  
.form-item-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--primary-strong));
  color: #0c1829;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
  flex-shrink: 0;
}
  
.form-item-image {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border);
  }
  
  .form-item-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
.form-item-image .no-image {
  font-size: 24px;
  opacity: 0.3;
}

.form-item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-item-row {
  display: grid;
  gap: 10px;
  grid-template-columns: 2fr 1fr;
  align-items: end;
}
  
  .form-item-row:last-child {
    grid-template-columns: repeat(5, 1fr);
  }
  
  .field-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  
  .field-group.small {
    max-width: 120px;
  }
  
  .small-label {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--muted);
  }
  
  .input-with-prefix {
    position: relative;
    display: flex;
    align-items: center;
  }
  
  .input-with-prefix .prefix {
    position: absolute;
    left: 12px;
    font-weight: 600;
    color: var(--muted);
    pointer-events: none;
  }
  
  .input-with-prefix input {
    padding-left: 38px;
  }
  
.calculated-value {
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border);
  border-radius: 10px;
  font-weight: 600;
  font-size: 14px;
  }
  
  .calculated-value.primary {
    color: var(--primary);
    background: rgba(91, 231, 196, 0.08);
    border-color: rgba(91, 231, 196, 0.2);
  }
  
.btn-remove {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 20px;
  line-height: 1;
}
  
  .btn-remove:hover {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.5);
    color: #ef4444;
  }
  
  .item-total {
    font-weight: 600;
  }
  
  .summary {
    display: flex;
    flex-direction: column;
    gap: 2px;
    text-align: right;
  }
  
.summary strong {
  font-size: 18px;
}
  
  .footer-bar {
    margin-top: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-top: 8px;
    border-top: 1px solid var(--border);
  }
  
.btn {
  border: none;
  padding: 10px 12px;
  border-radius: 10px;
  font-weight: 500;
}

.btn-suggest {
  margin-top: 6px;
  width: 100%;
  justify-content: center;
}
  
  .nfce-import-section {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    margin-bottom: 20px;
  }
  
  .import-header {
    margin-bottom: 16px;
  }
  
  .import-header h4 {
    margin: 0 0 8px 0;
    font-size: 16px;
    font-weight: 600;
  }
  
  .import-methods {
    display: grid;
    gap: 12px;
  }
  
  .import-method {
    border: 1px solid var(--border);
    border-radius: 10px;
    overflow: hidden;
    transition: all 0.2s ease;
  }
  
  .import-method.active {
    border-color: var(--primary);
    background: rgba(91, 231, 196, 0.05);
  }
  
  .method-toggle {
    width: 100%;
    padding: 14px 16px;
    background: transparent;
    border: none;
    text-align: left;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .method-toggle:hover {
    background: rgba(255, 255, 255, 0.02);
  }
  
  .import-method.active .method-toggle {
    color: var(--primary);
  }
  
  .method-content {
    padding: 0 16px 16px 16px;
    animation: slideDown 0.3s ease;
  }
  
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
  
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .input-row {
    display: flex;
    gap: 10px;
    align-items: center;
  }
  
  .input-row input {
    flex: 1;
  }
  
  .qr-scanner-wrapper {
    display: flex;
    flex-direction: column;
    gap: 16px;
    align-items: center;
  }
  
  .qr-video-container {
    position: relative;
    width: 100%;
    max-width: 500px;
    height: 400px;
    border-radius: 12px;
    overflow: hidden;
    background: #000;
  }
  
  .qr-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .qr-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    background: rgba(0, 0, 0, 0.4);
  }
  
  .qr-frame {
    width: 250px;
    height: 250px;
    border: 4px solid var(--primary);
    border-radius: 16px;
    box-shadow:
      0 0 0 4px rgba(0, 0, 0, 0.5),
      0 0 20px rgba(91, 231, 196, 0.5),
      inset 0 0 20px rgba(91, 231, 196, 0.1);
    animation: pulse 2s infinite;
    position: relative;
  }
  
  .qr-frame::before {
    content: '';
    position: absolute;
    top: -8px;
    left: -8px;
    right: -8px;
    bottom: -8px;
    border: 2px solid var(--primary);
    border-radius: 20px;
    opacity: 0.3;
  }
  
  .qr-frame::after {
    content: '';
    position: absolute;
    width: 40px;
    height: 40px;
    top: -4px;
    left: -4px;
    border-top: 4px solid var(--primary);
    border-left: 4px solid var(--primary);
    border-radius: 16px 0 0 0;
  }
  
  /* Cantos adicionais do scanner */
  .qr-overlay::before,
  .qr-overlay::after {
    content: '';
    position: absolute;
    width: 40px;
    height: 40px;
    border: 4px solid var(--primary);
  }
  
  .qr-overlay::before {
    top: calc(50% - 129px);
    right: calc(50% - 129px);
    border-left: none;
    border-bottom: none;
    border-radius: 0 16px 0 0;
  }
  
  .qr-overlay::after {
    bottom: calc(50% - 129px);
    left: calc(50% - 129px);
    border-right: none;
    border-top: none;
    border-radius: 0 0 0 16px;
  }
  
  /* Canto inferior direito */
  .qr-video-container::after {
    content: '';
    position: absolute;
    width: 40px;
    height: 40px;
    bottom: calc(50% - 129px);
    right: calc(50% - 129px);
    border-right: 4px solid var(--primary);
    border-bottom: 4px solid var(--primary);
    border-radius: 0 0 16px 0;
    z-index: 1;
  }
  
  @keyframes pulse {
  
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }
  
    50% {
      opacity: 0.8;
      transform: scale(0.98);
    }
  }
  
  .qr-instruction {
    text-align: center;
    font-size: 15px;
    font-weight: 600;
    color: var(--text);
    margin: 0;
  }
  
  /* Processing State */
  .processing-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    padding: 32px 24px;
    text-align: center;
  }
  
  .processing-spinner {
    width: 60px;
    height: 60px;
    border: 4px solid rgba(91, 231, 196, 0.2);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  
  .processing-content h4 {
    margin: 0 0 8px 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--primary);
  }
  
  .processing-content p {
    margin: 0;
  }
  
  .alert {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    border-radius: 8px;
    margin-top: 12px;
    font-size: 14px;
  }
  
  .alert.error {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #fca5a5;
  }
  
  .alert.success {
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    color: #86efac;
  }
  
  .alert-icon {
    font-size: 18px;
  }
  
  .small {
    font-size: 13px;
  }
  
  .btn-primary {
    background: linear-gradient(120deg, var(--primary), var(--primary-strong));
    color: #0c1829;
  }
  
  .btn-primary:disabled {
    background: rgba(255, 255, 255, 0.1);
    color: var(--muted);
    cursor: not-allowed;
    opacity: 0.5;
  }
  
  .btn-ghost {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text);
  }
  
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }
  
  @media (max-width: 900px) {
    .top-row {
      grid-template-columns: 1fr;
    }
  
    .form-item-row {
      grid-template-columns: 1fr !important;
    }
  
    .field-group.small {
      max-width: 100%;
    }
  
    .form-item-card {
      flex-direction: column;
    }
  
    .form-item-number {
      align-self: flex-start;
    }
  
    .btn-remove {
      position: static;
      width: 100%;
      margin-top: 8px;
    }
  
    /* Wizard responsive */
    .stepper {
      flex-direction: column;
      gap: 16px;
    }
  
    .step {
      width: 100%;
    }
  
    .step-divider {
      display: none;
    }
  
    .form-grid {
      grid-template-columns: 1fr;
    }
  
    .wizard-footer {
      flex-direction: column;
      gap: 16px;
    }
  
    .wizard-actions {
      width: 100%;
      flex-direction: column;
    }
  
    .wizard-actions button {
      width: 100%;
    }
  
    /* QR Scanner responsive */
    .qr-video-container {
      max-width: 100%;
      height: 300px;
    }
  
    .qr-frame {
      width: 200px;
      height: 200px;
    }
  
    .qr-overlay::before {
      top: calc(50% - 104px);
      right: calc(50% - 104px);
    }
  
    .qr-overlay::after {
      bottom: calc(50% - 104px);
      left: calc(50% - 104px);
    }
  
    .qr-video-container::after {
      bottom: calc(50% - 104px);
      right: calc(50% - 104px);
    }
  }
  
.purchases-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
  margin-top: 12px;
  flex: 1;
  overflow-y: auto;
  padding-right: 6px;
  align-content: start;
  overflow: auto;
}
  
  .purchases-grid::-webkit-scrollbar {
    width: 8px;
  }
  
  .purchases-grid::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.05);
    border-radius: 4px;
  }
  
  .purchases-grid::-webkit-scrollbar-thumb {
    background: rgba(91, 231, 196, 0.3);
    border-radius: 4px;
    transition: background 0.2s ease;
  }
  
  .purchases-grid::-webkit-scrollbar-thumb:hover {
    background: rgba(91, 231, 196, 0.5);
}

.purchase-card {
  padding: 0;
  height: 100%;
    width: 280px;
  border-radius: var(--radius);
  overflow: hidden;
  height: 100%;
  transition: all 0.3s ease;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.purchase-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 24px rgba(91, 231, 196, 0.2);
}

.purchase-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.purchase-header:hover {
  background: rgba(91, 231, 196, 0.05);
}

.purchase-info {
  display: flex;
  flex-direction: column;
  gap: 7px;
  flex: 1;
}

.purchase-date {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.7;
}

.purchase-supplier {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.purchase-supplier h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.purchase-summary {
  display: flex;
  align-items: center;
  gap: 14px;
}

.purchase-total {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.purchase-total strong {
  font-size: 18px;
  color: var(--primary);
}

.expand-btn {
  background: transparent;
  border: 1px solid var(--border);
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
}

.expand-btn:hover {
  background: rgba(91, 231, 196, 0.1);
  border-color: var(--primary);
}

.purchase-items {
  padding: 0 16px 16px 16px;
  display: grid;
  gap: 10px;
  border-top: 1px solid var(--border);
  padding-top: 16px;
  margin-top: -4px;
}

.item-card {
  display: flex;
  gap: 12px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.item-card:hover {
  background: rgba(91, 231, 196, 0.05);
  border-color: rgba(91, 231, 196, 0.3);
}

.item-image {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  border-radius: 6px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-image {
  font-size: 28px;
  opacity: 0.3;
}

.item-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.item-details h5 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.item-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.item-meta .item-total {
  font-weight: 600;
  color: var(--primary);
}

.purchase-detail-modal {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-header {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}

.detail-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 6px;
}

.detail-row {
  display: grid;
  grid-template-columns: 1fr 80px 120px 120px;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
}

.detail-row.detail-head {
  font-weight: 700;
  background: transparent;
}

.detail-product {
  display: flex;
  align-items: center;
  gap: 12px;
}

.thumb {
  width: 42px;
  height: 42px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.04);
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.detail-product-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.center {
  text-align: center;
}

.right {
  text-align: right;
}

.primary {
  color: var(--primary);
}

@media (max-width: 700px) {
  .detail-row {
    grid-template-columns: 1fr;
  }

  .detail-row.detail-head {
    display: none;
  }

  .detail-row span {
    text-align: left;
  }
}

@media (max-width: 768px) {
  .purchase-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .purchase-summary {
    width: 100%;
    justify-content: space-between;
  }

  .item-card {
    flex-direction: column;
  }

  .item-image {
    width: 100%;
    height: 120px;
  }
}
</style>

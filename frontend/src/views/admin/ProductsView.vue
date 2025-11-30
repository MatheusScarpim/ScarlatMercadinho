<template>
  <div class="products-view">
    <div class="header">
      <h3>Produtos</h3>
      <div class="header-actions">
        <input ref="importInput" type="file" accept=".csv" class="hidden-input" @change="handleImport" />
        <button class="btn btn-ghost" @click="exportSample">Baixar modelo CSV</button>
        <button class="btn btn-ghost" @click="triggerImport">Importar Excel</button>
        <button class="btn btn-ghost" @click="exportProducts">Exportar Excel</button>
        <button class="btn btn-primary" @click="openForm">Novo produto</button>
      </div>
    </div>

    <div class="filters glass">
      <input v-model="search" placeholder="Buscar por nome, código ou sku" @input="resetPageAndLoad" />
      <select v-model="filterCategory" @change="resetPageAndLoad">
        <option value="">Todas categorias</option>
        <option v-for="c in categories" :key="c._id" :value="c._id">{{ c.name }}</option>
      </select>
      <select v-model="filterActive" @change="resetPageAndLoad">
        <option value="">Todos</option>
        <option value="true">Ativos</option>
        <option value="false">Inativos</option>
      </select>
      <select v-model="filterLocation" @change="resetPageAndLoad">
        <option value="">Todos os locais</option>
        <option v-for="loc in locations" :key="loc._id" :value="loc.code">
          {{ loc.name }} ({{ loc.code }})
        </option>
      </select>
    </div>

    <div class="products-grid-container">
      <div class="products-grid">
      <div class="product-card glass" v-for="p in products" :key="p._id" :class="{ inactive: !p.active }">
        <div class="product-image">
          <img v-if="getProductImage(p)" :src="getProductImage(p)!" :alt="p.name"
            @error="(e) => (e.target as HTMLImageElement).style.display = 'none'" />
          <div v-else class="no-image">Sem imagem</div>
          <div class="product-status">
            <span :class="p.active ? 'badge active' : 'badge inactive'">
              {{ p.active ? 'Ativo' : 'Inativo' }}
            </span>
          </div>
        </div>
        <div class="product-content">
          <div class="product-header">
            <h4 class="product-name">{{ p.name }}</h4>
            <p class="product-barcode">{{ p.barcode }}</p>
          </div>
          <div class="product-pricing">
            <div class="price-item">
              <span class="price-label">Custo</span>
              <span class="price-value cost">R$ {{ p.costPrice.toFixed(2) || '0.00' }}</span>
            </div>
            <div class="price-item">
              <span class="price-label">Venda</span>
              <span class="price-value sale">R$ {{ p.salePrice.toFixed(2) || '0.00' }}</span>
            </div>
          </div>
          <div class="product-stock">
            <div class="stock-total" :class="{ low: totalStock(p) <= p.minimumStock }">
              <span class="stock-label">Estoque total</span>
              <span class="stock-value">{{ totalStock(p) }}</span>
            </div>
            <div class="stock-locations" v-if="formatLocations(p).length">
              <span v-for="loc in formatLocations(p)" :key="loc.name" class="location-badge">
                {{ loc.name }}: {{ loc.qty }}
              </span>
            </div>
            </div>
            <div class="product-actions">
              <button class="btn btn-ghost" @click="startEdit(p)" title="Editar">
              <svg viewBox="0 0 20 20" fill="none" class="action-icon">
                <path
                  d="M12.586 3.414a2 2 0 0 1 2.828 0l1.172 1.172a2 2 0 0 1 0 2.828l-8.95 8.95-4.293 1.07 1.07-4.293 8.95-8.95Z"
                  stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" />
                <path d="M11 4.999 15 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
              </svg>
              Editar
            </button>
            <button :class="['btn', 'btn-ghost', !p.active ? 'activate' : 'deactivate']" @click="toggleActive(p)"
              :title="p.active ? 'Inativar' : 'Ativar'">
              <svg viewBox="0 0 20 20" fill="none" class="action-icon" v-if="p.active">
                <rect x="4" y="8.5" width="12" height="9" rx="2" stroke="currentColor" stroke-width="1.5" />
                <path d="M7 8V6.5a3 3 0 0 1 6 0V8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
              <svg viewBox="0 0 20 20" fill="none" class="action-icon" v-else>
                <rect x="4" y="8.5" width="12" height="9" rx="2" stroke="currentColor" stroke-width="1.5" />
                <path d="M10 6.5c0-1.38 1.12-2.5 2.5-2.5S15 5.12 15 6.5V8" stroke="currentColor" stroke-width="1.5"
                  stroke-linecap="round" />
                <path d="M5 8V6.5A3.5 3.5 0 0 1 11.6 4" stroke="currentColor" stroke-width="1.5"
                  stroke-linecap="round" />
              </svg>
              {{ p.active ? 'Inativar' : 'Ativar' }}
            </button>
            <button class="btn btn-ghost view-stock" @click="openStockModal(p)" title="Ver estoque por local">
              <svg viewBox="0 0 20 20" fill="none" class="action-icon">
                <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                <circle cx="6" cy="5.5" r="1" fill="currentColor"/>
                <circle cx="10" cy="10" r="1" fill="currentColor"/>
                <circle cx="14" cy="14.5" r="1" fill="currentColor"/>
              </svg>
              Ver estoque
            </button>
          </div>
        </div>
      </div>
    </div>
    </div>

    <div class="pager glass">
      <button class="btn btn-ghost" :disabled="page === 1" @click="prevPage">Anterior</button>
      <span class="page-info">Página {{ page }} de {{ pages }}</span>
      <button class="btn btn-ghost" :disabled="page === pages" @click="nextPage">Próxima</button>
    </div>

    <BaseModal :open="showForm" :title="editingId ? 'Editar produto' : 'Novo produto'" :onClose="closeForm">
      <form @submit.prevent="save" @keydown.enter.prevent class="product-form">
        <div class="form-section">
          <h4 class="section-title">Informações Básicas</h4>
          <div class="form-row">
            <div class="field-group full">
              <label class="field-label">Nome do produto</label>
              <input v-model="form.name" required placeholder="Ex: Arroz Branco 5kg" />
            </div>
          </div>
          <div class="form-row">
            <div class="field-group">
              <label class="field-label">Código de barras / EAN</label>
              <input v-model="form.barcode" required placeholder="789999999999" />
            </div>
            <div class="field-group">
              <label class="field-label">Categoria</label>
              <select v-model="form.category" required>
                <option value="" disabled>Selecione a categoria</option>
                <option v-for="c in categories" :key="c._id" :value="c._id">{{ c.name }}</option>
              </select>
            </div>
          </div>
        </div>

        <div class="form-section">
          <h4 class="section-title">Precificação</h4>
          <div class="form-row">
            <div class="field-group">
              <label class="field-label">Preço de custo</label>
              <div class="input-with-prefix">
                <span class="prefix">R$</span>
                <input v-model.number="form.costPrice" type="number" step="0.01" required placeholder="0,00" />
              </div>
            </div>
            <div class="field-group">
              <label class="field-label">Preço de venda</label>
              <div class="input-with-prefix">
                <span class="prefix">R$</span>
                <input v-model.number="form.salePrice" type="number" step="0.01" required placeholder="0,00" />
              </div>
            </div>
            <div class="field-group">
              <label class="field-label">Margem</label>
              <div class="calculated-value">{{ calculateMargin }}%</div>
            </div>
          </div>
        </div>

        <div class="form-section">
          <h4 class="section-title">Estoque</h4>
          <div class="form-row">
            <div class="field-group">
              <label class="field-label">Estoque mínimo</label>
              <input v-model.number="form.minimumStock" type="number" min="0" placeholder="0" />
            </div>
          </div>
        </div>

        <div class="form-actions">
          <button class="btn btn-ghost" type="button" @click="closeForm">Cancelar</button>
          <button class="btn btn-primary" type="submit">Salvar produto</button>
        </div>
      </form>
    </BaseModal>

    <BaseModal :open="showStockModal" title="Estoque por local" :onClose="closeStockModal">
      <div v-if="selectedProduct" class="stock-modal">
        <header class="stock-modal__header">
          <div>
            <p class="stock-modal__label">Produto</p>
            <h4 class="stock-modal__name">{{ selectedProduct.name }}</h4>
            <p class="stock-modal__barcode">EAN {{ selectedProduct.barcode }}</p>
          </div>
          <div class="stock-modal__summary">
            <span>Total</span>
            <strong>{{ totalStock(selectedProduct) }}</strong>
          </div>
        </header>

        <div class="stock-modal__grid" v-if="stockLocations.length">
          <div class="stock-card" v-for="loc in stockLocations" :key="loc.name">
            <div class="stock-card__header">
              <div>
                <p class="stock-card__label">Local</p>
                <h5 class="stock-card__title">{{ loc.name }}</h5>
              </div>
              <span class="stock-chip">{{ loc.qty }} un.</span>
            </div>
            <div class="stock-card__bar">
              <div class="stock-card__bar-fill" :style="{ width: barWidth(loc.qty) }"></div>
            </div>
            <p class="stock-card__hint">Atualizado via movimentações</p>
          </div>
        </div>

        <div v-else class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" class="empty-icon">
            <path d="M20 7h-4V5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM10 5h4v2h-4V5zm10 15H4V9h16v11z" fill="currentColor" opacity="0.3"/>
            <path d="M9 13h2v2H9zm4 0h2v2h-2z" fill="currentColor" opacity="0.3"/>
          </svg>
          <p>Sem estoque distribuído por local para este produto.</p>
          <p class="hint">Realize uma entrada de estoque para adicionar produtos aos locais.</p>
        </div>

        <div class="transfer-block">
          <div class="transfer-header">
            <svg viewBox="0 0 24 24" fill="none" class="transfer-icon">
              <path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <div>
              <h5>Transferir estoque</h5>
              <p class="transfer-subtitle">Mova produtos entre locais de armazenamento</p>
            </div>
          </div>

          <div class="transfer-steps">
            <div class="transfer-step">
              <div class="step-number">1</div>
              <label class="step-label">
                <span class="label-text">
                  <svg viewBox="0 0 20 20" fill="currentColor" class="label-icon">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                  </svg>
                  Local de origem
                </span>
                <select v-model="transferForm.from" :class="{ filled: transferForm.from }">
                  <option value="" disabled>Selecione o local de origem</option>
                  <option v-for="loc in locations" :key="loc.code" :value="loc.code">{{ loc.name }} ({{ loc.code }})</option>
                </select>
              </label>
            </div>

            <div class="transfer-arrow">
              <svg viewBox="0 0 24 24" fill="none" class="arrow-icon">
                <path d="M5 12h14m0 0l-7-7m7 7l-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>

            <div class="transfer-step">
              <div class="step-number">2</div>
              <label class="step-label">
                <span class="label-text">
                  <svg viewBox="0 0 20 20" fill="currentColor" class="label-icon">
                    <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
                  </svg>
                  Local de destino
                </span>
                <select v-model="transferForm.to" :class="{ filled: transferForm.to }">
                  <option value="" disabled>Selecione o local de destino</option>
                  <option v-for="loc in locations" :key="loc.code" :value="loc.code">{{ loc.name }} ({{ loc.code }})</option>
                </select>
              </label>
            </div>

            <div class="transfer-step">
              <div class="step-number">3</div>
              <label class="step-label">
                <span class="label-text">
                  <svg viewBox="0 0 20 20" fill="currentColor" class="label-icon">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                  </svg>
                  Quantidade
                </span>
                <input type="number" min="1" v-model.number="transferForm.quantity" placeholder="Digite a quantidade" :class="{ filled: transferForm.quantity > 0 }" />
              </label>
            </div>
          </div>

          <div class="transfer-actions">
            <button class="btn btn-ghost btn-reset" @click="resetTransfer" type="button">
              <svg viewBox="0 0 20 20" fill="currentColor" class="btn-icon-small">
                <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/>
              </svg>
              Limpar
            </button>
            <button class="btn btn-primary btn-transfer" @click="submitTransfer" type="button" :disabled="!canTransfer">
              <svg viewBox="0 0 20 20" fill="currentColor" class="btn-icon-small">
                <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z"/>
              </svg>
              Realizar transferência
            </button>
          </div>

          <div v-if="transferError" class="transfer-alert alert-error">
            <svg viewBox="0 0 20 20" fill="currentColor" class="alert-icon">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
            </svg>
            {{ transferError }}
          </div>
          <div v-if="transferSuccess" class="transfer-alert alert-success">
            <svg viewBox="0 0 20 20" fill="currentColor" class="alert-icon">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            {{ transferSuccess }}
          </div>
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../../services/api';
import BaseModal from '../../components/BaseModal.vue';
import { exportToCsv } from '../../utils/export';
import { ref as vueRef } from 'vue';

const route = useRoute();
const router = useRouter();

const products = ref<any[]>([]);
const total = ref(0);
const pages = ref(1);
const page = ref(1);
const categories = ref<any[]>([]);
const units = ref<any[]>([]);
const locations = ref<any[]>([]);
const locationMap = computed<Record<string, any>>(() =>
  locations.value.reduce((acc: Record<string, any>, loc: any) => {
    if (loc?.code) acc[loc.code] = loc;
    return acc;
  }, {})
);
const gtinLookups = ref<any[]>([]);
const stockSummary = ref<Record<string, Array<{ location: string; quantity: number }>>>({});
const search = ref('');
const filterCategory = ref('');
const filterActive = ref('');
const filterLocation = ref('');
const showForm = ref(false);
const editingId = ref<string | null>(null);
const showStockModal = ref(false);
const selectedProduct = ref<any | null>(null);
const transferForm = reactive({ from: '', to: '', quantity: 0 });
const transferError = ref('');
const transferSuccess = ref('');
const form = reactive<any>({
  name: '',
  barcode: '',
  costPrice: 0,
  salePrice: 0,
  category: '',
  unit: '',
  minimumStock: 0,
  isWeighed: false
});
const importInput = vueRef<HTMLInputElement | null>(null);

async function load() {
  const { data } = await api.get('/products', {
    params: {
      search: search.value,
      category: filterCategory.value || undefined,
      active: filterActive.value || undefined,
      location: filterLocation.value || undefined,
      page: page.value,
      limit: 20
    }
  });
  products.value = data.data || data;
  total.value = data.total || products.value.length;
  pages.value = data.pages || 1;
  await loadStockSummary();
}

function resetPageAndLoad() {
  page.value = 1;
  load();
}

async function loadRefs() {
  const [catRes, unitRes, locRes] = await Promise.all([api.get('/categories'), api.get('/units'), api.get('/locations')]);
  categories.value = catRes.data;
  units.value = unitRes.data;
  locations.value = locRes.data;
  if (!form.category && categories.value.length) form.category = categories.value[0]._id;
  if (!form.unit && units.value.length) form.unit = units.value[0]._id;
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

async function loadStockSummary() {
  try {
    const { data } = await api.get('/stock-movements/summary', {
      params: { location: filterLocation.value || undefined }
    });
    const map: Record<string, Array<{ location: string; quantity: number }>> = {};
    (data || []).forEach((row: any) => {
      const productId = row.product;
      if (!productId) return;
      if (!map[productId]) map[productId] = [];
      map[productId].push({ location: row.location || 'default', quantity: Number(row.quantity || 0) });
    });
    stockSummary.value = map;
  } catch (error) {
    console.error('Failed to load stock summary:', error);
    stockSummary.value = {};
  }
}

function getProductImage(product: any): string | null {
  if (!product || !product.barcode) return null;
  const gtinLookup = gtinLookups.value.find((g: any) => g.ean === product.barcode);
  return gtinLookup.imageUrl || null;
}

const calculateMargin = computed(() => {
  if (!form.costPrice || !form.salePrice || form.costPrice === 0) return '0.00';
  const margin = ((form.salePrice - form.costPrice) / form.costPrice) * 100;
  return margin.toFixed(2);
});

async function save() {
  if (editingId.value) {
    await api.put(`/products/${editingId.value}`, form);
  } else {
    await api.post('/products', form);
  }
  await load();
  closeForm();
}

async function toggleActive(product: any) {
  await api.put(`/products/${product._id}`, { active: !product.active });
  await load();
}

onMounted(() => {
  const locQuery = typeof route.query.location === 'string' ? route.query.location : '';
  search.value = typeof route.query.search === 'string' ? route.query.search : '';
  filterLocation.value = locQuery;
  loadRefs();
  load();
  loadGtinLookups();
});

function openForm() {
  showForm.value = true;
  editingId.value = null;
  Object.assign(form, {
    name: '',
    barcode: '',
    costPrice: 0,
    salePrice: 0,
    category: categories.value[0]._id || '',
    unit: units.value[0]._id || '',
    minimumStock: 0,
    isWeighed: false
  });
}
function closeForm() {
  showForm.value = false;
  editingId.value = null;
}

function startEdit(product: any) {
  editingId.value = product._id;
  Object.assign(form, {
    name: product.name,
    barcode: product.barcode,
    costPrice: product.costPrice ?? 0,
    salePrice: product.salePrice ?? 0,
    category: product?.category?._id || product?.category || categories.value[0]?._id || '',
    unit: product?.unit?._id || product?.unit || units.value[0]?._id || '',
    minimumStock: product.minimumStock ?? 0,
    isWeighed: !!product.isWeighed
  });
  showForm.value = true;
}

function openStockModal(product: any) {
  selectedProduct.value = product;
  showStockModal.value = true;
  resetTransfer();
}

function closeStockModal() {
  selectedProduct.value = null;
  showStockModal.value = false;
  resetTransfer();
}

function totalStock(p: any) {
  const summary = stockSummary.value[p._id];
  if (summary && summary.length) {
    return summary.reduce((sum, s) => sum + (s.quantity || 0), 0);
  }
  if (Array.isArray(p.stockByLocation)) {
    return p.stockByLocation.reduce((sum: number, s: any) => sum + (s.quantity || 0), 0);
  }
  return p.stockQuantity;
}

function formatLocations(p: any) {
  const summary = stockSummary.value[p._id];
  if (summary && summary.length) {
    return summary.map((s) => {
      const code = s.location || 'default';
      const loc = locationMap.value[code];
      const displayName = loc ? `${loc.name} (${loc.code})` : code;
      return { name: displayName, code, qty: s.quantity || 0 };
    });
  }
  if (!Array.isArray(p.stockByLocation)) return [];
  return p.stockByLocation.map((s: any) => {
    const code = s.location || 'default';
    const loc = locationMap.value[code];
    const displayName = loc ? `${loc.name} (${loc.code})` : code;
    return { name: displayName, code, qty: s.quantity || 0 };
  });
}

const stockLocations = computed(() => {
  if (!selectedProduct.value) return [];
  return formatLocations(selectedProduct.value);
});

function barWidth(qty: number) {
  const max = Math.max(...stockLocations.value.map((l: any) => l.qty), 1);
  return `${Math.round((qty / max) * 100)}%`;
}

const canTransfer = computed(() => {
  return (
    !!selectedProduct.value &&
    transferForm.from &&
    transferForm.to &&
    transferForm.from !== transferForm.to &&
    transferForm.quantity > 0
  );
});

function resetTransfer() {
  transferForm.from = '';
  transferForm.to = '';
  transferForm.quantity = 0;
  transferError.value = '';
  transferSuccess.value = '';
}

async function submitTransfer() {
  if (!selectedProduct.value) return;
  transferError.value = '';
  transferSuccess.value = '';
  try {
    await api.post('/stock-movements/transfer', {
      productId: selectedProduct.value._id,
      from: transferForm.from,
      to: transferForm.to,
      quantity: transferForm.quantity,
      reason: 'Transferência manual'
    });
    transferSuccess.value = 'Transferência realizada com sucesso.';
    await load();
    // atualiza produto selecionado com dados frescos
    const refreshed = products.value.find((p) => p._id === selectedProduct.value._id);
    if (refreshed) selectedProduct.value = refreshed;
    resetTransfer();
  } catch (err: any) {
    transferError.value = err?.response?.data?.message || err?.message || 'Erro ao transferir estoque';
  }
}

function triggerImport() {
  if (importInput.value)
    importInput.value.click();
}

function parseCsv(content: string) {
  const lines = content.split(/\r\n/).filter((l) => l.trim().length);
  if (!lines.length) return [];
  const delimiter = lines[0].includes(';') ? ';' : ',';
  const [headerLine, ...rows] = lines;
  const headers = headerLine.split(delimiter).map((h) => h.trim().toLowerCase());
  return rows.map((line) => {
    const cols = line.split(delimiter).map((c) => c.trim());
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => (obj[h] = cols[idx]));
    return obj;
  });
}

async function ensureCategoryByName(name: string) {
  const existing = categories.value.find((c: any) => c.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing._id;
  const { data } = await api.post('/categories', { name, active: true });
  categories.value.push(data);
  return data._id;
}



async function handleImport(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  const text = await file.text();
  const entries = parseCsv(text);
  if (!entries.length) {
    alert('Arquivo vazio ou cabeçalho ausente.');
    target.value = '';
    return;
  }

  for (const row of entries) {
    const name = row['nome'] || row['name'];
    if (!name) continue;
    const barcode = row['barcode'] || row['código'] || row['codigo'];
    const salePrice = parseFloat(row['Preço de venda'] || row['preço de venda'] || row['saleprice'] || '0');
    const costPrice = parseFloat(row['Preço de custo'] || row['preço de custo'] || row['costprice'] || '0');
    const categoryName = row['categoria'] || '';
    const minimumStock = parseFloat(row['estoque minimo'] || row['Estoque mínimo'] || row['minimumstock'] || '0');
    const activeRaw = (row['ativo'] || row['status'] || '').toLowerCase();
    const active = activeRaw ? activeRaw === 'ativo' || activeRaw === 'true' || activeRaw === '1' : true;

    let categoryId = form.category;
    if (categoryName) {
      categoryId = await ensureCategoryByName(categoryName);
    }

    const payload = {
      name,
      barcode,
      costPrice: isNaN(costPrice) ? 0 : costPrice,
      salePrice: isNaN(salePrice) ? 0 : salePrice,
      category: categoryId,
      unit: form.unit || units.value[0]?._id || undefined,
      minimumStock: isNaN(minimumStock) ? 0 : minimumStock,
      isWeighed: false,
      active
    };
    await api.post('/products', payload);
  }

  await load();
  target.value = '';
}

async function exportProducts() {
  const { data } = await api.get('/products', {
    params: {
      search: search.value || undefined,
      category: filterCategory.value || undefined,
      active: filterActive.value || undefined,
      location: filterLocation.value || undefined,
      page: page.value,
      limit: 2000
    }
  });
  const list = data.data || data;

  const headers = ['Nome', 'Barcode', 'Preço (R$)', 'Estoque total', 'Locais', 'Status'];
  const rows = list.map((p: any) => {
    const locs = formatLocations(p)
      .map((l: any) => `${l.name}: ${l.qty}`)
      .join(' | ');
    return [
      p.name,
      p.barcode,
      typeof p.salePrice === 'number' ? p.salePrice.toFixed(2) : p.salePrice,
      totalStock(p),
      locs || '-',
      p.active ? 'Ativo' : 'Inativo'
    ];
  });
  exportToCsv('produtos.csv', headers, rows);
}

function exportSample() {
  const headers = ['nome', 'barcode', 'Preço de custo', 'Preço de venda', 'categoria', 'Estoque mínimo', 'ativo'];
  const rows = [
    ['Arroz 5kg', '7899999999999', '10.50', '18.90', 'Mercearia', '5', 'Ativo'],
    ['FeijÃ£o 1kg', '7898888888888', '4.20', '7.90', 'Mercearia', '10', 'Ativo']
  ];
  exportToCsv('modelo-produtos.csv', headers, rows);
}

function nextPage() {
  if (page.value < pages.value) {
    page.value += 1;
    load();
  }
}

function prevPage() {
  if (page.value > 1) {
    page.value -= 1;
    load();
  }
}
</script>

<style scoped>
.products-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: calc(100vh - 120px);
  overflow: hidden;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.filters {
  margin: 12px 0;
  padding: 12px;
  border-radius: var(--radius);
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.filters input,
.filters select {
  min-width: 180px;
}

.hidden-input {
  display: none;
}

/* Products Grid */

.products-grid-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  padding: 0 4px;
  scroll-behavior: smooth;
}

.products-grid-container::-webkit-scrollbar {
  width: 8px;
}

.products-grid-container::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.products-grid-container::-webkit-scrollbar-thumb {
  background: rgba(91, 231, 196, 0.3);
  border-radius: 4px;
  transition: background 0.2s ease;
}

.products-grid-container::-webkit-scrollbar-thumb:hover {
  background: rgba(91, 231, 196, 0.5);
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
  padding: 14px 0;
}

.product-card {
  display: flex;
  flex-direction: column;
  border-radius: var(--radius);
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(91, 231, 196, 0.15);
}

.product-card.inactive {
  opacity: 0.7;
}

.product-image {
  position: relative;
  width: 100%;
  height: 160px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-image {
  font-size: 48px;
  opacity: 0.2;
}

.product-status {
  position: absolute;
  top: 8px;
  right: 8px;
}

.product-content {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

.product-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.product-name {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}

.product-barcode {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
  font-family: 'Courier New', monospace;
}

.product-pricing {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.price-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border);
  border-radius: 6px;
}

.price-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--muted);
  font-weight: 600;
}

.price-value {
  font-size: 14px;
  font-weight: 700;
}

.price-value.cost {
  color: var(--text);
}

.price-value.sale {
  color: var(--primary);
}

.product-stock {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stock-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border);
  border-radius: 6px;
}

.stock-total.low {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
}

.stock-total.low .stock-value {
  color: #ef4444;
}

.stock-label {
  font-size: 11px;
  color: var(--muted);
  font-weight: 600;
}

.stock-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--primary);
}

/* Pager */
.pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  margin-top: 12px;
  border-radius: var(--radius);
  flex-shrink: 0;
}

.page-info {
  font-weight: 600;
  color: var(--text);
}


.stock-locations {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.location-badge {
  padding: 3px 8px;
  background: rgba(91, 231, 196, 0.1);
  border: 1px solid rgba(91, 231, 196, 0.3);
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--primary);
}

.product-actions {
  display: flex;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}

.product-actions .view-stock {
  background: linear-gradient(135deg, rgba(91, 231, 196, 0.12), rgba(91, 231, 196, 0.2));
  border-color: rgba(91, 231, 196, 0.4);
}

.product-actions .btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 10px;
  font-size: 12px;
}

.action-icon {
  width: 14px;
  height: 14px;
}

.btn.deactivate:hover {
  border-color: rgba(239, 68, 68, 0.5);
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.btn.activate:hover {
  border-color: rgba(34, 197, 94, 0.5);
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.badge {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
}

.badge.active {
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #22c55e;
}

.badge.inactive {
  background: rgba(156, 163, 175, 0.15);
  border: 1px solid rgba(156, 163, 175, 0.3);
  color: #9ca3af;
}

.stock-modal {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stock-modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: radial-gradient(circle at 20% 20%, rgba(91, 231, 196, 0.12), transparent 50%),
    rgba(255, 255, 255, 0.02);
}

.stock-modal__label {
  text-transform: uppercase;
  letter-spacing: 0.6px;
  font-size: 11px;
  color: var(--muted);
  margin: 0 0 4px;
}

.stock-modal__name {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.stock-modal__barcode {
  margin: 2px 0 0;
  color: var(--muted);
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.stock-modal__summary {
  text-align: right;
  display: grid;
  gap: 4px;
}

.stock-modal__summary span {
  font-size: 12px;
  color: var(--muted);
}

.stock-modal__summary strong {
  font-size: 24px;
  color: var(--primary);
}

.stock-modal__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

.stock-card {
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s ease;
}

.stock-card:hover {
  transform: translateY(-2px);
}

.stock-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.stock-card__label {
  margin: 0;
  font-size: 11px;
  text-transform: uppercase;
  color: var(--muted);
}

.stock-card__title {
  margin: 2px 0 0;
  font-size: 15px;
}

.stock-chip {
  padding: 6px 10px;
  background: rgba(91, 231, 196, 0.12);
  border: 1px solid rgba(91, 231, 196, 0.3);
  border-radius: 999px;
  font-weight: 700;
  color: var(--primary);
  font-size: 13px;
}

.stock-card__bar {
  margin: 12px 0 6px;
  height: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 999px;
  overflow: hidden;
}

.stock-card__bar-fill {
  height: 100%;
  background: linear-gradient(135deg, var(--primary), var(--primary-strong));
}

.stock-card__hint {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

.empty-state {
  padding: 40px 18px;
  text-align: center;
  color: var(--muted);
  border: 1px dashed var(--border);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.empty-state .empty-icon {
  width: 64px;
  height: 64px;
  color: var(--muted);
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
  font-weight: 600;
}

.empty-state .hint {
  font-size: 13px;
  font-weight: 400;
  opacity: 0.8;
}

.transfer-block {
  margin-top: 20px;
  padding: 20px;
  border: 2px solid rgba(91, 231, 196, 0.2);
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(91, 231, 196, 0.03), rgba(91, 231, 196, 0.01));
  box-shadow: 0 4px 20px rgba(91, 231, 196, 0.08);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.transfer-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-bottom: 16px;
  border-bottom: 2px solid rgba(91, 231, 196, 0.15);
}

.transfer-icon {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  padding: 8px;
  background: linear-gradient(135deg, rgba(91, 231, 196, 0.15), rgba(91, 231, 196, 0.25));
  border-radius: 10px;
  color: var(--primary);
}

.transfer-header h5 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
}

.transfer-subtitle {
  margin: 2px 0 0 0;
  font-size: 13px;
  color: var(--muted);
}

.transfer-steps {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr;
  gap: 12px;
  align-items: center;
}

.transfer-step {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.step-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--primary-strong));
  color: #0c1829;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(91, 231, 196, 0.3);
}

.step-label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.label-text {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.label-icon {
  width: 16px;
  height: 16px;
  color: var(--primary);
}

.step-label select,
.step-label input {
  padding: 12px 14px;
  border: 2px solid var(--border);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  transition: all 0.2s ease;
  font-size: 14px;
}

.step-label select:hover,
.step-label input:hover {
  border-color: rgba(91, 231, 196, 0.3);
}

.step-label select:focus,
.step-label input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(91, 231, 196, 0.1);
  outline: none;
}

.step-label select.filled,
.step-label input.filled {
  border-color: rgba(91, 231, 196, 0.5);
  background: rgba(91, 231, 196, 0.05);
}

.transfer-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
}

.arrow-icon {
  width: 24px;
  height: 24px;
  color: var(--primary);
  opacity: 0.5;
}

.transfer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 16px;
  border-top: 1px solid rgba(91, 231, 196, 0.1);
}

.btn-icon-small {
  width: 18px;
  height: 18px;
}

.btn-reset:hover {
  background: rgba(156, 163, 175, 0.1);
  border-color: rgba(156, 163, 175, 0.3);
}

.btn-transfer {
  position: relative;
  overflow: hidden;
}

.btn-transfer:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(91, 231, 196, 0.3);
}

.btn-transfer:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.transfer-alert {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 14px;
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

.alert-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.alert-error {
  background: rgba(239, 68, 68, 0.1);
  border: 2px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.alert-success {
  background: rgba(34, 197, 94, 0.1);
  border: 2px solid rgba(34, 197, 94, 0.3);
  color: #22c55e;
}

@media (max-width: 1024px) {
  .transfer-steps {
    grid-template-columns: 1fr;
  }

  .transfer-arrow {
    display: none;
  }
}

/* Product Form */
.product-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--primary);
  border-bottom: 2px solid rgba(91, 231, 196, 0.2);
  padding-bottom: 8px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-group.full {
  grid-column: 1 / -1;
}

.field-label {
  font-size: 13px;
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
  padding: 12px;
  background: rgba(91, 231, 196, 0.1);
  border: 1px solid rgba(91, 231, 196, 0.3);
  border-radius: 10px;
  font-weight: 700;
  font-size: 16px;
  color: var(--primary);
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 2px solid var(--border);
}

/* Responsive */
@media (max-width: 768px) {
  .products-view {
    max-height: calc(100vh - 80px);
  }

  .products-grid {
    grid-template-columns: 1fr;
  }

  .filters {
    flex-direction: column;
  }

  .filters input,
  .filters select {
    width: 100%;
    min-width: 100%;
  }

  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>

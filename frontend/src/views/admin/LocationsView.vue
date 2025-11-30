<template>
  <div>
    <div class="header">
      <h3>Locais</h3>
      <div class="header-actions">
        <button class="btn btn-ghost" @click="exportLocations">Exportar Excel</button>
        <button class="btn btn-primary" @click="openForm">Novo local</button>
      </div>
    </div>

    <div class="locations-grid">
      <div class="location-card glass" v-for="loc in locations" :key="loc._id" :class="{ inactive: !loc.active }">
        <div class="location-header">
          <div class="location-icon">
            <svg viewBox="0 0 24 24" fill="none" class="icon">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                    fill="currentColor"/>
            </svg>
          </div>
          <div class="location-title">
            <h4 class="location-name">{{ loc.name }}</h4>
            <div class="location-code">{{ loc.code }}</div>
          </div>
          <span :class="['badge', loc.active ? 'active' : 'inactive']">
            {{ loc.active ? 'Ativo' : 'Inativo' }}
          </span>
        </div>

        <div class="location-description" v-if="loc.description">
          <p>{{ loc.description }}</p>
        </div>

        <div class="location-actions">
          <button class="btn btn-ghost" @click="openStock(loc)">
            <svg viewBox="0 0 20 20" fill="none" class="btn-icon">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"
                    fill="currentColor"/>
            </svg>
            Ver estoque
          </button>
          <button class="btn btn-ghost" @click="startEdit(loc)">
            <svg viewBox="0 0 20 20" fill="none" class="btn-icon">
              <path d="M12.586 3.414a2 2 0 0 1 2.828 0l1.172 1.172a2 2 0 0 1 0 2.828l-8.95 8.95-4.293 1.07 1.07-4.293 8.95-8.95Z"
                    stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" />
              <path d="M11 4.999 15 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
            </svg>
            Editar
          </button>
          <button :class="['btn', 'btn-ghost', !loc.active ? 'activate' : 'deactivate']" @click="toggle(loc)">
            <svg viewBox="0 0 20 20" fill="none" class="btn-icon" v-if="loc.active">
              <rect x="4" y="8.5" width="12" height="9" rx="2" stroke="currentColor" stroke-width="1.5"/>
              <path d="M7 8V6.5a3 3 0 0 1 6 0V8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <svg viewBox="0 0 20 20" fill="none" class="btn-icon" v-else>
              <rect x="4" y="8.5" width="12" height="9" rx="2" stroke="currentColor" stroke-width="1.5"/>
              <path d="M10 6.5c0-1.38 1.12-2.5 2.5-2.5S15 5.12 15 6.5V8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M5 8V6.5A3.5 3.5 0 0 1 11.6 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            {{ loc.active ? 'Inativar' : 'Ativar' }}
          </button>
        </div>
      </div>
    </div>

    <BaseModal :open="showForm" :title="editingId ? 'Editar local' : 'Novo local'" :onClose="closeForm">
      <form @submit.prevent="save" class="form-grid modal-form">
        <label class="span-2">
          Nome
          <input v-model="form.name" required />
        </label>
        <label>
          Código
          <input v-model="form.code" required maxlength="12" @input="form.code = form.code.toUpperCase().trim()" />
        </label>
        <label class="span-2">
          Descrição
          <textarea v-model="form.description" rows="2" placeholder="Opcional"></textarea>
        </label>
        <div class="checkbox-row">
          <input type="checkbox" v-model="form.active" />
          <span>Ativo</span>
        </div>
        <div class="modal-actions span-2">
          <button class="btn btn-ghost" type="button" @click="closeForm">Cancelar</button>
          <button class="btn btn-primary" type="submit">Salvar</button>
        </div>
      </form>
    </BaseModal>

    <BaseModal :open="showStockModal" title="Estoque do local" :onClose="closeStock">
      <div v-if="selectedLocation" class="stock-loc-modal">
        <header class="stock-loc-header">
          <div>
            <p class="stock-loc-label">Local</p>
            <h4 class="stock-loc-name">{{ selectedLocation.name }}</h4>
            <p class="stock-loc-code">{{ selectedLocation.code }}</p>
          </div>
          <div class="stock-loc-summary">
            <div class="stock-loc-badge" :class="selectedLocation.active ? 'active' : 'inactive'">
              {{ selectedLocation.active ? 'Ativo' : 'Inativo' }}
            </div>
            <div v-if="!loadingStock" class="product-count">
              <span class="count-number">{{ locationProducts.length }}</span>
              <span class="count-label">{{ locationProducts.length === 1 ? 'produto' : 'produtos' }}</span>
            </div>
          </div>
        </header>

        <div v-if="loadingStock" class="stock-loc-loading">
          <div class="spinner"></div>
          <p>Carregando estoque do local...</p>
        </div>
        <div v-else-if="locationProducts.length" class="stock-loc-grid">
          <div class="stock-loc-card" v-for="p in locationProducts" :key="p._id">
            <div class="stock-loc-card-header">
              <div>
                <p class="stock-loc-card-label">{{ p.barcode || '—' }}</p>
                <h5 class="stock-loc-card-title">{{ p.name }}</h5>
              </div>
              <span class="stock-loc-chip">{{ p.locationQty }} un.</span>
            </div>
            <div class="stock-loc-bar">
              <div class="stock-loc-bar-fill" :style="{ width: barWidth(p.locationQty) }"></div>
            </div>
            <div class="stock-loc-card-meta">
              <span>Custo: R$ {{ p.costPrice?.toFixed ? p.costPrice.toFixed(2) : p.costPrice }}</span>
              <span>Venda: R$ {{ p.salePrice?.toFixed ? p.salePrice.toFixed(2) : p.salePrice }}</span>
            </div>
          </div>
        </div>
        <div v-else class="stock-loc-empty">
          <svg viewBox="0 0 24 24" fill="none" class="empty-icon">
            <path d="M20 7h-4V5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM10 5h4v2h-4V5zm10 15H4V9h16v11z" fill="currentColor" opacity="0.3"/>
            <path d="M9 13h2v2H9zm4 0h2v2h-2z" fill="currentColor" opacity="0.3"/>
          </svg>
          <p>Nenhum produto com estoque neste local.</p>
          <p class="hint">Transfira produtos para este local ou realize uma entrada de estoque.</p>
        </div>

        <div class="transfer-block">
          <div class="transfer-header">
            <svg viewBox="0 0 24 24" fill="none" class="transfer-icon">
              <path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <div>
              <h5>Transferir estoque</h5>
              <p class="transfer-subtitle">Mova produtos deste local para outro</p>
            </div>
          </div>

          <div class="transfer-steps">
            <div class="transfer-step">
              <div class="step-number">1</div>
              <label class="step-label">
                <span class="label-text">
                  <svg viewBox="0 0 20 20" fill="currentColor" class="label-icon">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                  </svg>
                  Selecionar produto
                </span>
                <select v-model="transferForm.productId" :class="{ filled: transferForm.productId }">
                  <option value="" disabled>Escolha o produto para transferir</option>
                  <option v-for="p in locationProducts" :key="p._id" :value="p._id">
                    {{ p.name }} ({{ p.barcode || '-' }})
                  </option>
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
                  <template v-for="loc in locations" :key="loc.code">
                    <option v-if="loc.code !== selectedLocation?.code" :value="loc.code">
                      {{ loc.name }} ({{ loc.code }})
                    </option>
                  </template>
                </select>
              </label>
            </div>

            <div class="transfer-step">
              <div class="step-number">3</div>
              <label class="step-label">
                <span class="label-text">
                  <svg viewBox="0 0 20 20" fill="currentColor" class="label-icon">
                    <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/>
                  </svg>
                  Quantidade
                </span>
                <input type="number" min="1" v-model.number="transferForm.quantity" placeholder="Digite a quantidade" :class="{ filled: transferForm.quantity > 0 }" />
              </label>
            </div>
          </div>

          <div class="transfer-actions">
            <button class="btn btn-ghost btn-reset" type="button" @click="resetTransfer">
              <svg viewBox="0 0 20 20" fill="currentColor" class="btn-icon-small">
                <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/>
              </svg>
              Limpar
            </button>
            <button class="btn btn-primary btn-transfer" type="button" @click="submitTransfer" :disabled="!canTransfer">
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
import api from '../../services/api';
import BaseModal from '../../components/BaseModal.vue';
import { exportToCsv } from '../../utils/export';

const locations = ref<any[]>([]);
const showForm = ref(false);
const editingId = ref<string | null>(null);
const showStockModal = ref(false);
const selectedLocation = ref<any | null>(null);
const locationProducts = ref<any[]>([]);
const loadingStock = ref(false);
const transferForm = reactive({ to: '', productId: '', quantity: 0 });
const transferError = ref('');
const transferSuccess = ref('');
const stockSummary = ref<Record<string, number>>({});
const form = reactive<any>({
  name: '',
  code: '',
  description: '',
  active: true
});

async function load() {
  const { data } = await api.get('/locations');
  locations.value = data;
}

function openForm() {
  showForm.value = true;
  editingId.value = null;
  Object.assign(form, { name: '', code: '', description: '', active: true });
}

function closeForm() {
  showForm.value = false;
  editingId.value = null;
}

function startEdit(loc: any) {
  editingId.value = loc._id;
  Object.assign(form, {
    name: loc.name,
    code: loc.code,
    description: loc.description || '',
    active: loc.active
  });
  showForm.value = true;
}

async function save() {
  const payload = { ...form, code: form.code.toUpperCase().trim() };
  if (editingId.value) {
    await api.put(`/locations/${editingId.value}`, payload);
  } else {
    await api.post('/locations', payload);
  }
  await load();
  closeForm();
}

async function toggle(loc: any) {
  await api.put(`/locations/${loc._id}`, { active: !loc.active });
  await load();
}

async function openStock(loc: any) {
  selectedLocation.value = loc;
  showStockModal.value = true;
  await loadLocationStock(loc.code);
}

function closeStock() {
  showStockModal.value = false;
  selectedLocation.value = null;
  locationProducts.value = [];
  resetTransfer();
}

onMounted(load);

async function exportLocations() {
  const { data } = await api.get('/locations');
  const headers = ['Nome', 'Código', 'Descrição', 'Status'];
  const rows = data.map((loc: any) => [
    loc.name,
    loc.code,
    loc.description || '-',
    loc.active ? 'Ativo' : 'Inativo'
  ]);
  exportToCsv('locais.csv', headers, rows);
}

async function loadLocationStock(code: string) {
  loadingStock.value = true;
  try {
    // Busca todos os produtos sem filtro de location (a API pode não suportar esse filtro)
    const { data: summary } = await api.get('/stock-movements/summary', { params: { location: code } });
    const qtyMap: Record<string, number> = {};
    (summary || []).forEach((row: any) => {
      if (row.product) qtyMap[row.product] = Number(row.quantity || 0);
    });
    stockSummary.value = qtyMap;

    const { data } = await api.get('/products', { params: { limit: 500, page: 1 } });
    const list = data.data || data;

    locationProducts.value = list
      .map((p: any) => ({ ...p, locationQty: qtyMap[p._id] || 0 }))
      .filter((p: any) => p.locationQty > 0)
      .sort((a: any, b: any) => b.locationQty - a.locationQty);
  } catch (error) {
    console.error('Erro ao carregar estoque do local:', error);
    locationProducts.value = [];
  } finally {
    loadingStock.value = false;
  }
}

const maxQty = computed(() => Math.max(...locationProducts.value.map((p: any) => p.locationQty || 0), 1));
function barWidth(qty: number) {
  return `${Math.round((qty / maxQty.value) * 100)}%`;
}

const canTransfer = computed(() => {
  return (
    !!selectedLocation.value &&
    transferForm.to &&
    transferForm.productId &&
    transferForm.quantity > 0 &&
    transferForm.to !== selectedLocation.value?.code
  );
});

function resetTransfer() {
  transferForm.to = '';
  transferForm.productId = '';
  transferForm.quantity = 0;
  transferError.value = '';
  transferSuccess.value = '';
}

async function submitTransfer() {
  if (!selectedLocation.value || !canTransfer.value) return;
  transferError.value = '';
  transferSuccess.value = '';
  try {
    await api.post('/stock-movements/transfer', {
      productId: transferForm.productId,
      from: selectedLocation.value.code,
      to: transferForm.to,
      quantity: transferForm.quantity,
      reason: 'Transferência manual'
    });
    transferSuccess.value = 'Transferência realizada com sucesso.';
    await loadLocationStock(selectedLocation.value.code);
    resetTransfer();
  } catch (err: any) {
    transferError.value = err?.response?.data?.message || err?.message || 'Erro ao transferir estoque';
  }
}
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* Locations Grid */
.locations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.location-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  border-radius: var(--radius);
  transition: all 0.3s ease;
}

.location-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(91, 231, 196, 0.15);
}

.location-card.inactive {
  opacity: 0.6;
}

.location-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.location-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--primary), var(--primary-strong));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.location-icon .icon {
  width: 24px;
  height: 24px;
  color: #0c1829;
}

.location-title {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.location-name {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
}

.location-code {
  padding: 4px 10px;
  background: rgba(91, 231, 196, 0.1);
  border: 1px solid rgba(91, 231, 196, 0.3);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--primary);
  font-family: 'Courier New', monospace;
  display: inline-block;
  width: fit-content;
}

.badge {
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
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

.location-description {
  padding: 12px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  border: 1px solid var(--border);
}

.location-description p {
  margin: 0;
  font-size: 14px;
  color: var(--muted);
  line-height: 1.5;
}

.location-actions {
  display: flex;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
  flex-wrap: wrap;
}

.location-actions .btn {
  flex: 1;
  min-width: fit-content;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 12px;
  font-size: 13px;
}

.btn-icon {
  width: 16px;
  height: 16px;
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

.stock-loc-modal {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.stock-loc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: radial-gradient(circle at 20% 20%, rgba(91, 231, 196, 0.12), transparent 50%),
    rgba(255, 255, 255, 0.02);
}

.stock-loc-summary {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.product-count {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(91, 231, 196, 0.1);
  border: 1px solid rgba(91, 231, 196, 0.3);
  border-radius: 8px;
}

.product-count .count-number {
  font-size: 20px;
  font-weight: 700;
  color: var(--primary);
}

.product-count .count-label {
  font-size: 12px;
  color: var(--muted);
  font-weight: 600;
}

.stock-loc-label {
  margin: 0 0 4px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  font-size: 11px;
  color: var(--muted);
}

.stock-loc-name {
  margin: 0;
  font-size: 18px;
}

.stock-loc-code {
  margin: 2px 0 0;
  color: var(--muted);
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.stock-loc-badge {
  padding: 6px 10px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 12px;
}

.stock-loc-badge.active {
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #22c55e;
}

.stock-loc-badge.inactive {
  background: rgba(156, 163, 175, 0.15);
  border: 1px solid rgba(156, 163, 175, 0.3);
  color: #9ca3af;
}

.stock-loc-loading {
  padding: 32px 16px;
  text-align: center;
  color: var(--muted);
  border: 1px dashed var(--border);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.stock-loc-loading .spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(91, 231, 196, 0.2);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.stock-loc-loading p {
  margin: 0;
  font-weight: 600;
}

.stock-loc-empty {
  padding: 40px 16px;
  text-align: center;
  color: var(--muted);
  border: 1px dashed var(--border);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.stock-loc-empty .empty-icon {
  width: 64px;
  height: 64px;
  color: var(--muted);
  opacity: 0.5;
}

.stock-loc-empty p {
  margin: 0;
  font-weight: 600;
}

.stock-loc-empty .hint {
  font-size: 13px;
  font-weight: 400;
  opacity: 0.8;
}

.stock-loc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.stock-loc-card {
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stock-loc-card-header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.stock-loc-card-label {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
  font-family: 'Courier New', monospace;
}

.stock-loc-card-title {
  margin: 2px 0 0;
  font-size: 15px;
}

.stock-loc-chip {
  padding: 6px 10px;
  background: rgba(91, 231, 196, 0.12);
  border: 1px solid rgba(91, 231, 196, 0.3);
  border-radius: 999px;
  font-weight: 700;
  color: var(--primary);
  font-size: 13px;
}

.stock-loc-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 999px;
  overflow: hidden;
}

.stock-loc-bar-fill {
  height: 100%;
  background: linear-gradient(135deg, var(--primary), var(--primary-strong));
}

.stock-loc-card-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: var(--muted);
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

/* Form */
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}
.span-2 {
  grid-column: span 2;
}
.modal-form textarea {
  width: 100%;
  resize: vertical;
}
.checkbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* Responsive */
@media (max-width: 1024px) {
  .transfer-steps {
    grid-template-columns: 1fr;
  }

  .transfer-arrow {
    display: none;
  }
}

@media (max-width: 768px) {
  .locations-grid {
    grid-template-columns: 1fr;
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

  .location-actions {
    flex-direction: column;
  }

  .location-actions .btn {
    width: 100%;
  }
}
</style>

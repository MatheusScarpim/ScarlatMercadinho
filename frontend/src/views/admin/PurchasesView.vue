<template>
  <div>
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
        <div class="nfce-import glass">
          <div>
            <p class="eyebrow">Importar NF-e/NFC-e</p>
            <p class="muted small">
              Cole a URL do QR Code para preencher itens e datas automaticamente (mesma lógica da tela NFC-e).
            </p>
            <div class="input-row">
              <input v-model="nfceUrl" type="url" placeholder="https://www.nfce.fazenda...p=..." />
              <button class="btn" type="button" @click="importFromNfce" :disabled="nfceLoading">
                {{ nfceLoading ? 'Importando...' : 'Importar' }}
              </button>
            </div>
            <p v-if="nfceError" class="error">{{ nfceError }}</p>
            <p v-if="nfceLoaded" class="success">Nota carregada, itens preenchidos.</p>
          </div>
        </div>

        <div class="top-row">
          <div class="field-block">
            <label>Fornecedor</label>
            <select v-model="form.supplier" required>
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
            <label>Emissão</label>
            <input type="date" v-model="form.issueDate" required />
          </div>
          <div class="field-block">
            <label>Chegada</label>
            <input type="date" v-model="form.arrivalDate" required />
          </div>
          <div class="field-block">
            <label>Nota / Pedido</label>
            <input v-model="form.invoiceNumber" placeholder="Opcional" />
          </div>
        </div>

        <div class="items glass">
          <div class="item-header">
            <div>
              <p class="eyebrow">Itens da compra</p>
              <h4>Produtos</h4>
              <p class="muted">Preço de venda sugerido = custo + margem</p>
            </div>
            <button class="btn btn-primary" type="button" @click="addItem">+ Adicionar item</button>
          </div>

          <div class="form-items-list">
            <div class="form-item-card" v-for="(item, idx) in form.items" :key="idx">
              <div class="form-item-number">{{ idx + 1 }}</div>
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
                      <input
                        type="number"
                        step="0.01"
                        v-model.number="item.unitCost"
                        min="0"
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                  <div class="field-group">
                    <label class="small-label">Venda c/ margem</label>
                    <div class="calculated-value">R$ {{ salePrice(item).toFixed(2) }}</div>
                  </div>
                  <div class="field-group">
                    <label class="small-label">Vencimento</label>
                    <input type="date" v-model="item.expiryDate" />
                  </div>
                  <div class="field-group">
                    <label class="small-label">Total</label>
                    <div class="calculated-value primary">R$ {{ (item.quantity * item.unitCost || 0).toFixed(2) }}</div>
                  </div>
                </div>
              </div>
              <button class="btn-remove" type="button" @click="removeItem(idx)" title="Remover item">
                <span>×</span>
              </button>
            </div>
          </div>
        </div>

        <div class="footer-bar">
          <div class="summary">
            <span>Total (R$)</span>
            <strong>R$ {{ total.toFixed(2) }}</strong>
          </div>
          <div class="modal-actions">
            <button class="btn btn-ghost" type="button" @click="closeForm">Cancelar</button>
            <button class="btn btn-primary" type="submit">Salvar compra</button>
          </div>
        </div>
      </form>
    </BaseModal>

    <div class="purchases-grid">
      <div class="purchase-card glass" v-for="p in purchases" :key="p._id">
        <div class="purchase-header" @click="toggleExpanded(p._id)">
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
              <span v-if="expandedPurchases.has(p._id)">▼</span>
              <span v-else>▶</span>
            </button>
          </div>
        </div>
        <div class="purchase-items" v-if="expandedPurchases.has(p._id)">
          <div class="item-card" v-for="(item, idx) in p.items" :key="idx">
            <div class="item-image">
              <img
                v-if="item.imageUrl"
                :src="item.imageUrl"
                :alt="item.product?.name || 'Produto'"
                @error="(e) => (e.target as HTMLImageElement).style.display = 'none'"
              />
              <div v-else class="no-image">📦</div>
            </div>
            <div class="item-details">
              <h5>{{ item.product?.name || 'Produto' }}</h5>
              <div class="item-meta">
                <span class="muted">{{ item.quantity }}x R$ {{ item.unitCost?.toFixed(2) }}</span>
                <span class="item-total">R$ {{ (item.quantity * item.unitCost).toFixed(2) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import api from '../../services/api';
import BaseModal from '../../components/BaseModal.vue';
import { exportToCsv } from '../../utils/export';
import { fetchMargin } from '../../services/settings';
import { fetchNfce } from '../../services/nfce';
import { fetchCosmosProduct } from '../../services/cosmos';

const purchases = ref<any[]>([]);
const products = ref<any[]>([]);
const suppliers = ref<any[]>([]);
const locations = ref<any[]>([]);
const showForm = ref(false);
const marginPercent = ref<number | null>(null);
const nfceUrl = ref('');
const nfceLoading = ref(false);
const nfceError = ref('');
const nfceLoaded = ref(false);
const expandedPurchases = ref<Set<string>>(new Set());
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
  items: [{ product: '', name: '', barcode: '', quantity: 1, unitCost: 0, expiryDate: '' }]
});

const total = computed(() => form.items.reduce((sum: number, i: any) => sum + i.quantity * i.unitCost, 0));

function salePrice(item: any) {
  const margin = marginPercent.value ?? 0;
  const base = Number(item.unitCost) || 0;
  return base * (1 + margin / 100);
}

function addItem() {
  form.items.push({ product: '', name: '', barcode: '', quantity: 1, unitCost: 0, expiryDate: '' });
}
function removeItem(idx: number) {
  form.items.splice(idx, 1);
}

function toggleExpanded(purchaseId: string) {
  if (expandedPurchases.value.has(purchaseId)) {
    expandedPurchases.value.delete(purchaseId);
  } else {
    expandedPurchases.value.add(purchaseId);
  }
  expandedPurchases.value = new Set(expandedPurchases.value);
}

async function load() {
  const { data } = await api.get('/purchases/with-details');
  purchases.value = data;
}
async function loadProducts() {
  const res = await api.get('/products', { params: { page: 1, limit: 200, active: true } });
  products.value = res.data.data || res.data;
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
});

function openForm() {
  Object.assign(form, {
    supplier: suppliers.value[0]?._id || '',
    supplierName: '',
    supplierCnpj: '',
    supplierAddress: '',
    location: locations.value[0]?.code || '',
    issueDate: today,
    arrivalDate: today,
    invoiceNumber: '',
    items: [{ product: products.value[0]?._id || '', name: '', barcode: '', quantity: 1, unitCost: 0, expiryDate: '' }]
  });
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
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

    form.items = data.itens.map((it: any, idx: number) => {
      const cosmos = cosmosResponses[idx];
      const barcode = it.eanComercial || it.codigo || '';
      const productId = findProductIdLocal(barcode);
      return {
        product: productId,
        name: cosmos?.name || it.descricao || '',
        barcode,
        quantity: it.quantidade || 1,
        unitCost: it.valorUnitario || 0,
        expiryDate: ''
      };
    });
    nfceLoaded.value = true;
  } catch (err: any) {
    nfceError.value = err?.response?.data?.message || err?.message || 'Erro ao importar NF-e/NFC-e';
  } finally {
    nfceLoading.value = false;
  }
}
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  border-radius: var(--radius);
}
.modal-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: stretch;
}
.top-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}
.items {
  display: grid;
  gap: 10px;
  margin-top: 10px;
  padding: 10px;
  border-radius: var(--radius);
  max-height: 360px;
  overflow-y: auto;
}
.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.item-row {
  display: grid;
  gap: 8px;
  grid-template-columns: 2fr repeat(3, 1fr) 120px 60px;
  align-items: center;
}
.item-row.head {
  font-weight: 600;
  color: var(--muted);
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
  font-size: 20px;
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
.nfce-import {
  padding: 12px;
  border-radius: var(--radius);
  border: 1px dashed var(--border);
}
.small {
  font-size: 13px;
}
.success {
  color: #16a34a;
  margin-top: 6px;
}
.btn-primary {
  background: linear-gradient(120deg, var(--primary), var(--primary-strong));
  color: #0c1829;
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
  .item-row {
    grid-template-columns: 1fr;
  }
}

.purchases-grid {
  display: grid;
  gap: 16px;
  margin-top: 16px;
}

.purchase-card {
  padding: 0;
  border-radius: var(--radius);
  overflow: hidden;
  transition: transform 0.2s ease;
}

.purchase-card:hover {
  transform: translateY(-2px);
}

.purchase-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.purchase-header:hover {
  background: rgba(91, 231, 196, 0.05);
}

.purchase-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  font-size: 18px;
  font-weight: 600;
}

.purchase-summary {
  display: flex;
  align-items: center;
  gap: 20px;
}

.purchase-total {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.purchase-total strong {
  font-size: 20px;
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
  padding: 0 20px 20px 20px;
  display: grid;
  gap: 12px;
  border-top: 1px solid var(--border);
  padding-top: 16px;
  margin-top: -4px;
}

.item-card {
  display: flex;
  gap: 16px;
  padding: 12px;
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
  width: 64px;
  height: 64px;
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

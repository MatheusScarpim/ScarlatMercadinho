<template>
  <div>
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
      <input v-model="search" placeholder="Buscar por nome, código ou sku" @input="load" />
      <select v-model="filterCategory" @change="load">
        <option value="">Todas categorias</option>
        <option v-for="c in categories" :key="c._id" :value="c._id">{{ c.name }}</option>
      </select>
      <select v-model="filterActive" @change="load">
        <option value="">Todos</option>
        <option value="true">Ativos</option>
        <option value="false">Inativos</option>
      </select>
      <select v-model="filterLocation" @change="load">
        <option value="">Todos os locais</option>
        <option v-for="loc in locations" :key="loc._id" :value="loc.code">
          {{ loc.name }} ({{ loc.code }})
        </option>
      </select>
    </div>

    <div class="card glass table-card">
      <table class="products-table">
        <colgroup>
          <col style="width: 18%" />
          <col style="width: 14%" />
          <col style="width: 12%" />
          <col style="width: 12%" />
          <col style="width: 18%" />
          <col style="width: 12%" />
        </colgroup>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Barcode</th>
            <th>Preço (R$)</th>
            <th>Estoque total</th>
            <th>Locais</th>
            <th class="status-col">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in products" :key="p._id">
            <td>{{ p.name }}</td>
            <td>{{ p.barcode }}</td>
            <td>R$ {{ p.salePrice.toFixed(2) }}</td>
            <td>{{ totalStock(p) }}</td>
            <td>
              <div class="loc-chips">
                <span v-for="loc in formatLocations(p)" :key="loc.name" class="badge location">
                  {{ loc.name }}: {{ loc.qty }}
                </span>
              </div>
            </td>
            <td class="status-cell status-col">
              <span :class="p.active ? 'badge active' : 'badge inactive'">{{ p.active ? 'Ativo' : 'Inativo' }}</span>
            </td>
            <td class="actions-cell actions-col">
              <button class="btn btn-ghost icon-btn" @click="startEdit(p)" aria-label="Editar" title="Editar">
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="M12.586 3.414a2 2 0 0 1 2.828 0l1.172 1.172a2 2 0 0 1 0 2.828l-8.95 8.95-4.293 1.07 1.07-4.293 8.95-8.95Z"
                    stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" />
                  <path d="M11 4.999 15 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
                </svg>
              </button>
              <button :class="['btn', 'btn-ghost', 'icon-btn', !p.active ? 'alert' : '']" @click="toggleActive(p)"
                :aria-label="p.active ? 'Inativar' : 'Ativar'" :title="p.active ? 'Inativar' : 'Ativar'">
                <svg v-if="p.active" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <rect x="4" y="8.5" width="12" height="9" rx="2" stroke="currentColor" stroke-width="1.5" />
                  <path d="M7 8V6.5a3 3 0 0 1 6 0V8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                </svg>
                <svg v-else viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <rect x="4" y="8.5" width="12" height="9" rx="2" stroke="currentColor" stroke-width="1.5" />
                  <path d="M10 6.5c0-1.38 1.12-2.5 2.5-2.5S15 5.12 15 6.5V8" stroke="currentColor" stroke-width="1.5"
                    stroke-linecap="round" />
                  <path d="M5 8V6.5A3.5 3.5 0 0 1 11.6 4" stroke="currentColor" stroke-width="1.5"
                    stroke-linecap="round" />
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <BaseModal :open="showForm" :title="editingId ? 'Editar produto' : 'Novo produto'" :onClose="closeForm">
      <form @submit.prevent="save" @keydown.enter.prevent class="form-grid modal-form">
        <label class="span-2">Nome<input v-model="form.name" required /></label>
        <label class="span-2">Código de barras<input v-model="form.barcode" required /></label>
        <label>Preço de custo (R$)<input v-model.number="form.costPrice" type="number" step="0.01" required /></label>
        <label>Preço de venda (R$)<input v-model.number="form.salePrice" type="number" step="0.01" required /></label>
        <label>Categoria
          <select v-model="form.category" required>
            <option v-for="c in categories" :key="c._id" :value="c._id">{{ c.name }}</option>
          </select>
        </label>
        <label>Estoque mínimo<input v-model.number="form.minimumStock" type="number" /></label>
        <div class="modal-actions span-2">
          <button class="btn btn-ghost" type="button" @click="closeForm">Cancelar</button>
          <button class="btn btn-primary" type="submit">Salvar</button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
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
const categories = ref<any[]>([]);
const units = ref<any[]>([]);
const locations = ref<any[]>([]);
const search = ref('');
const filterCategory = ref('');
const filterActive = ref('');
const filterLocation = ref('');
const showForm = ref(false);
const editingId = ref<string | null>(null);
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
      page: 1,
      limit: 20
    }
  });
  products.value = data.data || data;
  total.value = data.total || products.value.length;
  pages.value = data.pages || 1;
}

async function loadRefs() {
  const [catRes, unitRes, locRes] = await Promise.all([api.get('/categories'), api.get('/units'), api.get('/locations')]);
  categories.value = catRes.data;
  units.value = unitRes.data;
  locations.value = locRes.data;
  if (!form.category && categories.value.length) form.category = categories.value[0]._id;
  if (!form.unit && units.value.length) form.unit = units.value[0]._id;
}

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
  filterLocation.value = locQuery;
  loadRefs();
  load();
});

function openForm() {
  showForm.value = true;
  editingId.value = null;
  Object.assign(form, {
    name: '',
    barcode: '',
    costPrice: 0,
    salePrice: 0,
    category: categories.value[0]?._id || '',
    unit: units.value[0]?._id || '',
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
    costPrice: product.costPrice,
    salePrice: product.salePrice,
    category: product.category?._id || product.category,
    unit: product.unit?._id || product.unit,
    minimumStock: product.minimumStock,
    isWeighed: product.isWeighed
  });
  showForm.value = true;
}

function totalStock(p: any) {
  if (Array.isArray(p.stockByLocation)) {
    return p.stockByLocation.reduce((sum: number, s: any) => sum + (s.quantity || 0), 0);
  }
  return p.stockQuantity;
}

function formatLocations(p: any) {
  if (!Array.isArray(p.stockByLocation)) return [];
  return p.stockByLocation.map((s: any) => ({ name: s.location || 'default', qty: s.quantity || 0 }));
}

function triggerImport() {
  importInput.value?.click();
}

function parseCsv(content: string) {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length);
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
    const salePrice = parseFloat(row['preço de venda'] || row['preco de venda'] || row['saleprice'] || '0');
    const costPrice = parseFloat(row['preço de custo'] || row['preco de custo'] || row['costprice'] || '0');
    const categoryName = row['categoria'] || '';
    const minimumStock = parseFloat(row['estoque minimo'] || row['estoque mínimo'] || row['minimumstock'] || '0');
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
      page: 1,
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
      p.salePrice?.toFixed ? p.salePrice.toFixed(2) : p.salePrice,
      totalStock(p),
      locs || '-',
      p.active ? 'Ativo' : 'Inativo'
    ];
  });
  exportToCsv('produtos.csv', headers, rows);
}

function exportSample() {
  const headers = ['nome', 'barcode', 'preço de custo', 'preço de venda', 'categoria', 'estoque mínimo', 'ativo'];
  const rows = [
    ['Arroz 5kg', '7899999999999', '10.50', '18.90', 'Mercearia', '5', 'Ativo'],
    ['Feijão 1kg', '7898888888888', '4.20', '7.90', 'Mercearia', '10', 'Ativo']
  ];
  exportToCsv('modelo-produtos.csv', headers, rows);
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

.filters {
  margin: 12px 0;
  padding: 12px;
  border-radius: var(--radius);
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.modal-form {
  gap: 14px;
}

.span-2 {
  grid-column: span 2;
}

.form-grid input,
.form-grid select {
  width: 100%;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.modal-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.hidden-input {
  display: none;
}
.products-table {
  table-layout: fixed;
}

.products-table th,
.products-table td {
  vertical-align: middle;
}

.status-cell {
  display: flex;
  align-items: center;
  justify-content: center;
}

.actions-cell {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.status-col {
  text-align: center;
  width: 120px;
}

.actions-col {
  text-align: center;
  width: 140px;
}

th.status-col {
  text-align: center;
}

th.actions-col {
  text-align: center;
}

.actions-cell .btn {
  padding: 8px 10px;
  border-radius: 8px;
}

.icon-btn {
  width: 40px;
  height: 36px;
  padding: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.icon-btn svg {
  width: 16px;
  height: 16px;
}
.btn-ghost.alert {
  border-color: #ef4444;
  color: #ef4444;
}
.badge {
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 12px;
}
.loc-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.badge.location {
  background: #eef7f5;
  color: var(--text);
}
.filters input,
.filters select {
  min-width: 180px;
}
.badge.active {
  background: rgba(16, 180, 157, 0.15);
  color: var(--primary);
}
.badge.inactive {
  background: #e5e7eb;
  color: #6b7280;
}
</style>

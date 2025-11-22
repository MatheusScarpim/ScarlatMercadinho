<template>
  <div>
    <div class="header">
      <h3>Produtos</h3>
      <button class="btn btn-primary" @click="openForm">Novo produto</button>
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
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Barcode</th>
            <th>Preço</th>
            <th>Estoque (local)</th>
            <th>Estoque total</th>
            <th>Locais</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in products" :key="p._id">
            <td>{{ p.name }}</td>
            <td>{{ p.barcode }}</td>
            <td>R$ {{ p.salePrice.toFixed(2) }}</td>
            <td>{{ p.stockQuantity }}</td>
            <td>{{ totalStock(p) }}</td>
            <td>
              <div class="loc-chips">
                <span v-for="loc in formatLocations(p)" :key="loc.name" class="badge location">
                  {{ loc.name }}: {{ loc.qty }}
                </span>
              </div>
            </td>
            <td class="actions-cell">
              <span :class="p.active ? 'badge active' : 'badge inactive'">{{ p.active ? 'Ativo' : 'Inativo' }}</span>
            </td>
            <td class="actions-cell">
              <button class="btn btn-ghost" @click="startEdit(p)">Editar</button>
              <button :class="['btn', 'btn-ghost', !p.active ? 'alert' : '']" @click="toggleActive(p)">
                {{ p.active ? 'Inativar' : 'Ativar' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <BaseModal :open="showForm" :title="editingId ? 'Editar produto' : 'Novo produto'" :onClose="closeForm">
      <form @submit.prevent="save" class="form-grid modal-form">
        <label class="span-2">Nome<input v-model="form.name" required /></label>
        <label class="span-2">Código de barras<input v-model="form.barcode" required /></label>
        <label>Preço de custo<input v-model.number="form.costPrice" type="number" step="0.01" required /></label>
        <label>Preço de venda<input v-model.number="form.salePrice" type="number" step="0.01" required /></label>
        <label>Categoria
          <select v-model="form.category" required>
            <option v-for="c in categories" :key="c._id" :value="c._id">{{ c.name }}</option>
          </select>
        </label>
        <label>Unidade
          <select v-model="form.unit" required>
            <option v-for="u in units" :key="u._id" :value="u._id">{{ u.abbreviation }}</option>
          </select>
        </label>
        <label>Estoque mínimo<input v-model.number="form.minimumStock" type="number" /></label>
        <label class="checkbox-row span-2">
          <input type="checkbox" v-model="form.isWeighed" />
          <span>Pesável?</span>
        </label>
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
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
.actions-cell {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.actions-cell .btn {
  padding: 8px 10px;
  border-radius: 8px;
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

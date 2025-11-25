<template>
  <div>
    <div class="header">
      <h3>Compras / Entradas</h3>
      <div class="header-actions">
        <button class="btn btn-ghost" @click="exportPurchases">Exportar Excel</button>
        <button class="btn btn-primary" @click="openForm">Nova compra</button>
      </div>
    </div>

    <BaseModal :open="showForm" title="Nova compra" :onClose="closeForm">
      <form @submit.prevent="save" class="modal-form">
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
            </div>
            <button class="btn btn-ghost" type="button" @click="addItem">+ Adicionar item</button>
          </div>
          <div class="item-row head">
            <div>Produto</div>
            <div>Qtd</div>
            <div>Custo unit. (R$)</div>
            <div>Total (R$)</div>
            <div></div>
          </div>
          <div class="item-row" v-for="(item, idx) in form.items" :key="idx">
            <select v-model="item.product" required>
              <option value="" disabled>Selecione</option>
              <option v-for="p in products" :key="p._id" :value="p._id">{{ p.name }}</option>
            </select>
            <input type="number" v-model.number="item.quantity" min="1" placeholder="Qtde" />
            <input
              type="number"
              step="0.01"
              v-model.number="item.unitCost"
              min="0"
              placeholder="Custo unit. (R$)"
            />
            <div class="item-total">R$ {{ (item.quantity * item.unitCost || 0).toFixed(2) }}</div>
            <button class="btn btn-ghost" type="button" @click="removeItem(idx)">x</button>
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

    <div class="card glass table-card">
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Fornecedor</th>
            <th>Total (R$)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in purchases" :key="p._id">
            <td>{{ formatDate(p.createdAt) }}</td>
            <td>{{ p.supplier?.name }}</td>
            <td>R$ {{ p.totalAmount.toFixed(2) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import api from '../../services/api';
import BaseModal from '../../components/BaseModal.vue';
import { exportToCsv } from '../../utils/export';

const purchases = ref<any[]>([]);
const products = ref<any[]>([]);
const suppliers = ref<any[]>([]);
const locations = ref<any[]>([]);
const showForm = ref(false);
const today = new Date().toISOString().slice(0, 10);
const form = reactive<any>({
  supplier: '',
  location: '',
  issueDate: today,
  arrivalDate: today,
  invoiceNumber: '',
  items: [{ product: '', quantity: 1, unitCost: 0 }]
});

const total = computed(() => form.items.reduce((sum: number, i: any) => sum + i.quantity * i.unitCost, 0));

function addItem() {
  form.items.push({ product: '', quantity: 1, unitCost: 0 });
}
function removeItem(idx: number) {
  form.items.splice(idx, 1);
}

async function load() {
  const { data } = await api.get('/purchases');
  purchases.value = data;
}
async function loadRefs() {
  const [prodRes, supRes, locRes] = await Promise.all([
    api.get('/products', { params: { page: 1, limit: 200, active: true } }),
    api.get('/suppliers'),
    api.get('/locations')
  ]);
  products.value = prodRes.data.data || prodRes.data;
  suppliers.value = supRes.data;
  locations.value = locRes.data;
  if (!form.supplier && suppliers.value.length) form.supplier = suppliers.value[0]._id;
  if (!form.location && locations.value.length) form.location = locations.value[0].code;
  if (form.items.length && !form.items[0].product && products.value.length) form.items[0].product = products.value[0]._id;
}

async function save() {
  await api.post('/purchases', {
    ...form,
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
  loadRefs();
});

function openForm() {
  Object.assign(form, {
    supplier: suppliers.value[0]?._id || '',
    location: locations.value[0]?.code || '',
    issueDate: today,
    arrivalDate: today,
    invoiceNumber: '',
    items: [{ product: products.value[0]?._id || '', quantity: 1, unitCost: 0 }]
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
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  grid-template-columns: 2fr repeat(2, 1fr) 120px 60px;
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
</style>

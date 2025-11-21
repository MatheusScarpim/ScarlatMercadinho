<template>
  <div>
    <div class="header">
      <h3>Compras / Entradas</h3>
      <button class="btn btn-primary" @click="showForm = true">Nova compra</button>
    </div>

    <BaseModal :open="showForm" title="Nova compra" :onClose="() => (showForm = false)">
      <form @submit.prevent="save" class="modal-form">
        <div class="form-grid">
          <label>Fornecedor
            <select v-model="form.supplier" required>
              <option v-for="s in suppliers" :key="s._id" :value="s._id">{{ s.name }}</option>
            </select>
          </label>
          <label>Emissão<input type="date" v-model="form.issueDate" required /></label>
          <label>Chegada<input type="date" v-model="form.arrivalDate" required /></label>
          <label>Nota / Pedido<input v-model="form.invoiceNumber" placeholder="Opcional" /></label>
        </div>

        <div class="items glass">
          <div class="item-header">
            <span>Itens da compra</span>
            <button class="btn btn-ghost" type="button" @click="addItem">+ Adicionar item</button>
          </div>
          <div class="item-row head">
            <div>Produto</div>
            <div>Qtd</div>
            <div>Custo unit.</div>
            <div>Total</div>
            <div></div>
          </div>
          <div class="item-row" v-for="(item, idx) in form.items" :key="idx">
            <select v-model="item.product" required>
              <option value="" disabled>Selecione</option>
              <option v-for="p in products" :key="p._id" :value="p._id">{{ p.name }}</option>
            </select>
            <input type="number" v-model.number="item.quantity" min="1" placeholder="Qtde" />
            <input type="number" step="0.01" v-model.number="item.unitCost" min="0" placeholder="Custo unit." />
            <div class="item-total">R$ {{ (item.quantity * item.unitCost || 0).toFixed(2) }}</div>
            <button class="btn btn-ghost" type="button" @click="removeItem(idx)">x</button>
          </div>
        </div>

        <div class="summary">
          <span>Total:</span>
          <strong>R$ {{ total.toFixed(2) }}</strong>
        </div>

        <div class="modal-actions">
          <button class="btn btn-ghost" type="button" @click="showForm = false">Cancelar</button>
          <button class="btn btn-primary" type="submit">Salvar compra</button>
        </div>
      </form>
    </BaseModal>

    <div class="card glass table-card">
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Fornecedor</th>
            <th>Total</th>
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

const purchases = ref<any[]>([]);
const products = ref<any[]>([]);
const suppliers = ref<any[]>([]);
const showForm = ref(false);
const form = reactive<any>({
  supplier: '',
  issueDate: '',
  arrivalDate: '',
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
  const [prodRes, supRes] = await Promise.all([api.get('/products'), api.get('/suppliers')]);
  products.value = prodRes.data;
  suppliers.value = supRes.data;
  if (!form.supplier && suppliers.value.length) form.supplier = suppliers.value[0]._id;
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
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card {
  margin-top: 12px;
  padding: 16px;
  border-radius: var(--radius);
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
}
.modal-form {
  gap: 14px;
}
.items {
  display: grid;
  gap: 10px;
  margin-top: 10px;
  padding: 10px;
  border-radius: var(--radius);
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
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
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
</style>

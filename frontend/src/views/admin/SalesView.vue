<template>
  <div>
    <div class="sales-header">
      <h3>Vendas</h3>
      <button class="btn btn-ghost" @click="exportSales">Exportar Excel</button>
    </div>
    <div class="filters glass">
      <input type="date" v-model="from" />
      <input type="date" v-model="to" />
      <select v-model="filterLocation" @change="load">
        <option value="">Todos os locais</option>
        <option v-for="loc in locations" :key="loc._id" :value="loc.code">
          {{ loc.name }} ({{ loc.code }})
        </option>
      </select>
      <button class="btn btn-primary" @click="load">Filtrar</button>
    </div>
    <div class="card glass table-card">
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Origem</th>
            <th>Local</th>
            <th>Pagamento</th>
            <th>Status</th>
            <th>Total (R$)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in sales" :key="s._id">
            <td>{{ formatDate(s.createdAt) }}</td>
            <td>{{ originLabel(s.origin) }}</td>
            <td>{{ locationLabel(s.location) }}</td>
            <td>{{ paymentLabel(s.paymentMethod) }}</td>
            <td>{{ statusLabel(s.status) }}</td>
            <td>R$ {{ s.totalAmount?.toFixed(2) }}</td>
          </tr>
        </tbody>
      </table>
      <div class="pager">
        <button class="btn btn-ghost" :disabled="page === 1" @click="prevPage">Anterior</button>
        <span>Página {{ page }} de {{ pages }}</span>
        <button class="btn btn-ghost" :disabled="page === pages" @click="nextPage">Próxima</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import api from '../../services/api';
import { exportToCsv } from '../../utils/export';

const sales = ref<any[]>([]);
const total = ref(0);
const pages = ref(1);
const page = ref(1);
const from = ref('');
const to = ref('');
const locations = ref<any[]>([]);
const filterLocation = ref('');

async function load() {
  const { data } = await api.get('/sales', {
    params: {
      from: from.value || undefined,
      to: to.value || undefined,
      location: filterLocation.value || undefined,
      page: page.value,
      limit: 20
    }
  });
  sales.value = data.data || data;
  total.value = data.total || sales.value.length;
  pages.value = data.pages || 1;
}
async function loadRefs() {
  const { data } = await api.get('/locations');
  locations.value = data;
}
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString();
}
function originLabel(orig: string) {
  return orig === 'KIOSK' ? 'Quiosque' : orig === 'ADMIN_PANEL' ? 'Painel' : orig;
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
function statusLabel(status: string) {
  const map: Record<string, string> = {
    COMPLETED: 'Concluída',
    OPEN: 'Aberta',
    CANCELED: 'Cancelada'
  };
  return map[status] || status;
}
function locationLabel(code: string) {
  const loc = locations.value.find((l: any) => l.code === code);
  return loc ? `${loc.name} (${loc.code})` : code || 'default';
}

async function exportSales() {
  const { data } = await api.get('/sales', {
    params: {
      from: from.value || undefined,
      to: to.value || undefined,
      location: filterLocation.value || undefined,
      page: 1,
      limit: 2000
    }
  });
  const list = data.data || data;
  const headers = ['Data', 'Origem', 'Local', 'Pagamento', 'Status', 'Total (R$)'];
  const rows = list.map((s: any) => [
    formatDate(s.createdAt),
    originLabel(s.origin),
    locationLabel(s.location),
    paymentLabel(s.paymentMethod),
    statusLabel(s.status),
    s.totalAmount?.toFixed ? s.totalAmount.toFixed(2) : s.totalAmount
  ]);
  exportToCsv('vendas.csv', headers, rows);
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

onMounted(load);
onMounted(loadRefs);
</script>

<style scoped>
.filters {
  display: flex;
  gap: 10px;
  margin: 12px 0;
  padding: 12px;
  border-radius: var(--radius);
}
.filters select {
  min-width: 200px;
}
.sales-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.card {
  margin-top: 8px;
  padding: 0;
}
.pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
}
</style>

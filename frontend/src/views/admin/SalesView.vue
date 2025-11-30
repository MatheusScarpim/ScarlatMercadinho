<template>
  <div class="sales-view">
    <div class="sales-header">
      <div class="header-left">
        <h3>Vendas</h3>
        <span v-if="total > 0" class="total-badge">{{ total }} {{ total === 1 ? 'venda' : 'vendas' }}</span>
      </div>
      <button class="btn btn-ghost" @click="exportSales">Exportar Excel</button>
    </div>
    <div class="filters glass">
      <input type="date" v-model="from" />
      <input type="date" v-model="to" />
      <select v-model="filterLocation" @change="filterAndLoad">
        <option value="">Todos os locais</option>
        <option v-for="loc in locations" :key="loc._id" :value="loc.code">
          {{ loc.name }} ({{ loc.code }})
        </option>
      </select>
      <button class="btn btn-primary" @click="filterAndLoad">Filtrar</button>
    </div>
    <div class="sales-table-container">
      <div class="sales-table glass">
      <table>
        <thead>
          <tr>
            <th class="icon-col"></th>
            <th>Data</th>
            <th>Origem</th>
            <th>Local</th>
            <th>Pagamento</th>
            <th>Status</th>
            <th class="total-col">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!sales.length">
            <td colspan="7" class="empty-state-cell">
              <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" class="empty-icon">
                  <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"/>
                </svg>
                <p>Nenhuma venda encontrada</p>
                <p class="hint">Tente ajustar os filtros ou período de busca</p>
              </div>
            </td>
          </tr>
          <tr v-for="s in sales" :key="s._id" :class="['sale-row', statusClass(s.status)]">
            <td class="icon-col">
              <div class="sale-icon" :class="statusClass(s.status)">
                <svg viewBox="0 0 24 24" fill="none" class="icon">
                  <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
            </td>
            <td class="date-col">{{ formatDate(s.createdAt) }}</td>
            <td>{{ originLabel(s.origin) }}</td>
            <td class="location-col">{{ locationLabel(s.location) }}</td>
            <td>{{ paymentLabel(s.paymentMethod) }}</td>
            <td>
              <span :class="['status-badge', statusClass(s.status)]">
                {{ statusLabel(s.status) }}
              </span>
            </td>
            <td class="total-col">
              <span class="total-value">R$ {{ s.totalAmount?.toFixed(2) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>

    <div class="pager glass">
      <button class="btn btn-ghost" :disabled="page === 1" @click="prevPage">Anterior</button>
      <span class="page-info">Página {{ page }} de {{ pages }}</span>
      <button class="btn btn-ghost" :disabled="page === pages" @click="nextPage">Próxima</button>
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

function filterAndLoad() {
  page.value = 1;
  load();
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

function statusClass(status: string) {
  return status?.toLowerCase() || 'open';
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
.sales-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: calc(100vh - 120px);
  overflow: hidden;
}

.filters {
  display: flex;
  gap: 10px;
  margin: 12px 0;
  padding: 12px;
  border-radius: var(--radius);
  flex-wrap: wrap;
  flex-shrink: 0;
}

.filters select {
  min-width: 200px;
}

.sales-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h3 {
  margin: 0;
}

.total-badge {
  padding: 6px 12px;
  background: rgba(91, 231, 196, 0.12);
  border: 1px solid rgba(91, 231, 196, 0.3);
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  color: var(--primary);
}

/* Sales Table Container */
.sales-table-container {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

/* Sales Table */
.sales-table {
  height: 100%;
  border-radius: var(--radius);
  overflow-y: auto;
  overflow-x: hidden;
  animation: slideIn 0.3s ease;
}

/* Scrollbar personalizado para tabela */
.sales-table::-webkit-scrollbar {
  width: 8px;
}

.sales-table::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.sales-table::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, rgba(91, 231, 196, 0.4), rgba(91, 231, 196, 0.6));
  border-radius: 4px;
}

.sales-table::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, var(--primary), var(--primary-strong));
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

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: rgba(91, 231, 196, 0.1);
}

th {
  padding: 16px 12px;
  text-align: left;
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--muted);
  border-bottom: 2px solid var(--border);
}

tbody tr {
  transition: all 0.2s ease;
  border-bottom: 1px solid var(--border);
}

tbody tr:hover {
  background: rgba(91, 231, 196, 0.05);
}

tbody tr.completed {
  border-left: 3px solid #22c55e;
}

tbody tr.open {
  border-left: 3px solid #f59e0b;
}

tbody tr.canceled {
  border-left: 3px solid #ef4444;
  opacity: 0.7;
}

td {
  padding: 16px 12px;
  vertical-align: middle;
}

/* Icon Column */
.icon-col {
  width: 60px;
  text-align: center;
}

.sale-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.sale-icon.completed {
  background: linear-gradient(135deg, #22c55e, #16a34a);
}

.sale-icon.open {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.sale-icon.canceled {
  background: linear-gradient(135deg, #ef4444, #dc2626);
}

.sale-icon .icon {
  width: 18px;
  height: 18px;
  color: white;
}

/* Date Column */
.date-col {
  font-size: 13px;
  color: var(--muted);
  white-space: nowrap;
}

/* Location Column */
.location-col {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: var(--text);
}

/* Status Badge */
.status-badge {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  display: inline-block;
}

.status-badge.completed {
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #22c55e;
}

.status-badge.open {
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #f59e0b;
}

.status-badge.canceled {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

/* Total Column */
.total-col {
  text-align: right;
  width: 140px;
}

.total-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--primary);
}

/* Empty State */
.empty-state-cell {
  padding: 0 !important;
  border: none !important;
}

.empty-state {
  padding: 60px 20px;
  text-align: center;
  color: var(--muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.empty-state .empty-icon {
  width: 80px;
  height: 80px;
  color: var(--muted);
  opacity: 0.3;
}

.empty-state p {
  margin: 0;
  font-weight: 600;
}

.empty-state .hint {
  font-size: 13px;
  font-weight: 400;
  opacity: 0.7;
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

/* Responsive */
@media (max-width: 1024px) {
  .location-col {
    display: none;
  }
}

@media (max-width: 768px) {
  .sales-view {
    max-height: calc(100vh - 80px);
  }

  .filters {
    flex-direction: column;
  }

  .filters select,
  .filters input {
    width: 100%;
  }

  .sales-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-left {
    width: 100%;
    justify-content: space-between;
  }

  .sales-table {
    overflow-x: auto;
  }

  table {
    min-width: 700px;
  }
}
</style>

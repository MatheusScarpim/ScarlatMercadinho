<template>
  <div class="movements-view">
    <h3>Movimentações de estoque</h3>
    <div class="filters glass">
      <select v-model="type" @change="filterAndLoad">
        <option value="">Todos</option>
        <option value="ENTRY">Entrada</option>
        <option value="EXIT">Saída</option>
        <option value="ADJUSTMENT">Ajuste</option>
      </select>
      <select v-model="location" @change="filterAndLoad">
        <option value="">Todos os locais</option>
        <option v-for="loc in locations" :key="loc._id" :value="loc.code">
          {{ loc.name }} ({{ loc.code }})
        </option>
      </select>
      <input v-model="productId" placeholder="ID do produto" @keyup.enter="filterAndLoad" />
      <button class="btn btn-ghost" @click="exportMovements">Exportar Excel</button>
      <button class="btn btn-primary" @click="filterAndLoad">Filtrar</button>
    </div>
    <div class="movements-table glass">
      <table>
        <thead>
          <tr>
            <th class="icon-col"></th>
            <th>Data</th>
            <th>Produto</th>
            <th>Tipo</th>
            <th class="qty-col">Quantidade</th>
            <th>Motivo</th>
            <th>Local</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in movements" :key="m._id" :class="['movement-row', typeClass(m.type)]">
            <td class="icon-col">
              <div class="movement-icon" :class="typeClass(m.type)">
                <svg viewBox="0 0 24 24" fill="none" class="icon" v-if="m.type === 'ENTRY'">
                  <path d="M12 5v14m0 0l7-7m-7 7l-7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <svg viewBox="0 0 24 24" fill="none" class="icon" v-else-if="m.type === 'EXIT'">
                  <path d="M12 19V5m0 0l-7 7m7-7l7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <svg viewBox="0 0 24 24" fill="none" class="icon" v-else>
                  <path d="M12 8v8m-4-4h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/>
                </svg>
              </div>
            </td>
            <td class="date-col">{{ formatDate(m.createdAt) }}</td>
            <td class="product-col">
              <span class="product-name">{{ m.product?.name || 'Produto removido' }}</span>
            </td>
            <td>
              <span :class="['type-badge', typeClass(m.type)]">
                {{ typeLabel(m.type) }}
              </span>
            </td>
            <td class="qty-col">
              <span :class="['quantity', typeClass(m.type)]">
                {{ m.type === 'EXIT' ? '-' : '+' }}{{ m.quantity }}
              </span>
            </td>
            <td class="reason-col">{{ m.reason || '—' }}</td>
            <td class="location-col">{{ m.location || 'default' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pager glass">
      <button class="btn btn-ghost" :disabled="page === 1" @click="prevPage">← Anterior</button>
      <span class="page-info">Página {{ page }} de {{ pages }}</span>
      <button class="btn btn-ghost" :disabled="page === pages" @click="nextPage">Próxima →</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import api from '../../services/api';
import { exportToCsv } from '../../utils/export';

const movements = ref<any[]>([]);
const type = ref('');
const productId = ref('');
const locations = ref<any[]>([]);
const location = ref('');
const page = ref(1);
const pages = ref(1);
const total = ref(0);

async function load() {
  const res = await api.get('/stock-movements', {
    params: {
      type: type.value || undefined,
      productId: productId.value || undefined,
      location: location.value || undefined,
      page: page.value,
      limit: 20
    }
  });
  const payload = res.data || {};
  const list = payload.data || payload;
  movements.value = list;
  total.value = payload.total ?? movements.value.length;
  pages.value = Math.max(1, payload.pages || Math.ceil(total.value / 20) || 1);
  if (payload.page) page.value = payload.page;
}

function filterAndLoad() {
  page.value = 1;
  load();
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString();
}
function typeLabel(t: string) {
  const map: Record<string, string> = { ENTRY: 'Entrada', EXIT: 'Saída', ADJUSTMENT: 'Ajuste' };
  return map[t] || t;
}

function typeClass(type: string) {
  return type?.toLowerCase() || 'adjustment';
}

async function loadRefs() {
  const { data } = await api.get('/locations');
  locations.value = data;
}

onMounted(() => {
  loadRefs();
  load();
});

async function exportMovements() {
  const { data } = await api.get('/stock-movements', {
    params: {
      type: type.value || undefined,
      productId: productId.value || undefined,
      location: location.value || undefined,
      limit: 2000,
      page: 1
    }
  });
  const list = data.data || data;
  const headers = ['Data', 'Produto', 'Tipo', 'Quantidade', 'Motivo', 'Local'];
  const rows = list.map((m: any) => [
    formatDate(m.createdAt),
    m.product?.name || '-',
    typeLabel(m.type),
    m.quantity,
    m.reason || '-',
    m.location || 'default'
  ]);
  exportToCsv('movimentacoes.csv', headers, rows);
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
.movements-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: calc(100vh - 120px);
  overflow: hidden;
}

.movements-view h3 {
  flex-shrink: 0;
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

/* Movements Table */
.movements-table {
  flex: 1;
  margin-top: 16px;
  border-radius: var(--radius);
  overflow-y: auto;
  overflow-x: hidden;
  animation: slideIn 0.3s ease;
  min-height: 0;
}

/* Scrollbar personalizado para tabela */
.movements-table::-webkit-scrollbar {
  width: 8px;
}

.movements-table::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.movements-table::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, rgba(91, 231, 196, 0.4), rgba(91, 231, 196, 0.6));
  border-radius: 4px;
}

.movements-table::-webkit-scrollbar-thumb:hover {
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

tbody tr.entry {
  border-left: 3px solid #22c55e;
}

tbody tr.exit {
  border-left: 3px solid #ef4444;
}

tbody tr.adjustment {
  border-left: 3px solid #f59e0b;
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

.movement-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.movement-icon.entry {
  background: linear-gradient(135deg, #22c55e, #16a34a);
}

.movement-icon.exit {
  background: linear-gradient(135deg, #ef4444, #dc2626);
}

.movement-icon.adjustment {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.movement-icon .icon {
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

/* Product Column */
.product-col {
  font-weight: 600;
  color: var(--text);
  max-width: 300px;
}

.product-name {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Type Badge */
.type-badge {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  display: inline-block;
}

.type-badge.entry {
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #22c55e;
}

.type-badge.exit {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.type-badge.adjustment {
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #f59e0b;
}

/* Quantity Column */
.qty-col {
  text-align: center;
  width: 120px;
}

.quantity {
  font-size: 18px;
  font-weight: 700;
}

.quantity.entry {
  color: #22c55e;
}

.quantity.exit {
  color: #ef4444;
}

.quantity.adjustment {
  color: #f59e0b;
}

/* Reason Column */
.reason-col {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--muted);
}

/* Location Column */
.location-col {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: var(--text);
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
  .reason-col {
    display: none;
  }
}

@media (max-width: 768px) {
  .movements-view {
    max-height: calc(100vh - 80px);
  }

  .filters {
    flex-direction: column;
  }

  .filters select,
  .filters input {
    width: 100%;
  }

  .movements-table {
    overflow-x: auto;
  }

  table {
    min-width: 800px;
  }

  .product-col {
    max-width: 200px;
  }
}
</style>

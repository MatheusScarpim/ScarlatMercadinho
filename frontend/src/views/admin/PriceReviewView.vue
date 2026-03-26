<template>
  <div class="view-container">
    <div class="header">
      <h3>Revisão de Preços</h3>
      <div class="header-actions">
        <button class="btn btn-primary" @click="triggerRefresh" :disabled="refreshing">
          {{ refreshing ? 'Atualizando...' : 'Atualizar via Cosmos' }}
        </button>
      </div>
    </div>

    <!-- Summary cards -->
    <div class="summary-row" v-if="summary">
      <div class="summary-card glass" :class="{ active: filter === 'all' }" @click="setFilter('all')">
        <span class="summary-value">{{ summary.total }}</span>
        <span class="summary-label">Total</span>
      </div>
      <div class="summary-card glass card-above" :class="{ active: filter === 'above' }" @click="setFilter('above')">
        <span class="summary-value">{{ summary.above }}</span>
        <span class="summary-label">Acima do mercado</span>
      </div>
      <div class="summary-card glass card-below" :class="{ active: filter === 'below' }" @click="setFilter('below')">
        <span class="summary-value">{{ summary.below }}</span>
        <span class="summary-label">Abaixo do mercado</span>
      </div>
      <div class="summary-card glass card-ok" :class="{ active: filter === 'ok' }" @click="setFilter('ok')">
        <span class="summary-value">{{ summary.ok }}</span>
        <span class="summary-label">Dentro da faixa</span>
      </div>
      <div class="summary-card glass card-nodata" :class="{ active: filter === 'no_data' }" @click="setFilter('no_data')">
        <span class="summary-value">{{ summary.noData }}</span>
        <span class="summary-label">Sem dados</span>
      </div>
    </div>

    <!-- Refresh status -->
    <div class="refresh-status glass" v-if="refreshStatus && refreshStatus.running">
      <div class="refresh-info">
        <span>Refresh em andamento: {{ refreshStatus.processed }}/{{ refreshStatus.total }}</span>
        <span class="muted">Cosmos: {{ refreshStatus.cosmosUsed }}/25 | Serp: {{ refreshStatus.serpUsed }}</span>
      </div>
      <div class="refresh-bar">
        <div class="refresh-progress" :style="{ width: refreshPercent + '%' }"></div>
      </div>
      <button class="btn btn-ghost btn-sm" @click="abortRefresh">Cancelar</button>
    </div>

    <!-- Search -->
    <div class="filters glass">
      <input v-model="search" placeholder="Buscar por nome ou código..." class="search-input" @input="filterLocal" />
    </div>

    <!-- Product list -->
    <div class="products-grid">
      <div
        class="product-card glass"
        v-for="item in filtered"
        :key="item._id"
        :class="'status-' + item.status"
      >
        <div class="card-top">
          <img
            v-if="item.imageUrl"
            :src="item.imageUrl"
            :alt="item.name"
            class="product-img"
            @error="($event.target as HTMLImageElement).style.display = 'none'"
          />
          <div class="product-info">
            <h4>{{ item.name }}</h4>
            <p class="barcode">{{ item.barcode }}</p>
            <p class="category-tag" v-if="item.category?.name">{{ item.category.name }}</p>
          </div>
          <div class="status-badge" :class="item.status">
            {{ statusLabel(item.status) }}
          </div>
        </div>

        <div class="price-comparison">
          <div class="price-bar-container">
            <div class="price-range" v-if="item.minPrice || item.maxPrice">
              <div
                class="range-bar"
                :style="rangeStyle(item)"
              >
                <span class="range-label min" v-if="item.minPrice">R$ {{ fmt(item.minPrice) }}</span>
                <span class="range-label avg" v-if="item.avgPrice">R$ {{ fmt(item.avgPrice) }}</span>
                <span class="range-label max" v-if="item.maxPrice">R$ {{ fmt(item.maxPrice) }}</span>
              </div>
              <div class="sale-marker" :style="markerStyle(item)" :class="item.status">
                <span class="sale-label">R$ {{ fmt(item.salePrice) }}</span>
              </div>
            </div>
            <div class="no-range" v-else>
              <span class="muted">Sem faixa de referência</span>
            </div>
          </div>

          <div class="price-details">
            <div class="price-col">
              <span class="price-title">Seu preço</span>
              <span class="price-big" :class="item.status">R$ {{ fmt(item.salePrice) }}</span>
            </div>
            <div class="price-col" v-if="item.minPrice">
              <span class="price-title">Mín. mercado</span>
              <span class="price-small">R$ {{ fmt(item.minPrice) }}</span>
            </div>
            <div class="price-col" v-if="item.avgPrice">
              <span class="price-title">Média</span>
              <span class="price-small">R$ {{ fmt(item.avgPrice) }}</span>
            </div>
            <div class="price-col" v-if="item.maxPrice">
              <span class="price-title">Máx. mercado</span>
              <span class="price-small">R$ {{ fmt(item.maxPrice) }}</span>
            </div>
          </div>
        </div>

        <div class="diff-indicator" v-if="item.diffPercent">
          <span v-if="item.status === 'above'" class="diff above">{{ item.diffPercent }}% acima do máximo</span>
          <span v-else-if="item.status === 'below'" class="diff below">{{ item.diffPercent }}% abaixo do mínimo</span>
        </div>

        <div class="card-actions">
          <div class="quick-edit">
            <label>Ajustar preço:</label>
            <div class="edit-group">
              <span class="currency">R$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                v-model.number="item.newPrice"
                :placeholder="fmt(item.avgPrice || item.salePrice)"
                class="price-input"
              />
              <button
                class="btn btn-sm btn-primary"
                @click="updatePrice(item)"
                :disabled="!item.newPrice || item.newPrice <= 0"
              >
                Salvar
              </button>
            </div>
          </div>
          <button
            v-if="item.avgPrice && item.status !== 'ok'"
            class="btn btn-sm btn-ghost"
            @click="setToAvg(item)"
          >
            Usar preço médio (R$ {{ fmt(item.avgPrice) }})
          </button>
        </div>
      </div>
    </div>

    <div v-if="!loading && !filtered.length" class="empty-state">
      <div class="empty-icon">{{ filter === 'ok' ? '&#10003;' : '&#128270;' }}</div>
      <h4 v-if="filter === 'all'">Nenhum produto encontrado</h4>
      <h4 v-else-if="filter === 'ok'">Todos os preços estão dentro da faixa!</h4>
      <h4 v-else>Nenhum produto nesta categoria</h4>
    </div>

    <div v-if="loading" class="loading-state">
      <p>Carregando...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import api from '../../services/api';

interface PriceItem {
  _id: string;
  name: string;
  barcode: string;
  imageUrl: string | null;
  category: { name: string } | null;
  salePrice: number;
  costPrice: number;
  minPrice: number | null;
  avgPrice: number | null;
  maxPrice: number | null;
  status: 'ok' | 'above' | 'below' | 'no_data';
  diffPercent: number;
  newPrice?: number | null;
}

interface Summary {
  total: number;
  above: number;
  below: number;
  ok: number;
  noData: number;
}

const items = ref<PriceItem[]>([]);
const summary = ref<Summary | null>(null);
const filter = ref('all');
const search = ref('');
const loading = ref(false);
const refreshing = ref(false);
const refreshStatus = ref<any>(null);
let refreshPoll: ReturnType<typeof setInterval> | null = null;

const filtered = computed(() => {
  if (!search.value) return items.value;
  const q = search.value.toLowerCase();
  return items.value.filter(
    (i) => i.name?.toLowerCase().includes(q) || i.barcode?.includes(q),
  );
});

const refreshPercent = computed(() => {
  if (!refreshStatus.value) return 0;
  const { processed, total } = refreshStatus.value;
  return total > 0 ? Math.round((processed / total) * 100) : 0;
});

function fmt(val: number | null | undefined): string {
  if (val === null || val === undefined) return '-';
  return val.toFixed(2);
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    above: 'Acima',
    below: 'Abaixo',
    ok: 'OK',
    no_data: 'Sem dados',
  };
  return map[status] || status;
}

function rangeStyle(item: PriceItem) {
  return { position: 'relative' as const };
}

function markerStyle(item: PriceItem) {
  const min = item.minPrice ?? 0;
  const max = item.maxPrice ?? item.salePrice * 1.5;
  const range = max - min || 1;
  const clamped = Math.max(0, Math.min(100, ((item.salePrice - min) / range) * 100));
  return { left: clamped + '%' };
}

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get('/products/price-outliers', {
      params: { filter: filter.value },
    });
    items.value = data.items;
    summary.value = data.summary;
  } catch (err) {
    console.error('Failed to load price outliers:', err);
  } finally {
    loading.value = false;
  }
}

function setFilter(f: string) {
  filter.value = f;
  load();
}

function filterLocal() {
  // filtering is reactive via computed
}

async function updatePrice(item: PriceItem) {
  if (!item.newPrice || item.newPrice <= 0) return;
  try {
    await api.put(`/products/${item._id}`, { salePrice: item.newPrice });
    item.salePrice = item.newPrice;
    item.newPrice = null;
    // Recalcular status
    if (item.maxPrice && item.salePrice > item.maxPrice) {
      item.status = 'above';
    } else if (item.minPrice && item.salePrice < item.minPrice) {
      item.status = 'below';
    } else if (item.minPrice || item.maxPrice) {
      item.status = 'ok';
    }
    await load();
  } catch (err) {
    alert('Erro ao atualizar preço');
  }
}

async function setToAvg(item: PriceItem) {
  if (!item.avgPrice) return;
  item.newPrice = item.avgPrice;
  await updatePrice(item);
}

async function triggerRefresh() {
  try {
    refreshing.value = true;
    await api.post('/products/refresh');
    pollRefreshStatus();
  } catch (err: any) {
    if (err?.response?.status === 409) {
      pollRefreshStatus();
    } else {
      alert('Erro ao iniciar refresh');
      refreshing.value = false;
    }
  }
}

async function pollRefreshStatus() {
  if (refreshPoll) clearInterval(refreshPoll);
  refreshPoll = setInterval(async () => {
    try {
      const { data } = await api.get('/products/refresh/status');
      refreshStatus.value = data;
      if (!data.running) {
        if (refreshPoll) clearInterval(refreshPoll);
        refreshPoll = null;
        refreshing.value = false;
        refreshStatus.value = null;
        await load();
      }
    } catch {
      if (refreshPoll) clearInterval(refreshPoll);
      refreshPoll = null;
      refreshing.value = false;
    }
  }, 2000);
}

async function abortRefresh() {
  try {
    await api.post('/products/refresh/abort');
  } catch {}
}

onMounted(async () => {
  await load();
  // Check if refresh is already running
  try {
    const { data } = await api.get('/products/refresh/status');
    if (data.running) {
      refreshing.value = true;
      refreshStatus.value = data;
      pollRefreshStatus();
    }
  } catch {}
});
</script>

<style scoped>
.view-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
}

/* Summary */
.summary-row {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.summary-card {
  flex: 1;
  min-width: 100px;
  padding: 12px;
  border-radius: var(--radius);
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.summary-card:hover {
  transform: translateY(-2px);
}

.summary-card.active {
  border-color: var(--primary);
}

.summary-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
}

.summary-label {
  font-size: 11px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.card-above .summary-value { color: #ef4444; }
.card-below .summary-value { color: #f59e0b; }
.card-ok .summary-value { color: #22c55e; }
.card-nodata .summary-value { color: var(--muted); }

/* Refresh status */
.refresh-status {
  padding: 12px;
  margin-bottom: 12px;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.refresh-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  font-weight: 600;
  flex: 1;
}

.refresh-bar {
  flex: 2;
  height: 6px;
  background: var(--border);
  border-radius: 3px;
  overflow: hidden;
}

.refresh-progress {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), var(--primary-strong));
  border-radius: 3px;
  transition: width 0.3s ease;
}

/* Filters */
.filters {
  margin-bottom: 12px;
  padding: 10px;
  border-radius: var(--radius);
  flex-shrink: 0;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
  color: var(--text);
  font-size: 13px;
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
}

/* Grid */
.products-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;
}

.products-grid::-webkit-scrollbar { width: 8px; }
.products-grid::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.05); border-radius: 4px; }
.products-grid::-webkit-scrollbar-thumb { background: rgba(91, 231, 196, 0.3); border-radius: 4px; }

/* Card */
.product-card {
  padding: 14px;
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-left: 4px solid var(--primary);
  animation: slideIn 0.2s ease;
}

.product-card.status-above { border-left-color: #ef4444; }
.product-card.status-below { border-left-color: #f59e0b; }
.product-card.status-ok { border-left-color: #22c55e; }
.product-card.status-no_data { border-left-color: var(--muted); }

@keyframes slideIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.card-top {
  display: flex;
  align-items: center;
  gap: 12px;
}

.product-img {
  width: 48px;
  height: 48px;
  object-fit: contain;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
}

.product-info {
  flex: 1;
  min-width: 0;
}

.product-info h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.barcode {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--muted);
  font-family: 'Courier New', monospace;
}

.category-tag {
  margin: 4px 0 0;
  font-size: 10px;
  padding: 2px 6px;
  background: rgba(16, 180, 157, 0.1);
  border: 1px solid rgba(16, 180, 157, 0.2);
  border-radius: 4px;
  color: var(--primary);
  display: inline-block;
  font-weight: 600;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}

.status-badge.above {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.status-badge.below {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.status-badge.ok {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.status-badge.no_data {
  background: rgba(107, 114, 128, 0.15);
  color: var(--muted);
  border: 1px solid var(--border);
}

/* Price comparison */
.price-comparison {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.price-bar-container {
  padding: 8px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 6px;
  border: 1px solid var(--border);
}

.price-range {
  position: relative;
  height: 40px;
}

.range-bar {
  position: absolute;
  top: 12px;
  left: 0;
  right: 0;
  height: 6px;
  background: linear-gradient(90deg, #f59e0b, #22c55e, #22c55e, #ef4444);
  border-radius: 3px;
  opacity: 0.4;
}

.range-label {
  position: absolute;
  top: 22px;
  font-size: 9px;
  font-weight: 600;
  color: var(--muted);
}

.range-label.min { left: 0; }
.range-label.avg { left: 50%; transform: translateX(-50%); }
.range-label.max { right: 0; }

.sale-marker {
  position: absolute;
  top: 2px;
  transform: translateX(-50%);
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
}

.sale-marker.above {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.sale-marker.below {
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
}

.sale-marker.ok {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
}

.no-range {
  text-align: center;
  padding: 8px;
  font-size: 12px;
}

.price-details {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.price-col {
  flex: 1;
  min-width: 80px;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.price-title {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--muted);
  font-weight: 600;
}

.price-big {
  font-size: 16px;
  font-weight: 700;
}

.price-big.above { color: #ef4444; }
.price-big.below { color: #f59e0b; }
.price-big.ok { color: #22c55e; }
.price-big.no_data { color: var(--text); }

.price-small {
  font-size: 13px;
  font-weight: 600;
}

/* Diff */
.diff-indicator {
  text-align: center;
}

.diff {
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 4px;
}

.diff.above {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.diff.below {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

/* Actions */
.card-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
}

.quick-edit label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--muted);
  margin-bottom: 4px;
  display: block;
}

.edit-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.currency {
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
}

.price-input {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.02);
  color: var(--text);
  font-size: 13px;
  font-weight: 600;
  max-width: 120px;
}

.price-input:focus {
  outline: none;
  border-color: var(--primary);
}

.btn-sm {
  padding: 6px 12px;
  font-size: 11px;
  border-radius: 5px;
  white-space: nowrap;
}

.muted { color: var(--muted); }

/* Empty & loading */
.empty-state, .loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  flex: 1;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-state h4 {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
}

@media (max-width: 768px) {
  .summary-row {
    flex-wrap: wrap;
  }

  .summary-card {
    min-width: calc(50% - 10px);
  }

  .price-details {
    flex-direction: column;
  }
}
</style>

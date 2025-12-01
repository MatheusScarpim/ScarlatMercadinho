<template>
  <div class="fiscal-view">
    <header class="header">
      <div>
        <p class="eyebrow">Fiscal</p>
        <h2>Entradas, saídas e NFC-e</h2>
        <p class="muted">Visão rápida das notas importadas, compras e vendas para conferência fiscal.</p>
      </div>
      <div class="actions">
        <button class="btn" type="button" @click="exportFile" :disabled="exporting || loading">
          {{ exporting ? 'Gerando...' : 'Exportar para contador' }}
        </button>
        <button class="btn primary" type="button" @click="load" :disabled="loading">
          {{ loading ? 'Atualizando...' : 'Atualizar' }}
        </button>
      </div>
    </header>

    <section class="summary summary-fixed">
      <div class="card summary-card">
        <p class="muted tiny">NFC-e importadas</p>
        <h3>{{ nfces.length }}</h3>
        <p class="muted tiny">Total: R$ {{ formatNumber(nfceTotal) }}</p>
      </div>
      <div class="card summary-card">
        <p class="muted tiny">Compras (Entradas)</p>
        <h3>{{ purchases.length }}</h3>
        <p class="muted tiny">Total: R$ {{ formatNumber(purchasesTotal) }}</p>
      </div>
      <div class="card summary-card">
        <p class="muted tiny">Vendas (Saídas)</p>
        <h3>{{ sales.length }}</h3>
        <p class="muted tiny">Total: R$ {{ formatNumber(salesTotal) }}</p>
      </div>
    </section>

    <div class="fiscal-content">
      <p v-if="error" class="error card">{{ error }}</p>

      <div v-if="loading" class="card loading-card">
        <div class="loading-spinner"></div>
        <p class="muted">Carregando visão fiscal...</p>
      </div>

      <section v-if="!loading" class="card">
        <div class="section-title">NFC-e capturadas</div>
        <p class="muted tiny">Últimas 200 notas importadas.</p>
        <div class="table-wrapper" v-if="nfces.length">
          <table class="table">
            <thead>
              <tr>
                <th>Chave</th>
                <th>Emitente</th>
                <th>Total</th>
                <th>Emissão</th>
                <th>Capturada</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="n in nfces" :key="n._id || n.chaveAcesso">
                <td class="mono">{{ n.chaveAcesso || n.chaveAcessoNumerica || '-' }}</td>
                <td>{{ n.data?.emitente?.nome || '-' }}</td>
                <td>R$ {{ formatNumber(n.data?.totais?.valorTotal) }}</td>
                <td>{{ formatDate(n.data?.info?.emissao) }}</td>
                <td>{{ formatDate(n.lastFetchedAt || n.updatedAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" class="empty-icon">
            <path
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.3" />
          </svg>
          <p class="muted">Nenhuma NFC-e importada ainda</p>
        </div>
      </section>

      <section v-if="!loading" class="card">
        <div class="section-title">Compras (entradas)</div>
        <p class="muted tiny">Últimas 100 compras registradas.</p>
        <div class="table-wrapper" v-if="purchases.length">
          <table class="table">
            <thead>
              <tr>
                <th>Fornecedor</th>
                <th>Nota</th>
                <th>Emissão</th>
                <th>Total</th>
                <th>Itens</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in purchases" :key="p._id">
                <td>{{ p.supplier?.name || p.supplier?.companyName || '-' }}</td>
                <td>{{ p.invoiceNumber || '-' }}</td>
                <td>{{ formatDate(p.issueDate || p.createdAt) }}</td>
                <td>R$ {{ formatNumber(p.totalAmount) }}</td>
                <td>{{ p.items?.length || 0 }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" class="empty-icon">
            <path d="M3 3h18v18H3V3zm2 2v14h14V5H5z" fill="currentColor" opacity="0.3" />
          </svg>
          <p class="muted">Nenhuma compra encontrada</p>
        </div>
      </section>

      <section v-if="!loading" class="card">
        <div class="section-title">Vendas (saídas)</div>
        <p class="muted tiny">Últimas 200 vendas concluídas/não canceladas.</p>
        <div class="table-wrapper" v-if="sales.length">
          <table class="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Total</th>
                <th>Itens</th>
                <th>Pagamento</th>
                <th>Origem</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in sales" :key="s.sale._id">
                <td>{{ formatDate(s.sale.createdAt || s.sale.completedAt) }}</td>
                <td>R$ {{ formatNumber(s.sale.totalAmount) }}</td>
                <td>{{ s.items?.length || 0 }}</td>
                <td>{{ s.sale.paymentMethod || '-' }}</td>
                <td>{{ s.sale.origin || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" class="empty-icon">
            <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round" opacity="0.3" />
          </svg>
          <p class="muted">Nenhuma venda encontrada</p>
        </div>
      </section>
      <section v-if="!loading" class="card">
        <div class="section-title">Itens de compras</div>
        <p class="muted tiny">Produtos registrados nas �ltimas compras.</p>
        <div class="table-wrapper" v-if="purchaseItems.length">
          <table class="table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>NCM</th>
                <th>CEST</th>
                <th>CFOP</th>
                <th>Qtd</th>
                <th>Unit�rio</th>
                <th>Total</th>
                <th>Nota</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(it, idx) in purchaseItems" :key="idx">
                <td>{{ it.productName }}</td>
                <td>{{ it.ncm || '-' }}</td>
                <td>{{ it.cest || '-' }}</td>
                <td>{{ it.cfop || '-' }}</td>
                <td>{{ formatNumber(it.quantity) }}</td>
                <td>R$ {{ formatNumber(it.unitCost) }}</td>
                <td>R$ {{ formatNumber(it.totalCost) }}</td>
                <td>{{ it.invoiceNumber || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" class="empty-icon">
            <path
              d="M20 7h-4V5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM10 5h4v2h-4V5zm10 15H4V9h16v11z"
              fill="currentColor" opacity="0.3" />
          </svg>
          <p class="muted">Sem itens de compras para mostrar</p>
        </div>
      </section>

      <section v-if="!loading" class="card">
        <div class="section-title">Itens de vendas</div>
        <p class="muted tiny">Produtos vendidos (saídas) nas últimas 200 vendas.</p>
        <div class="table-wrapper" v-if="saleItems.length">
          <table class="table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>NCM</th>
                <th>CEST</th>
                <th>CFOP</th>
                <th>Qtd</th>
                <th>Unitário</th>
                <th>Total</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(it, idx) in saleItems" :key="idx">
                <td>{{ it.productName }}</td>
                <td>{{ it.ncm || '-' }}</td>
                <td>{{ it.cest || '-' }}</td>
                <td>{{ it.cfop || '-' }}</td>
                <td>{{ formatNumber(it.quantity) }}</td>
                <td>R$ {{ formatNumber(it.unitPrice) }}</td>
                <td>R$ {{ formatNumber(it.total) }}</td>
                <td>{{ formatDate(it.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" class="empty-icon">
            <path
              d="M20 7h-4V5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM10 5h4v2h-4V5zm10 15H4V9h16v11z"
              fill="currentColor" opacity="0.3" />
          </svg>
          <p class="muted">Sem itens de vendas para mostrar</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { exportFiscalSummary, fetchFiscalOverview } from '../../services/nfce';

type FiscalOverview = {
  purchases: any[];
  sales: { sale: any; items: any[] }[];
  nfces: any[];
};

const loading = ref(false);
const error = ref('');
const overview = ref<FiscalOverview | null>(null);
const exporting = ref(false);

const nfces = computed(() => overview.value?.nfces || []);
const purchases = computed(() => overview.value?.purchases || []);
const sales = computed(() => overview.value?.sales || []);
const purchasesTotal = computed(() =>
  purchases.value.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0)
);
const salesTotal = computed(() =>
  sales.value.reduce((sum, s) => sum + Number(s.sale?.totalAmount || 0), 0)
);
const nfceTotal = computed(() =>
  nfces.value.reduce(
    (sum, n) => sum + Number(n?.data?.totais?.valorTotal || 0),
    0
  )
);

const purchaseItems = computed(() =>
  purchases.value.flatMap((p: any) =>
    (p.items || []).map((it: any) => ({
      productName: it.product?.name || it.product?.description || '-',
      ncm: it.product?.ncm,
      cest: it.product?.cest,
      cfop: it.product?.cfop,
      quantity: it.quantity,
      unitCost: it.unitCost,
      totalCost: it.totalCost,
      invoiceNumber: p.invoiceNumber,
    }))
  )
);

const saleItems = computed(() =>
  sales.value.flatMap((s: any) =>
    (s.items || []).map((it: any) => ({
      productName: it.product?.name || '-',
      ncm: it.product?.ncm,
      cest: it.product?.cest,
      cfop: it.product?.cfop,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      total: it.total,
      createdAt: s.sale?.createdAt || s.sale?.completedAt,
    }))
  )
);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    overview.value = await fetchFiscalOverview();
  } catch (err: any) {
    error.value =
      err?.response?.data?.message || err?.message || 'Erro ao carregar visão fiscal';
  } finally {
    loading.value = false;
  }
}

function formatNumber(value: number | string | null | undefined) {
  const num = Number(value || 0);
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return '-';
  const d = new Date(value);
  return isNaN(d.getTime()) ? String(value) : d.toLocaleString('pt-BR');
}

onMounted(load);

async function exportFile() {
  exporting.value = true;
  error.value = '';
  try {
    const blob = await exportFiscalSummary();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fiscal-completo-${Date.now()}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (err: any) {
    error.value = err?.response?.data?.message || err?.message || 'Erro ao exportar resumo fiscal';
  } finally {
    exporting.value = false;
  }
}
</script>

<style scoped>
.fiscal-view {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-shrink: 0;
  margin-bottom: 12px;
}

.header h2 {
  margin: 4px 0;
}

.summary-fixed {
  flex-shrink: 0;
  margin-bottom: 12px;
}

.fiscal-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  padding-right: 4px;
  padding-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.fiscal-content::-webkit-scrollbar {
  width: 8px;
}

.fiscal-content::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.fiscal-content::-webkit-scrollbar-thumb {
  background: rgba(91, 231, 196, 0.3);
  border-radius: 4px;
  transition: background 0.2s ease;
}

.fiscal-content::-webkit-scrollbar-thumb:hover {
  background: rgba(91, 231, 196, 0.5);
}

.actions {
  display: flex;
  gap: 8px;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 2px;
  font-size: 11px;
  color: var(--primary);
  margin: 0 0 4px;
}

.muted {
  color: var(--muted);
}

.muted.tiny {
  font-size: 11px;
}

.summary .card .muted.tiny {
  font-size: 10px;
  margin: 2px 0;
}

.loading-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
  text-align: center;
}

.loading-spinner {
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

.summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 6px;
}

.card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 8px;
  box-shadow: var(--shadow);
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.section-title {
  font-weight: 700;
  margin-bottom: 8px;
  font-size: 16px;
  color: var(--primary);
  border-bottom: 2px solid rgba(91, 231, 196, 0.2);
  padding-bottom: 8px;
}

.table-wrapper {
  overflow-x: auto;
  margin-top: 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
}

.table-wrapper::-webkit-scrollbar {
  height: 8px;
}

.table-wrapper::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.table-wrapper::-webkit-scrollbar-thumb {
  background: rgba(91, 231, 196, 0.3);
  border-radius: 4px;
}

.table-wrapper::-webkit-scrollbar-thumb:hover {
  background: rgba(91, 231, 196, 0.5);
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  min-width: 600px;
}

.table thead {
  background: rgba(91, 231, 196, 0.1);
  position: sticky;
  top: 0;
  z-index: 1;
}

.table th,
.table td {
  padding: 10px 8px;
  border-bottom: 1px solid var(--border);
}

.table th {
  text-align: left;
  color: var(--muted);
  font-weight: 700;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.table tbody tr {
  transition: background 0.2s ease;
}

.table tbody tr:hover {
  background: rgba(91, 231, 196, 0.05);
}

.table td.mono {
  font-family: monospace;
  font-size: 11px;
  color: var(--muted);
}

.btn {
  border: 1px solid var(--border);
  background: #fff;
  padding: 10px 14px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 700;
  transition: all 0.2s ease;
  font-size: 14px;
}

.btn:hover:not(:disabled) {
  background: rgba(91, 231, 196, 0.05);
  border-color: rgba(91, 231, 196, 0.3);
  transform: translateY(-1px);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn.primary {
  background: linear-gradient(135deg, var(--primary), var(--primary-strong));
  color: #0c1829;
  border-color: transparent;
  box-shadow: 0 2px 8px rgba(91, 231, 196, 0.3);
}

.btn.primary:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--primary-strong), var(--primary));
  box-shadow: 0 4px 12px rgba(91, 231, 196, 0.4);
  transform: translateY(-2px);
}

.error {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1) !important;
  border-color: rgba(239, 68, 68, 0.3) !important;
}

.summary-card {
  text-align: center;
  position: relative;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.summary-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(91, 231, 196, 0.15);
}

.summary-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  border-radius: 12px;
  background: rgba(91, 231, 196, 0.1);
  border: 2px solid rgba(91, 231, 196, 0.2);
}

.nfce-icon {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.2);
}

.purchase-icon {
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.2);
}

.sale-icon {
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.2);
}

.summary .card h3 {
  font-size: 22px;
  font-weight: 700;
  color: var(--primary);
  margin: 4px 0;
  line-height: 1;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
  text-align: center;
  margin-top: 10px;
  border: 1px dashed var(--border);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.01);
}

.empty-icon {
  width: 64px;
  height: 64px;
  color: var(--muted);
  opacity: 0.3;
}

.empty-state .muted {
  margin: 0;
  font-weight: 600;
}

@media (max-width: 900px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
  }

  .actions {
    width: 100%;
    flex-direction: column;
  }

  .actions .btn {
    width: 100%;
  }

  .summary {
    grid-template-columns: 1fr;
  }
}
</style>

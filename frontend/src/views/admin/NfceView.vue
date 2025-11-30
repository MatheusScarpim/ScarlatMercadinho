<template>
  <div class="nfce">
    <header class="nfce-header">
      <div>
        <p class="eyebrow">NFC-e</p>
        <h2>Consulta por QR Code</h2>
        <p class="muted">Cole a URL completa do QR Code e visualize emitente, itens, totais e cenários fiscais.</p>
      </div>
      <button class="btn" type="button" @click="runDemo" :disabled="loading">
        Usar exemplo
      </button>
    </header>

    <form class="card" @submit.prevent="submit">
      <label class="label">URL do QR Code</label>
      <div class="input-row">
        <input
          v-model="url"
          class="input"
          type="url"
          required
          placeholder="https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx?p=..."
        />
        <button class="btn primary" type="submit" :disabled="loading">Consultar</button>
      </div>
      <p v-if="error" class="error">{{ error }}</p>
    </form>

    <section v-if="loading" class="card muted">Consultando NFC-e...</section>

    <section v-if="data && !loading" class="grid">
      <div class="card">
        <div class="section-title">Emitente</div>
        <p class="big">{{ data.emitente.nome || '-' }}</p>
        <p class="muted">CNPJ: {{ data.emitente.cnpj || '-' }}</p>
        <p class="muted">{{ data.emitente.endereco || '-' }}</p>
      </div>

      <div class="card">
        <div class="section-title">Nota</div>
        <p class="muted">Número / Série</p>
        <p class="big">{{ data.info.numero || '-' }} / {{ data.info.serie || '-' }}</p>
        <p class="muted">Emissão: {{ data.info.emissao || '-' }}</p>
        <p class="muted">Protocolo: {{ data.info.protocolo || '-' }}</p>
        <p class="muted">Ambiente: {{ data.info.ambiente || '-' }}</p>
        <p class="muted">Chave: {{ data.chaveAcesso || '-' }}</p>
      </div>

      <div class="card totals">
        <div class="section-title">Totais</div>
        <div class="totals-row">
          <span>Itens</span>
          <strong>{{ formatNumber(data.totais.quantidadeItens) }}</strong>
        </div>
        <div class="totals-row">
          <span>Valor total</span>
          <strong>R$ {{ formatNumber(data.totais.valorTotal) }}</strong>
        </div>
        <div class="totals-row">
          <span>Descontos</span>
          <strong>R$ {{ formatNumber(data.totais.desconto) }}</strong>
        </div>
        <div class="totals-row">
          <span>Valor a pagar</span>
          <strong>R$ {{ formatNumber(data.totais.valorAPagar) }}</strong>
        </div>
        <div class="totals-row">
          <span>Tributos</span>
          <strong>R$ {{ formatNumber(data.totais.tributos) }}</strong>
        </div>
        <div class="totals-row">
          <span>Pagamento</span>
          <strong>{{ data.totais.pagamento.forma || '-' }}</strong>
        </div>
        <div class="totals-row">
          <span>Valor pago</span>
          <strong>R$ {{ formatNumber(data.totais.pagamento.valorPago) }}</strong>
        </div>
        <div class="totals-row">
          <span>Troco</span>
          <strong>R$ {{ formatNumber(data.totais.pagamento.troco) }}</strong>
        </div>
      </div>
    </section>

    <section v-if="data && !loading" class="card fiscal-card">
      <div class="fiscal-header">
        <div>
          <div class="section-title">Cenários fiscais (estimativa)</div>
          <p class="muted">
            Usa o total da nota como base e aplica alíquotas típicas de varejo. É uma visão rápida, não substitui a apuração oficial.
          </p>
        </div>
        <div class="pill-toggle">
          <button :class="['pill', horizon === 'monthly' ? 'active' : '']" type="button" @click="horizon = 'monthly'">
            Mês
          </button>
          <button :class="['pill', horizon === 'yearly' ? 'active' : '']" type="button" @click="horizon = 'yearly'">
            Ano
          </button>
        </div>
      </div>

      <div class="fiscal-grid">
        <div class="fiscal-card-item" v-for="sc in scenarios" :key="sc.key">
          <div class="fiscal-card-header">
            <div>
              <p class="muted tiny">{{ sc.subtitle }}</p>
              <h4>{{ sc.title }}</h4>
            </div>
            <span class="chip">{{ sc.rateLabel }}</span>
          </div>
          <div class="fiscal-metrics">
            <div class="metric">
              <span class="label">Base ({{ horizonLabel }})</span>
              <strong>R$ {{ formatNumber(sc.base) }}</strong>
            </div>
            <div class="metric">
              <span class="label">ICMS estimado</span>
              <strong>R$ {{ formatNumber(sc.icms) }}</strong>
            </div>
            <div class="metric">
              <span class="label">PIS/COFINS</span>
              <strong>R$ {{ formatNumber(sc.pis + sc.cofins) }}</strong>
            </div>
            <div class="metric total">
              <span class="label">Tributos totais</span>
              <strong>R$ {{ formatNumber(sc.totalTax) }}</strong>
            </div>
            <div class="metric">
              <span class="label">Carga efetiva</span>
              <strong>{{ sc.effectiveLoad.toFixed(2) }}%</strong>
            </div>
          </div>
          <div class="bar">
            <div class="bar-fill" :style="{ width: `${Math.min(sc.effectiveLoad, 100)}%` }"></div>
          </div>
          <p class="muted tiny">ICMS: {{ (sc.icmsRate * 100).toFixed(2) }}% · PIS: {{ (sc.pisRate * 100).toFixed(2) }}% · COFINS: {{ (sc.cofinsRate * 100).toFixed(2) }}%</p>
        </div>
      </div>

      <div class="fiscal-footnote">
        <span>Tributos declarados na nota</span>
        <strong>
          ICMS: R$ {{ formatNumber(baseIcmsNota) }} · PIS: R$ {{ formatNumber(basePisNota) }} · COFINS: R$
          {{ formatNumber(baseCofinsNota) }} · Total: R$ {{ formatNumber(baseIcmsNota + basePisNota + baseCofinsNota) }}
        </strong>
      </div>
    </section>

    <section v-if="data && data.itens.length && !loading" class="card">
      <div class="section-title">Itens ({{ data.itens.length }})</div>
      <div class="table">
        <div class="thead">
          <span>Descrição</span>
          <span>Código</span>
          <span>Qtd</span>
          <span>UN</span>
          <span>Vlr Unit</span>
          <span>Vlr Total</span>
          <span>NCM</span>
          <span>CEST</span>
          <span>CFOP</span>
          <span>EAN</span>
          <span>ICMS</span>
          <span>PIS</span>
          <span>COFINS</span>
          <span>Cosmos</span>
        </div>
        <div v-for="(item, idx) in data.itens" :key="idx" class="trow">
          <span class="desc">{{ item.descricao }}</span>
          <span>{{ item.codigo || '-' }}</span>
          <span>{{ formatNumber(item.quantidade) }}</span>
          <span>{{ item.unidade || '-' }}</span>
          <span>R$ {{ formatNumber(item.valorUnitario) }}</span>
          <span>R$ {{ formatNumber(item.valorTotal) }}</span>
          <span>{{ item.ncm || '-' }}</span>
          <span>{{ item.cest || '-' }}</span>
          <span>{{ item.cfop || '-' }}</span>
          <span>{{ item.eanComercial || '-' }}</span>
          <span>R$ {{ formatNumber(item.icms.valor) }}</span>
          <span>R$ {{ formatNumber(item.pis.valor) }}</span>
          <span>R$ {{ formatNumber(item.cofins.valor) }}</span>
          <span>
            <button class="btn tiny" type="button" @click="openCosmos(item)">Ver detalhes</button>
          </span>
        </div>
      </div>
    </section>

    <div v-if="cosmosModalOpen" class="modal">
      <div class="modal-box glass cosmos-box">
        <div class="modal-header">
          <div>
            <p class="eyebrow">Cosmos</p>
            <h3>Detalhes do produto</h3>
          </div>
          <button class="btn" type="button" @click="closeCosmos">Fechar</button>
        </div>
        <p class="muted">EAN consultado: {{ cosmosEan || '-' }}</p>
        <p v-if="cosmosLoading" class="muted">Buscando dados no Cosmos...</p>
        <p v-else-if="cosmosError" class="error">{{ cosmosError }}</p>
        <div v-else-if="cosmosData" class="cosmos-grid">
          <img v-if="cosmosData.imageUrl" :src="cosmosData.imageUrl" alt="Imagem do produto" />
          <div class="cosmos-info">
            <h4>{{ cosmosData.name || 'Produto sem nome' }}</h4>
            <p class="muted">{{ cosmosData.description || 'Sem descrição' }}</p>
            <p><strong>Preço médio:</strong> {{ cosmosData.averagePrice || 'Não informado' }}</p>
            <a class="btn primary" :href="cosmosData.url" target="_blank" rel="noreferrer">Ver detalhes</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { fetchNfce, type NfceData } from '../../services/nfce';
import { fetchCosmosProduct, type CosmosProduct } from '../../services/cosmos';

const url = ref('');
const loading = ref(false);
const error = ref('');
const data = ref<NfceData | null>(null);
const cosmosModalOpen = ref(false);
const cosmosLoading = ref(false);
const cosmosError = ref('');
const cosmosData = ref<CosmosProduct | null>(null);
const cosmosEan = ref('');
const horizon = ref<'monthly' | 'yearly'>('monthly');

const baseTotal = computed(() => data.value?.totais.valorTotal ?? 0);
const horizonMultiplier = computed(() => (horizon.value === 'yearly' ? 12 : 1));
const horizonLabel = computed(() => (horizon.value === 'yearly' ? 'ano' : 'mês'));
const baseIcmsNota = computed(() => (data.value?.itens || []).reduce((sum, it) => sum + (it.icms?.valor || 0), 0));
const basePisNota = computed(() => (data.value?.itens || []).reduce((sum, it) => sum + (it.pis?.valor || 0), 0));
const baseCofinsNota = computed(() => (data.value?.itens || []).reduce((sum, it) => sum + (it.cofins?.valor || 0), 0));

const scenarioDefs = [
  { key: 'simples', title: 'Simples Nacional (Comércio)', subtitle: 'Faixa inicial', icmsRate: 0.032, pisRate: 0.0065, cofinsRate: 0.03 },
  { key: 'presumido', title: 'Lucro Presumido', subtitle: 'ICMS + PIS/COFINS cumulativo', icmsRate: 0.18, pisRate: 0.0165, cofinsRate: 0.076 },
  { key: 'real', title: 'Lucro Real (aprox.)', subtitle: 'Margens apertadas', icmsRate: 0.18, pisRate: 0.0165, cofinsRate: 0.076 }
];

const scenarios = computed(() => {
  const base = baseTotal.value * horizonMultiplier.value;
  return scenarioDefs.map((s) => {
    const icms = base * s.icmsRate;
    const pis = base * s.pisRate;
    const cofins = base * s.cofinsRate;
    const totalTax = icms + pis + cofins;
    const effectiveLoad = base > 0 ? (totalTax / base) * 100 : 0;
    const rateLabel = `${(s.icmsRate * 100).toFixed(1)}% ICMS · ${((s.pisRate + s.cofinsRate) * 100).toFixed(1)}% PIS/COFINS`;
    return {
      ...s,
      base,
      icms,
      pis,
      cofins,
      totalTax,
      effectiveLoad,
      rateLabel
    };
  });
});

async function submit() {
  error.value = '';
  loading.value = true;
  data.value = null;
  try {
    data.value = await fetchNfce(url.value);
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Erro ao consultar NFC-e';
  } finally {
    loading.value = false;
  }
}

function formatNumber(value: number | null) {
  if (value === null || Number.isNaN(value)) return '-';
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function runDemo() {
  url.value =
    'https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx?p=35251006057223031131650340000092251340165652|3|1';
  submit();
}

async function openCosmos(item: any) {
  cosmosModalOpen.value = true;
  cosmosLoading.value = true;
  cosmosError.value = '';
  cosmosData.value = null;
  cosmosEan.value = item.eanComercial || item.codigo || '';

  if (!cosmosEan.value) {
    cosmosLoading.value = false;
    cosmosError.value = 'Item sem EAN ou código para consultar no Cosmos.';
    return;
  }

  try {
    cosmosData.value = await fetchCosmosProduct(cosmosEan.value, item.descricao || undefined);
  } catch (err: any) {
    cosmosError.value = err?.response?.data?.message || err?.message || 'Erro ao consultar Cosmos';
  } finally {
    cosmosLoading.value = false;
  }
}

function closeCosmos() {
  cosmosModalOpen.value = false;
  cosmosLoading.value = false;
  cosmosError.value = '';
  cosmosData.value = null;
  cosmosEan.value = '';
}
</script>

<style scoped>
.nfce {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.nfce-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  margin: 4px 0;
}
.card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 20px;
  box-shadow: var(--shadow);
  transition: all 0.3s ease;
  animation: slideIn 0.3s ease;
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

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.input-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.input {
  flex: 1;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  font-size: 14px;
}

.btn {
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: #f5f7fb;
  cursor: pointer;
}

.btn.primary {
  background: linear-gradient(120deg, var(--primary), var(--primary-strong));
  color: #0c1829;
  border: none;
}

.error {
  color: #ef4444;
  margin: 6px 0 0;
}

.section-title {
  font-weight: 700;
  margin-bottom: 8px;
}

.big {
  font-size: 18px;
  font-weight: 700;
  margin: 4px 0;
}

.totals {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 8px;
}

.totals-row {
  display: flex;
  justify-content: space-between;
  background: rgba(0, 0, 0, 0.02);
  padding: 10px;
  border-radius: 10px;
  border: 1px solid var(--border);
}

.table {
  overflow-x: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.thead,
.trow {
  display: grid;
  grid-template-columns: 2fr repeat(12, 1fr);
  gap: 6px;
  align-items: center;
}
.trow {
  padding: 8px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.01);
}
.desc {
  font-weight: 600;
}
.btn.tiny {
  padding: 6px 8px;
  font-size: 12px;
}

.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: grid;
  place-items: center;
  z-index: 30;
  padding: 16px;
}
.modal-box {
  background: #fff;
  border-radius: 16px;
  padding: 18px;
  width: min(720px, 100%);
  max-height: 90vh;
  overflow-y: auto;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.cosmos-grid {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 12px;
}
.cosmos-grid img {
  width: 100%;
  border-radius: 12px;
  object-fit: cover;
  border: 1px solid var(--border);
}

.fiscal-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.fiscal-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}
.pill-toggle {
  display: inline-flex;
  border: 1px solid var(--border);
  border-radius: 999px;
  overflow: hidden;
}
.pill {
  padding: 8px 14px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-weight: 600;
}
.pill.active {
  background: rgba(91, 231, 196, 0.15);
  color: var(--primary);
}
.fiscal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
}
.fiscal-card-item {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px;
  background: rgba(0, 0, 0, 0.01);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.fiscal-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.chip {
  padding: 6px 10px;
  border-radius: 10px;
  background: rgba(91, 231, 196, 0.15);
  color: var(--primary);
  font-weight: 700;
  font-size: 12px;
}
.fiscal-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.metric {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fff;
}
.metric.total {
  grid-column: span 2;
  background: rgba(91, 231, 196, 0.1);
  border-color: rgba(91, 231, 196, 0.3);
}
.label {
  color: var(--muted);
  font-size: 12px;
}
.bar {
  height: 8px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 999px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  background: linear-gradient(120deg, var(--primary), var(--primary-strong));
}
.fiscal-footnote {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px dashed var(--border);
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.02);
}
.tiny {
  font-size: 12px;
}

@media (max-width: 900px) {
  .nfce-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  .input-row {
    flex-direction: column;
  }
  .input {
    width: 100%;
  }
  .cosmos-grid {
    grid-template-columns: 1fr;
  }
  .fiscal-metrics {
    grid-template-columns: 1fr;
  }
  .fiscal-footnote {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

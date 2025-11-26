<template>
  <div class="nfce">
    <header class="nfce-header">
      <div>
        <p class="eyebrow">NFC-e</p>
        <h2>Consulta por QR Code</h2>
        <p class="muted">Cole a URL completa do QR Code e visualize emitente, itens e totais.</p>
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
        <p class="big">{{ data.emitente.nome || '—' }}</p>
        <p class="muted">CNPJ: {{ data.emitente.cnpj || '—' }}</p>
        <p class="muted">{{ data.emitente.endereco || '—' }}</p>
      </div>

      <div class="card">
        <div class="section-title">Nota</div>
        <p class="muted">Número / Série</p>
        <p class="big">{{ data.info.numero || '—' }} / {{ data.info.serie || '—' }}</p>
        <p class="muted">Emissão: {{ data.info.emissao || '—' }}</p>
        <p class="muted">Protocolo: {{ data.info.protocolo || '—' }}</p>
        <p class="muted">Ambiente: {{ data.info.ambiente || '—' }}</p>
        <p class="muted">Chave: {{ data.chaveAcesso || '—' }}</p>
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
          <strong>{{ data.totais.pagamento.forma || '—' }}</strong>
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
          <span>{{ item.unidade || '—' }}</span>
          <span>R$ {{ formatNumber(item.valorUnitario) }}</span>
          <span>R$ {{ formatNumber(item.valorTotal) }}</span>
          <span>{{ item.ncm || '—' }}</span>
          <span>{{ item.cest || '—' }}</span>
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
import { ref } from 'vue';
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
  if (value === null || Number.isNaN(value)) return '—';
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
  padding: 14px 16px;
  box-shadow: var(--shadow);
}
.label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
}
.input-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
}
.input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
}
.btn {
  border: 1px solid var(--border);
  padding: 10px 12px;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
}
.btn.tiny {
  padding: 6px 8px;
  font-size: 12px;
}
.btn.primary {
  background: var(--primary);
  color: #0f172a;
  border-color: var(--primary);
}
.section-title {
  font-weight: 700;
  margin-bottom: 10px;
}
.grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}
.big {
  font-size: 16px;
  font-weight: 700;
  margin: 2px 0;
}
.totals {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.totals-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.table {
  width: 100%;
  overflow-x: auto;
}
.thead,
.trow {
  display: grid;
  grid-template-columns: 2fr 0.9fr 0.7fr 0.7fr 1fr 1fr 1fr 0.9fr 0.9fr 0.8fr 0.8fr 0.8fr 0.9fr 1fr;
  gap: 8px;
  padding: 10px 8px;
  border-bottom: 1px solid var(--border);
}
.thead {
  font-weight: 700;
  color: var(--muted);
}
.trow {
  align-items: center;
}
.desc {
  font-weight: 600;
}
.error {
  color: #ef4444;
  margin-top: 8px;
}
.cosmos-box {
  width: min(760px, 95%);
}
.cosmos-grid {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 14px;
  align-items: flex-start;
}
.cosmos-grid img {
  width: 100%;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: #f8fafc;
}
.cosmos-info h4 {
  margin: 0 0 6px;
}
.cosmos-info p {
  margin: 6px 0;
}
@media (max-width: 960px) {
  .nfce-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  .input-row {
    grid-template-columns: 1fr;
  }
  .thead,
  .trow {
    grid-template-columns: 2fr 1fr;
    grid-template-areas:
      "desc desc"
      "meta meta";
  }
}
</style>

<template>
  <div class="page">
    <header class="page-header">
      <div>
        <h2>Produtos Não Encontrados</h2>
        <p class="subtitle">Códigos escaneados que não foram cadastrados nem localizados na base externa. Valide um a um.</p>
      </div>
      <div class="filters">
        <select v-model="statusFilter" @change="fetchPending">
          <option value="PENDING">Pendentes</option>
          <option value="RESOLVED">Resolvidos</option>
          <option value="IGNORED">Ignorados</option>
          <option value="all">Todos</option>
        </select>
        <select v-model="locationFilter">
          <option value="all">Todas as lojas</option>
          <option v-for="loc in locationOptions" :key="loc" :value="loc">{{ loc }}</option>
        </select>
        <button class="btn" @click="fetchPending">Atualizar</button>
      </div>
    </header>

    <div v-if="loading" class="state">Carregando...</div>
    <div v-else-if="!items.length" class="state empty">
      <div class="empty-icon">✅</div>
      <p>Nenhum produto pendente. Tudo validado!</p>
    </div>

    <template v-else>
      <div v-if="!groupedItems.length" class="state empty">
        <div class="empty-icon">🔍</div>
        <p>Nenhuma pendência para esta loja.</p>
      </div>
      <section v-for="group in groupedItems" :key="group.location" class="group">
        <h3 class="group-title">
          {{ group.location }}<span class="group-count">{{ group.list.length }}</span>
        </h3>
        <div class="list">
          <div v-for="item in group.list" :key="item._id" class="card">
        <div class="card-head">
          <div class="barcode-block">
            <img
              :src="`https://cdn-cosmos.bluesoft.com.br/products/${item.barcode}`"
              class="thumb"
              @error="onImgError"
              alt=""
            />
            <div>
              <div class="barcode">{{ item.barcode }}</div>
              <div class="meta">
                Visto {{ item.count }}x · Última vez {{ formatDate(item.lastSeenAt) }}
                <span v-if="item.location"> · {{ item.location }}</span>
              </div>
            </div>
          </div>
          <span :class="['status-badge', `st-${item.status}`]">{{ statusLabel(item.status) }}</span>
        </div>

        <div v-if="item.status === 'PENDING'" class="form">
          <div class="field">
            <label>Nome do produto *</label>
            <input v-model="forms[item._id].name" placeholder="Ex.: Refrigerante 2L" />
          </div>
          <div class="row">
            <div class="field">
              <label>Categoria *</label>
              <select v-model="forms[item._id].category">
                <option value="">Selecione...</option>
                <option v-for="c in categories" :key="c._id" :value="c._id">{{ c.name }}</option>
              </select>
            </div>
            <div class="field">
              <label>Custo (R$)</label>
              <input type="number" step="0.01" v-model.number="forms[item._id].costPrice" />
            </div>
            <div class="field">
              <label>Venda (R$) *</label>
              <input type="number" step="0.01" v-model.number="forms[item._id].salePrice" />
            </div>
          </div>
          <div class="actions">
            <button class="btn btn-danger" @click="deleteItem(item)" :disabled="savingId === item._id">Excluir</button>
            <button class="btn btn-ghost" @click="ignoreItem(item)" :disabled="savingId === item._id">Ignorar</button>
            <button class="btn btn-primary" @click="resolveItem(item)" :disabled="savingId === item._id">
              {{ savingId === item._id ? 'Salvando...' : 'Validar e cadastrar' }}
            </button>
          </div>
        </div>

        <div v-else class="resolved-info">
          <span v-if="item.resolvedProduct">Cadastrado como: <strong>{{ item.resolvedProduct.name }}</strong></span>
          <span v-else>Ignorado</span>
          <button class="btn btn-danger btn-sm" @click="deleteItem(item)" :disabled="savingId === item._id">Excluir</button>
        </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import api from '../../services/api';

interface PendingProduct {
  _id: string;
  barcode: string;
  count: number;
  lastSeenAt: string;
  location?: string;
  status: 'PENDING' | 'RESOLVED' | 'IGNORED';
  resolvedProduct?: { name: string } | null;
}

interface Category {
  _id: string;
  name: string;
}

const items = ref<PendingProduct[]>([]);
const categories = ref<Category[]>([]);
const forms = reactive<Record<string, { name: string; category: string; costPrice: number | null; salePrice: number | null }>>({});
const loading = ref(false);
const savingId = ref<string | null>(null);
const statusFilter = ref('PENDING');
const locationFilter = ref('all');

const locationOptions = computed(() => {
  const set = new Set<string>();
  items.value.forEach((it) => set.add(it.location || 'default'));
  return Array.from(set).sort();
});

const groupedItems = computed(() => {
  const filtered = locationFilter.value === 'all'
    ? items.value
    : items.value.filter((it) => (it.location || 'default') === locationFilter.value);
  const map = new Map<string, PendingProduct[]>();
  filtered.forEach((it) => {
    const loc = it.location || 'default';
    if (!map.has(loc)) map.set(loc, []);
    map.get(loc)!.push(it);
  });
  return Array.from(map.entries()).map(([location, list]) => ({ location, list }));
});

function ensureForm(item: PendingProduct) {
  if (!forms[item._id]) {
    forms[item._id] = { name: '', category: '', costPrice: null, salePrice: null };
  }
}

async function fetchPending() {
  loading.value = true;
  try {
    const { data } = await api.get('/pending-products', { params: { status: statusFilter.value } });
    items.value = data;
    data.forEach((it: PendingProduct) => ensureForm(it));
  } catch (e) {
    console.error('[NOT-FOUND] Erro ao buscar pendências', e);
  } finally {
    loading.value = false;
  }
}

async function fetchCategories() {
  try {
    const { data } = await api.get('/categories');
    categories.value = data;
  } catch (e) {
    console.error('[NOT-FOUND] Erro ao buscar categorias', e);
  }
}

async function resolveItem(item: PendingProduct) {
  const form = forms[item._id];
  if (!form.name.trim()) return alert('Informe o nome do produto.');
  if (!form.category) return alert('Selecione uma categoria.');
  if (!form.salePrice || form.salePrice <= 0) return alert('Informe o preço de venda.');

  savingId.value = item._id;
  try {
    await api.post(`/pending-products/${item._id}/resolve`, {
      name: form.name.trim(),
      barcode: item.barcode,
      category: form.category,
      costPrice: form.costPrice || 0,
      salePrice: form.salePrice,
    });
    await fetchPending();
  } catch (e: any) {
    alert(e?.response?.data?.message || 'Erro ao cadastrar produto.');
  } finally {
    savingId.value = null;
  }
}

async function ignoreItem(item: PendingProduct) {
  if (!confirm('Ignorar este código? Ele sairá da lista de pendentes.')) return;
  savingId.value = item._id;
  try {
    await api.post(`/pending-products/${item._id}/ignore`);
    await fetchPending();
  } catch (e) {
    alert('Erro ao ignorar.');
  } finally {
    savingId.value = null;
  }
}

async function deleteItem(item: PendingProduct) {
  if (!confirm('Excluir definitivamente este código? Esta ação não pode ser desfeita.')) return;
  savingId.value = item._id;
  try {
    await api.delete(`/pending-products/${item._id}`);
    items.value = items.value.filter((i) => i._id !== item._id);
  } catch (e) {
    alert('Erro ao excluir.');
  } finally {
    savingId.value = null;
  }
}

function onImgError(e: Event) {
  (e.target as HTMLImageElement).style.visibility = 'hidden';
}

function statusLabel(s: string) {
  return s === 'PENDING' ? 'Pendente' : s === 'RESOLVED' ? 'Resolvido' : 'Ignorado';
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

onMounted(() => {
  fetchCategories();
  fetchPending();
});
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  overflow-y: auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
}

.subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--muted);
  max-width: 560px;
}

.filters {
  display: flex;
  gap: 8px;
  align-items: center;
}

.filters select {
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: #fff;
}

.btn {
  border: 1px solid var(--border);
  padding: 8px 14px;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  font-weight: 500;
}

.btn-ghost {
  background: transparent;
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary), var(--primary-strong));
  color: #0c1829;
  border: none;
  font-weight: 600;
}

.btn-danger {
  border-color: rgba(220, 38, 38, 0.4);
  color: #b91c1c;
}

.btn-danger:hover:not(:disabled) {
  background: rgba(220, 38, 38, 0.1);
}

.btn-sm {
  padding: 5px 10px;
  font-size: 12px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.state {
  padding: 32px;
  text-align: center;
  color: var(--muted);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 8px;
}

.group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 18px;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.group-count {
  background: var(--border);
  color: var(--muted);
  border-radius: 999px;
  padding: 1px 9px;
  font-size: 12px;
  font-weight: 600;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card {
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.02);
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.barcode-block {
  display: flex;
  gap: 12px;
  align-items: center;
}

.thumb {
  width: 48px;
  height: 48px;
  object-fit: contain;
  border-radius: 8px;
  background: #fff;
  border: 1px solid var(--border);
}

.barcode {
  font-family: monospace;
  font-size: 16px;
  font-weight: 600;
}

.meta {
  font-size: 12px;
  color: var(--muted);
  margin-top: 2px;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.st-PENDING {
  background: rgba(245, 158, 11, 0.15);
  color: #b45309;
}

.st-RESOLVED {
  background: rgba(34, 197, 94, 0.15);
  color: #15803d;
}

.st-IGNORED {
  background: rgba(148, 163, 184, 0.2);
  color: #475569;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field label {
  font-size: 12px;
  color: var(--muted);
  font-weight: 500;
}

.field input,
.field select {
  padding: 9px 10px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: #fff;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.resolved-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  color: var(--muted);
}

@media (max-width: 720px) {
  .row {
    grid-template-columns: 1fr;
  }
}
</style>

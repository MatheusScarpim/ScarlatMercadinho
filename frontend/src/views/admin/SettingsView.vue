<template>
  <div class="settings">
    <header class="header">
      <div>
        <p class="eyebrow">Configurações</p>
        <h3>Preferências da loja</h3>
        <p class="muted">Defina a margem padrão aplicada sobre o custo das entradas.</p>
      </div>
      <button class="btn" type="button" @click="load" :disabled="loading">Recarregar</button>
    </header>

    <form class="card" @submit.prevent="saveMarginValue">
      <label class="label">Margem padrão (%)</label>
      <div class="input-row">
        <input v-model.number="margin" type="number" min="0" step="0.1" required />
        <button class="btn primary" type="submit" :disabled="loading">Salvar</button>
      </div>
      <p class="muted small">Usada para sugerir preço de venda nas entradas.</p>
      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="saved" class="success">Margem salva.</p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { fetchMargin, saveMargin } from '../../services/settings';

const margin = ref(0);
const loading = ref(false);
const error = ref('');
const saved = ref(false);

async function load() {
  loading.value = true;
  error.value = '';
  saved.value = false;
  try {
    margin.value = await fetchMargin();
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Erro ao carregar margem';
  } finally {
    loading.value = false;
  }
}

async function saveMarginValue() {
  loading.value = true;
  error.value = '';
  saved.value = false;
  try {
    margin.value = await saveMargin(margin.value);
    saved.value = true;
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Erro ao salvar margem';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.header {
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
}
.muted.small {
  font-size: 13px;
  margin-top: 6px;
}
.card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px;
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
input {
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
.btn.primary {
  background: var(--primary);
  color: #0f172a;
  border-color: var(--primary);
}
.error {
  color: #ef4444;
  margin-top: 8px;
}
.success {
  color: #16a34a;
  margin-top: 8px;
}
</style>

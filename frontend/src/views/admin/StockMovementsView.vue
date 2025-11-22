<template>
  <div>
    <h3>Movimentações de estoque</h3>
    <div class="filters glass">
      <select v-model="type" @change="load">
        <option value="">Todos</option>
        <option value="ENTRY">Entrada</option>
        <option value="EXIT">Saída</option>
        <option value="ADJUSTMENT">Ajuste</option>
      </select>
      <select v-model="location" @change="load">
        <option value="">Todos os locais</option>
        <option v-for="loc in locations" :key="loc._id" :value="loc.code">
          {{ loc.name }} ({{ loc.code }})
        </option>
      </select>
      <input v-model="productId" placeholder="ID do produto" @keyup.enter="load" />
      <button class="btn btn-primary" @click="load">Filtrar</button>
    </div>
    <div class="card glass table-card">
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Produto</th>
            <th>Tipo</th>
            <th>Quantidade</th>
            <th>Motivo</th>
            <th>Local</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in movements" :key="m._id">
            <td>{{ formatDate(m.createdAt) }}</td>
            <td>{{ m.product?.name }}</td>
            <td>{{ typeLabel(m.type) }}</td>
            <td>{{ m.quantity }}</td>
            <td>{{ m.reason }}</td>
            <td>{{ m.location || 'default' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import api from '../../services/api';

const movements = ref<any[]>([]);
const type = ref('');
const productId = ref('');
const locations = ref<any[]>([]);
const location = ref('');

async function load() {
  const { data } = await api.get('/stock-movements', {
    params: {
      type: type.value || undefined,
      productId: productId.value || undefined,
      location: location.value || undefined
    }
  });
  movements.value = data;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString();
}
function typeLabel(t: string) {
  const map: Record<string, string> = { ENTRY: 'Entrada', EXIT: 'Saída', ADJUSTMENT: 'Ajuste' };
  return map[t] || t;
}

async function loadRefs() {
  const { data } = await api.get('/locations');
  locations.value = data;
}

onMounted(() => {
  loadRefs();
  load();
});
</script>

<style scoped>
.filters {
  display: flex;
  gap: 10px;
  margin: 12px 0;
  padding: 12px;
  border-radius: var(--radius);
}
.card {
  margin-top: 8px;
  padding: 0;
}
</style>

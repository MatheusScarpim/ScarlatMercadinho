<template>
  <div>
    <div class="header">
      <h3>Categorias</h3>
      <div class="header-actions">
        <button class="btn btn-ghost" @click="exportCategories">Exportar Excel</button>
        <button class="btn btn-primary" @click="openForm">Nova categoria</button>
      </div>
    </div>
    <div class="card glass table-card">
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in categories" :key="c._id">
            <td>{{ c.name }}</td>
            <td><button class="btn btn-ghost" @click="toggle(c)">{{ c.active ? 'Ativo' : 'Inativo' }}</button></td>
          </tr>
        </tbody>
      </table>
    </div>

    <BaseModal :open="showForm" title="Nova categoria" :onClose="closeForm">
      <form @submit.prevent="save" class="form-grid modal-form">
        <label class="span-2">Nome<input v-model="form.name" placeholder="Nome" required /></label>
        <div class="modal-actions span-2">
          <button class="btn btn-ghost" type="button" @click="closeForm">Cancelar</button>
          <button class="btn btn-primary" type="submit">Salvar</button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import api from '../../services/api';
import BaseModal from '../../components/BaseModal.vue';
import { exportToCsv } from '../../utils/export';

const categories = ref<any[]>([]);
const form = reactive({ name: '' });
const showForm = ref(false);

async function load() {
  const { data } = await api.get('/categories');
  categories.value = data;
}

async function save() {
  await api.post('/categories', form);
  form.name = '';
  await load();
  closeForm();
}

async function toggle(c: any) {
  await api.put(`/categories/${c._id}`, { active: !c.active });
  await load();
}

onMounted(load);

async function exportCategories() {
  const { data } = await api.get('/categories');
  const headers = ['Nome', 'Status'];
  const rows = data.map((c: any) => [c.name, c.active ? 'Ativo' : 'Inativo']);
  exportToCsv('categorias.csv', headers, rows);
}

function openForm() {
  showForm.value = true;
}
function closeForm() {
  showForm.value = false;
}
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.card {
  margin-top: 12px;
  padding: 0;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}
.modal-form {
  gap: 14px;
}
.span-2 {
  grid-column: span 2;
}
.form-grid input,
.form-grid select {
  width: 100%;
}
.modal-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>

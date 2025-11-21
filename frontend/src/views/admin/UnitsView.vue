<template>
  <div>
    <div class="header">
      <h3>Unidades</h3>
      <button class="btn btn-primary" @click="openForm">Nova unidade</button>
    </div>
    <div class="card glass table-card">
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Sigla</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in units" :key="u._id">
            <td>{{ u.name }}</td>
            <td>{{ u.abbreviation }}</td>
            <td>
              <button class="btn btn-ghost" @click="toggle(u)">{{ u.active ? 'Ativo' : 'Inativo' }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <BaseModal :open="showForm" title="Nova unidade" :onClose="closeForm">
      <form @submit.prevent="save" class="form-grid modal-form">
        <label class="span-2">Nome<input v-model="form.name" required /></label>
        <label>Sigla<input v-model="form.abbreviation" required /></label>
        <div class="modal-actions">
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

const units = ref<any[]>([]);
const form = reactive({ name: '', abbreviation: '' });
const showForm = ref(false);

async function load() {
  const { data } = await api.get('/units');
  units.value = data;
}

async function save() {
  await api.post('/units', form);
  form.name = '';
  form.abbreviation = '';
  await load();
  closeForm();
}

async function toggle(u: any) {
  await api.put(`/units/${u._id}`, { active: !u.active });
  await load();
}

onMounted(load);

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
  gap: 12px;
  justify-content: space-between;
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

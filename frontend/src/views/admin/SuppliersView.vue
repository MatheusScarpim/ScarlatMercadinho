<template>
  <div>
    <div class="header">
      <h3>Fornecedores</h3>
      <div class="header-actions">
        <button class="btn btn-ghost" @click="exportSuppliers">Exportar Excel</button>
        <button class="btn btn-primary" @click="openForm">Novo fornecedor</button>
      </div>
    </div>
    <div class="card glass table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Contato</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in suppliers" :key="s._id">
            <td>{{ s.name }}</td>
            <td>{{ s.phone || s.email }}</td>
            <td><button class="btn btn-ghost" @click="toggle(s)">{{ s.active ? 'Ativo' : 'Inativo' }}</button></td>
          </tr>
        </tbody>
      </table>
    </div>

    <BaseModal :open="showForm" title="Novo fornecedor" :onClose="closeForm">
      <form @submit.prevent="save" class="grid modal-form">
        <label class="span-2">Nome<input v-model="form.name" required /></label>
        <label>CNPJ<input v-model="form.cnpj" /></label>
        <label>Telefone<input v-model="form.phone" /></label>
        <label>Email<input v-model="form.email" type="email" /></label>
        <label>Contato<input v-model="form.contactName" /></label>
        <label class="span-2">Observações<input v-model="form.notes" /></label>
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

const suppliers = ref<any[]>([]);
const showForm = ref(false);
const form = reactive<any>({
  name: '',
  cnpj: '',
  phone: '',
  email: '',
  contactName: '',
  notes: ''
});

async function load() {
  const { data } = await api.get('/suppliers');
  suppliers.value = data;
}

async function save() {
  await api.post('/suppliers', form);
  showForm.value = false;
  await load();
}

async function toggle(s: any) {
  await api.put(`/suppliers/${s._id}`, { active: !s.active });
  await load();
}

onMounted(load);

async function exportSuppliers() {
  const { data } = await api.get('/suppliers');
  const headers = ['Nome', 'Contato', 'Email', 'Telefone', 'Status'];
  const rows = data.map((s: any) => [
    s.name,
    s.contactName || '-',
    s.email || '-',
    s.phone || '-',
    s.active ? 'Ativo' : 'Inativo'
  ]);
  exportToCsv('fornecedores.csv', headers, rows);
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
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.glass {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border);
  backdrop-filter: blur(14px);
  box-shadow: var(--shadow);
  border-radius: var(--radius);
}
.card {
  margin-top: 12px;
  padding: 16px;
  border-radius: 14px;
}
.grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}
.modal-form {
  gap: 14px;
}
.span-2 {
  grid-column: span 2;
}
.grid input,
.grid select {
  width: 100%;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  padding: 10px;
  text-align: left;
}
thead {
  color: var(--muted);
}
.table-wrap {
  padding: 0;
}
table tr + tr td {
  border-top: 1px solid var(--border);
}
.modal-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>

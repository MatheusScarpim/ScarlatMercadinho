<template>
  <div>
    <div class="header">
      <h3>Locais</h3>
      <button class="btn btn-primary" @click="openForm">Novo local</button>
    </div>

    <div class="card glass table-card">
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Código</th>
            <th>Descrição</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="loc in locations" :key="loc._id">
            <td>{{ loc.name }}</td>
            <td>{{ loc.code }}</td>
            <td>{{ loc.description || '—' }}</td>
            <td>
              <span :class="['badge', loc.active ? 'active' : 'inactive']">{{ loc.active ? 'Ativo' : 'Inativo' }}</span>
            </td>
            <td class="actions-cell">
              <button class="btn btn-ghost" @click="goToStock(loc)">Ver estoque</button>
              <button class="btn btn-ghost" @click="startEdit(loc)">Editar</button>
              <button class="btn btn-ghost alert" @click="toggle(loc)">{{ loc.active ? 'Inativar' : 'Ativar' }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <BaseModal :open="showForm" :title="editingId ? 'Editar local' : 'Novo local'" :onClose="closeForm">
      <form @submit.prevent="save" class="form-grid modal-form">
        <label class="span-2">
          Nome
          <input v-model="form.name" required />
        </label>
        <label>
          Código
          <input v-model="form.code" required maxlength="12" @input="form.code = form.code.toUpperCase().trim()" />
        </label>
        <label class="span-2">
          Descrição
          <textarea v-model="form.description" rows="2" placeholder="Opcional"></textarea>
        </label>
        <div class="checkbox-row">
          <input type="checkbox" v-model="form.active" />
          <span>Ativo</span>
        </div>
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
import { useRouter } from 'vue-router';
import api from '../../services/api';
import BaseModal from '../../components/BaseModal.vue';

const router = useRouter();

const locations = ref<any[]>([]);
const showForm = ref(false);
const editingId = ref<string | null>(null);
const form = reactive<any>({
  name: '',
  code: '',
  description: '',
  active: true
});

async function load() {
  const { data } = await api.get('/locations');
  locations.value = data;
}

function openForm() {
  showForm.value = true;
  editingId.value = null;
  Object.assign(form, { name: '', code: '', description: '', active: true });
}

function closeForm() {
  showForm.value = false;
  editingId.value = null;
}

function startEdit(loc: any) {
  editingId.value = loc._id;
  Object.assign(form, {
    name: loc.name,
    code: loc.code,
    description: loc.description || '',
    active: loc.active
  });
  showForm.value = true;
}

async function save() {
  const payload = { ...form, code: form.code.toUpperCase().trim() };
  if (editingId.value) {
    await api.put(`/locations/${editingId.value}`, payload);
  } else {
    await api.post('/locations', payload);
  }
  await load();
  closeForm();
}

async function toggle(loc: any) {
  await api.put(`/locations/${loc._id}`, { active: !loc.active });
  await load();
}

function goToStock(loc: any) {
  router.push({ path: '/admin/products', query: { location: loc.code } });
}

onMounted(load);
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.card {
  margin-top: 12px;
  padding: 16px;
}
.actions-cell {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.btn-ghost.alert {
  border-color: #ef4444;
  color: #ef4444;
}
.badge {
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 12px;
}
.badge.active {
  background: rgba(16, 180, 157, 0.15);
  color: var(--primary);
}
.badge.inactive {
  background: #e5e7eb;
  color: #6b7280;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}
.span-2 {
  grid-column: span 2;
}
.modal-form textarea {
  width: 100%;
  resize: vertical;
}
.checkbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>

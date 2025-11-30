<template>
  <div>
    <div class="header">
      <h3>Categorias</h3>
      <div class="header-actions">
        <button class="btn btn-ghost" @click="exportCategories">Exportar Excel</button>
        <button class="btn btn-primary" @click="openForm">Nova categoria</button>
      </div>
    </div>

    <div class="categories-grid">
      <div class="category-card glass" v-for="c in categories" :key="c._id" :class="{ inactive: !c.active }">
        <div class="category-icon">
          <svg viewBox="0 0 24 24" fill="none" class="icon">
            <path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="category-content">
          <h4 class="category-name">{{ c.name }}</h4>
          <div class="category-status">
            <span :class="['badge', c.active ? 'active' : 'inactive']">
              {{ c.active ? 'Ativo' : 'Inativo' }}
            </span>
          </div>
        </div>
        <div class="category-actions">
          <button class="btn btn-ghost btn-icon" @click="toggle(c)" :title="c.active ? 'Inativar' : 'Ativar'">
            <svg viewBox="0 0 20 20" fill="none" class="action-icon" v-if="c.active">
              <rect x="4" y="8.5" width="12" height="9" rx="2" stroke="currentColor" stroke-width="1.5"/>
              <path d="M7 8V6.5a3 3 0 0 1 6 0V8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <svg viewBox="0 0 20 20" fill="none" class="action-icon" v-else>
              <rect x="4" y="8.5" width="12" height="9" rx="2" stroke="currentColor" stroke-width="1.5"/>
              <path d="M10 6.5c0-1.38 1.12-2.5 2.5-2.5S15 5.12 15 6.5V8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M5 8V6.5A3.5 3.5 0 0 1 11.6 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>
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

/* Categories Grid */
.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.category-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-radius: var(--radius);
  transition: all 0.3s ease;
  position: relative;
}

.category-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(91, 231, 196, 0.15);
}

.category-card.inactive {
  opacity: 0.6;
}

.category-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--primary), var(--primary-strong));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.category-icon .icon {
  width: 28px;
  height: 28px;
  color: #0c1829;
}

.category-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-name {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
}

.category-status .badge {
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  display: inline-block;
}

.badge.active {
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #22c55e;
}

.badge.inactive {
  background: rgba(156, 163, 175, 0.15);
  border: 1px solid rgba(156, 163, 175, 0.3);
  color: #9ca3af;
}

.category-actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  width: 40px;
  height: 40px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
}

.action-icon {
  width: 20px;
  height: 20px;
}

/* Form */
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

/* Responsive */
@media (max-width: 768px) {
  .categories-grid {
    grid-template-columns: 1fr;
  }

  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }
}
</style>

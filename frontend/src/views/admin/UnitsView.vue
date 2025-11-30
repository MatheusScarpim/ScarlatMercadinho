<template>
  <div>
    <div class="header">
      <h3>Unidades</h3>
      <div class="header-actions">
        <button class="btn btn-ghost" @click="exportUnits">Exportar Excel</button>
        <button class="btn btn-primary" @click="openForm">Nova unidade</button>
      </div>
    </div>
    <div class="units-grid">
      <div class="unit-card glass" v-for="u in units" :key="u._id" :class="{ inactive: !u.active }">
        <div class="unit-icon">
          <svg viewBox="0 0 24 24" fill="none" class="icon">
            <path d="M9 3H5a2 2 0 00-2 2v4m6-6h6m-6 6V3m0 6h6m0-6v6m0-6h4a2 2 0 012 2v4M3 13v4a2 2 0 002 2h4m-6-6h6m0 0v6m0-6h6m6 0v-4m0 4v4a2 2 0 01-2 2h-4m6-6h-6m0 0v6"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="unit-content">
          <div class="unit-header">
            <h4 class="unit-name">{{ u.name }}</h4>
            <div class="unit-abbr">{{ u.abbreviation }}</div>
          </div>
          <span :class="['badge', u.active ? 'active' : 'inactive']">
            {{ u.active ? 'Ativo' : 'Inativo' }}
          </span>
        </div>
        <div class="unit-actions">
          <button class="btn btn-ghost btn-icon" @click="toggle(u)" :title="u.active ? 'Inativar' : 'Ativar'">
            <svg viewBox="0 0 20 20" fill="none" class="action-icon" v-if="u.active">
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
import { exportToCsv } from '../../utils/export';

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

async function exportUnits() {
  const { data } = await api.get('/units', { params: { page: 1, limit: 2000 } });
  const headers = ['Nome', 'Sigla', 'Status'];
  const rows = data.map((u: any) => [u.name, u.abbreviation, u.active ? 'Ativo' : 'Inativo']);
  exportToCsv('unidades.csv', headers, rows);
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
  gap: 12px;
  justify-content: space-between;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Units Grid */
.units-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.unit-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-radius: var(--radius);
  transition: all 0.3s ease;
  position: relative;
}

.unit-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(91, 231, 196, 0.15);
}

.unit-card.inactive {
  opacity: 0.6;
}

.unit-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--primary), var(--primary-strong));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.unit-icon .icon {
  width: 28px;
  height: 28px;
  color: #0c1829;
}

.unit-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.unit-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.unit-name {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
}

.unit-abbr {
  padding: 4px 10px;
  background: rgba(91, 231, 196, 0.1);
  border: 1px solid rgba(91, 231, 196, 0.3);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--primary);
  font-family: 'Courier New', monospace;
}

.badge {
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

.unit-actions {
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
  .units-grid {
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

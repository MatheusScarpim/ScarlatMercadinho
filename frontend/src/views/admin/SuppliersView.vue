<template>
  <div>
    <div class="header">
      <h3>Fornecedores</h3>
      <div class="header-actions">
        <button class="btn btn-ghost" @click="exportSuppliers">Exportar Excel</button>
        <button class="btn btn-primary" @click="openForm">Novo fornecedor</button>
      </div>
    </div>
    <div class="suppliers-grid">
      <div class="supplier-card glass" v-for="s in suppliers" :key="s._id" :class="{ inactive: !s.active }">
        <div class="supplier-icon">
          <svg viewBox="0 0 24 24" fill="none" class="icon">
            <path d="M21 10c0-1.1-.9-2-2-2h-3c-1.1 0-2 .9-2 2v10h7v-10zM3 10c0-1.1.9-2 2-2h3c1.1 0 2 .9 2 2v10H3V10zm6-8h6v4h-6V2z"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="supplier-content">
          <div class="supplier-header">
            <h4 class="supplier-name">{{ s.name }}</h4>
            <span :class="['badge', s.active ? 'active' : 'inactive']">
              {{ s.active ? 'Ativo' : 'Inativo' }}
            </span>
          </div>
          <div class="supplier-details">
            <div class="detail-item" v-if="s.phone">
              <svg viewBox="0 0 20 20" fill="none" class="detail-icon">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"
                      stroke="currentColor" stroke-width="1.5"/>
              </svg>
              <span>{{ s.phone }}</span>
            </div>
            <div class="detail-item" v-if="s.email">
              <svg viewBox="0 0 20 20" fill="none" class="detail-icon">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" fill="currentColor" opacity="0.3"/>
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" stroke="currentColor" stroke-width="1.5"/>
              </svg>
              <span>{{ s.email }}</span>
            </div>
            <div class="detail-item" v-if="s.contactName">
              <svg viewBox="0 0 20 20" fill="none" class="detail-icon">
                <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                      stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>{{ s.contactName }}</span>
            </div>
          </div>
        </div>
        <div class="supplier-actions">
          <button class="btn btn-ghost btn-icon" @click="toggle(s)" :title="s.active ? 'Inativar' : 'Ativar'">
            <svg viewBox="0 0 20 20" fill="none" class="action-icon" v-if="s.active">
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

/* Suppliers Grid */
.suppliers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.supplier-card {
  display: flex;
  gap: 16px;
  padding: 20px;
  border-radius: var(--radius);
  transition: all 0.3s ease;
  position: relative;
}

.supplier-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(91, 231, 196, 0.15);
}

.supplier-card.inactive {
  opacity: 0.6;
}

.supplier-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--primary), var(--primary-strong));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.supplier-icon .icon {
  width: 28px;
  height: 28px;
  color: #0c1829;
}

.supplier-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.supplier-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.supplier-name {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
  flex: 1;
}

.badge {
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
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

.supplier-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--muted);
}

.detail-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--primary);
}

.supplier-actions {
  display: flex;
  align-items: flex-start;
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
  flex-shrink: 0;
}

.action-icon {
  width: 20px;
  height: 20px;
}

/* Form */
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
.modal-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* Responsive */
@media (max-width: 768px) {
  .suppliers-grid {
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

  .supplier-card {
    flex-direction: column;
  }

  .supplier-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>

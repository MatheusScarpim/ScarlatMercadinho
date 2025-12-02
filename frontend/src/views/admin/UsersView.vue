<template>
  <div class="users-view">
    <header class="page-header">
      <div>
        <p class="eyebrow">acessos</p>
        <h2>Usuarios e Permissoes</h2>
        <p class="muted">Controle quem pode acessar cada area do backoffice.</p>
      </div>
      <div class="actions">
        <button class="btn ghost" @click="loadData" :disabled="loading">Recarregar</button>
        <button class="btn primary" @click="startCreate">Novo usuario</button>
      </div>
    </header>

    <section class="panel glass">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Equipe</p>
          <h4>Lista de usuarios</h4>
        </div>
        <div class="filters">
          <select v-model="statusFilter" class="select">
            <option value="all">Todos</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
          <input
            type="search"
            v-model="search"
            class="search"
            placeholder="Buscar por nome ou e-mail"
          />
        </div>
      </div>

      <div class="list" v-if="filteredUsers.length">
        <article v-for="u in filteredUsers" :key="u.id" class="user-card">
          <div class="user-main">
            <div>
              <h5>{{ u.name }}</h5>
              <p class="muted email">{{ u.email }}</p>
            </div>
            <div class="tags">
              <span class="pill" :class="u.role.toLowerCase()">{{ roleLabel(u.role) }}</span>
              <span v-if="!u.active" class="pill danger">Inativo</span>
            </div>
          </div>
          <div class="permissions-line">
            <template v-if="u.permissions.length">
              <span v-for="perm in u.permissions" :key="perm" class="permission-pill">
                {{ permissionLabel(perm) }}
              </span>
            </template>
            <span v-else class="permission-pill muted">Sem acesso</span>
          </div>
          <div class="card-actions">
            <button class="btn ghost" @click="editUser(u)">Editar</button>
            <button
              class="btn ghost danger"
              v-if="u.active && u.role !== 'ADMIN'"
              @click="disableUser(u)"
            >
              Desativar
            </button>
          </div>
        </article>
      </div>
      <div class="empty" v-else>
        <div class="empty-icon">👥</div>
        <p class="empty-title">Nenhum usuario encontrado</p>
        <p class="empty-subtitle">Cadastre alguem ou ajuste o filtro de busca.</p>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="showModal" class="modal">
        <div class="modal-box glass">
          <div class="modal-header">
            <div>
              <p class="eyebrow">{{ formMode === 'edit' ? 'Editar' : 'Novo' }}</p>
              <h3>{{ formMode === 'edit' ? 'Atualizar usuario' : 'Criar usuario' }}</h3>
            </div>
            <button class="btn ghost" @click="closeModal">Fechar</button>
          </div>

          <form class="form" @submit.prevent="submitForm">
            <div class="modal-grid">
              <div class="section-card">
                <div class="section-head">
                  <div>
                    <p class="eyebrow">Identificacao</p>
                    <h5>Dados basicos</h5>
                  </div>
                </div>
                <div class="form-row">
                  <div class="field">
                    <label>Nome</label>
                    <input
                      v-model="form.name"
                      placeholder="Nome completo"
                      required
                      @blur="validateField('name')"
                    />
                    <p v-if="fieldErrors.name" class="error">{{ fieldErrors.name }}</p>
                  </div>
                  <div class="field">
                    <label>E-mail</label>
                    <input
                      v-model="form.email"
                      type="email"
                      placeholder="email@empresa.com"
                      required
                      @blur="validateField('email')"
                    />
                    <p v-if="fieldErrors.email" class="error">{{ fieldErrors.email }}</p>
                  </div>
                </div>
                <div class="form-row">
                  <div class="field">
                    <label>Senha</label>
                    <input
                      v-model="form.password"
                      type="password"
                      :placeholder="formMode === 'edit' ? 'Preencha para trocar' : 'Senha temporaria'"
                      :required="formMode === 'create'"
                      @blur="validateField('password')"
                    />
                    <p class="hint" v-if="formMode === 'edit'">Deixe vazio para manter a senha atual.</p>
                    <p v-if="fieldErrors.password" class="error">{{ fieldErrors.password }}</p>
                  </div>
                  <div class="field">
                    <label>Perfil</label>
                    <select v-model="form.role" :disabled="formMode === 'edit' && form.role === 'ADMIN'">
                      <option value="ADMIN">Administrador</option>
                      <option value="STAFF">Operador</option>
                    </select>
                  </div>
              <div class="field checkbox">
                <label class="checkbox-inline">
                  <input type="checkbox" v-model="form.active" />
                  <span>Ativo</span>
                </label>
              </div>
            </div>
              </div>

              <div class="section-card">
                <div class="section-head">
                  <div>
                    <p class="eyebrow">Permissoes</p>
                    <h5>Controle por tela</h5>
                  </div>
                  <div class="permission-actions">
                    <button type="button" class="btn ghost sm" @click="selectAllPermissions">
                      Selecionar tudo
                    </button>
                    <button type="button" class="btn ghost sm" @click="clearPermissions">
                      Limpar
                    </button>
                  </div>
                </div>
                <div class="permission-grid">
                  <label v-for="opt in permissionOptions" :key="opt.key" class="permission-card">
                    <input
                      type="checkbox"
                      :value="opt.key"
                      v-model="form.permissions"
                      :disabled="form.role === 'ADMIN'"
                    />
                    <div>
                      <strong>{{ opt.label }}</strong>
                      <p class="muted">{{ opt.description }}</p>
                    </div>
                  </label>
                </div>
                <p v-if="form.role === 'ADMIN'" class="hint">
                  Administradores sempre tem acesso a todas as telas.
                </p>
                <p v-if="formError" class="error">{{ formError }}</p>
              </div>
            </div>

            <div class="form-actions">
              <button class="btn primary" type="submit" :disabled="saving">
                {{ saving ? 'Salvando...' : formMode === 'edit' ? 'Salvar alteracoes' : 'Criar usuario' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import api from '../../services/api';
import { PERMISSIONS, permissionLabel, type PermissionKey } from '../../constants/permissions';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'STAFF';
  permissions: PermissionKey[];
  active: boolean;
  createdAt?: string;
}

interface PermissionOption {
  key: PermissionKey;
  label: string;
  description?: string;
}

const users = ref<UserRow[]>([]);
const permissionOptions = ref<PermissionOption[]>([]);
const loading = ref(false);
const saving = ref(false);
const search = ref('');
const statusFilter = ref<'all' | 'active' | 'inactive'>('all');
const showModal = ref(false);

const formMode = ref<'create' | 'edit'>('create');
const form = reactive({
  id: '',
  name: '',
  email: '',
  password: '',
  role: 'STAFF' as UserRow['role'],
  active: true,
  permissions: [] as PermissionKey[]
});

const filteredUsers = computed(() => {
  const term = search.value.trim().toLowerCase();
  return users.value.filter((u) => {
    const matchesText =
      !term ||
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term);
    const matchesStatus =
      statusFilter.value === 'all' ||
      (statusFilter.value === 'active' && u.active) ||
      (statusFilter.value === 'inactive' && !u.active);
    return matchesText && matchesStatus;
  });
});

const formError = ref('');
const fieldErrors = reactive({
  name: '',
  email: '',
  password: ''
});

function roleLabel(role: UserRow['role']) {
  return role === 'ADMIN' ? 'Administrador' : 'Operador';
}

function permissionDescription(key: PermissionKey) {
  return permissionOptions.value.find((p) => p.key === key)?.description || '';
}

function resetForm() {
  formMode.value = 'create';
  form.id = '';
  form.name = '';
  form.email = '';
  form.password = '';
  form.role = 'STAFF';
  form.active = true;
  form.permissions = [];
  formError.value = '';
  fieldErrors.name = '';
  fieldErrors.email = '';
  fieldErrors.password = '';
}

function startCreate() {
  resetForm();
  showModal.value = true;
}

function selectAllPermissions() {
  form.permissions = permissionOptions.value.map((p) => p.key);
}

function clearPermissions() {
  form.permissions = [];
}

function editUser(user: UserRow) {
  formMode.value = 'edit';
  form.id = user.id;
  form.name = user.name;
  form.email = user.email;
  form.password = '';
  form.role = user.role;
  form.active = user.active;
  form.permissions = [...user.permissions];
  formError.value = '';
  fieldErrors.name = '';
  fieldErrors.email = '';
  fieldErrors.password = '';
  showModal.value = true;
}

function validateField(field: 'name' | 'email' | 'password') {
  if (field === 'name') {
    fieldErrors.name = form.name.trim() ? '' : 'Informe o nome.';
    return !fieldErrors.name;
  }

  if (field === 'email') {
    const value = form.email.trim();
    if (!value) {
      fieldErrors.email = 'Informe o e-mail.';
    } else {
      const parts = value.split('@');
      const valid =
        parts.length === 2 &&
        parts[0].length > 0 &&
        parts[1].includes('.') &&
        parts[1].split('.').every((seg) => seg.length > 0);
      fieldErrors.email = valid ? '' : 'Informe um e-mail valido.';
    }
    return !fieldErrors.email;
  }

  if (field === 'password') {
    if (formMode.value === 'create') {
      fieldErrors.password =
        !form.password || form.password.length < 6
          ? 'Defina uma senha com pelo menos 6 caracteres.'
          : '';
    } else {
      fieldErrors.password =
        form.password && form.password.length < 6
          ? 'Senha deve ter pelo menos 6 caracteres.'
          : '';
    }
    return !fieldErrors.password;
  }
  return true;
}

async function disableUser(user: UserRow) {
  if (user.role === 'ADMIN') return;
  if (!confirm(`Desativar ${user.name}?`)) return;
  await api.delete(`/users/${user.id}`);
  await loadUsers();
  if (form.id === user.id) {
    form.active = false;
  }
}

async function submitForm() {
  formError.value = '';
  fieldErrors.name = '';
  fieldErrors.email = '';
  fieldErrors.password = '';

  const okName = validateField('name');
  const okEmail = validateField('email');
  const okPass = validateField('password');
  if (!okName || !okEmail || !okPass) {
    formError.value = 'Corrija os campos destacados para continuar.';
    return;
  }

  if (!form.permissions.length && form.role !== 'ADMIN') {
    formError.value = 'Selecione ao menos uma tela para o operador.';
    return;
  }

  saving.value = true;
  try {
    const payload: any = {
      name: form.name,
      email: form.email.trim().toLowerCase(),
      role: form.role,
      active: form.active,
      permissions: form.role === 'ADMIN' ? permissionOptions.value.map((p) => p.key) : form.permissions
    };

    if (formMode.value === 'create') {
      if (!form.password) {
        formError.value = 'Informe uma senha para o novo usuario.';
        saving.value = false;
        return;
      }
      payload.password = form.password;
      await api.post('/users', payload);
    } else {
      if (form.password) {
        payload.password = form.password;
      }
      await api.put(`/users/${form.id}`, payload);
    }
    await loadUsers();
    resetForm();
    showModal.value = false;
  } catch (error: any) {
    formError.value = error?.response?.data?.message || 'Erro ao salvar usuario';
  } finally {
    saving.value = false;
  }
}

async function loadPermissionOptions() {
  try {
    const { data } = await api.get('/users/permissions/options');
    permissionOptions.value = data;
  } catch (error: any) {
    console.error('Erro ao carregar permissoes', error);
    permissionOptions.value = PERMISSIONS.map((p) => ({
      key: p.key,
      label: p.label,
      description: ''
    }));
  } finally {
    if (form.permissions.length === 0) {
      form.permissions = permissionOptions.value.map((p: PermissionOption) => p.key);
    }
  }
}

async function loadUsers() {
  loading.value = true;
  try {
    const { data } = await api.get('/users');
    users.value = data;
  } catch (error: any) {
    console.error('Erro ao carregar usuarios', error);
  } finally {
    loading.value = false;
  }
}

async function loadData() {
  await Promise.all([loadPermissionOptions(), loadUsers()]);
}

onMounted(loadData);

function closeModal() {
  showModal.value = false;
}
</script>

<style scoped>
.users-view {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 11px;
  color: var(--primary);
  margin: 0 0 4px 0;
}

.muted {
  color: var(--muted);
}

.actions {
  display: flex;
  gap: 8px;
}

.panel {
  padding: 14px;
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.filters {
  display: flex;
  gap: 8px;
  align-items: center;
}

.search {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  width: 260px;
}

.select {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
}

.list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
}

.user-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.user-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.tags {
  display: flex;
  gap: 6px;
}

.pill {
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid var(--border);
  font-size: 12px;
  font-weight: 700;
}

.pill.admin {
  border-color: rgba(59, 130, 246, 0.5);
  color: #2563eb;
}

.pill.staff {
  border-color: rgba(16, 185, 129, 0.5);
  color: #059669;
}

.pill.danger {
  border-color: rgba(239, 68, 68, 0.4);
  color: #b91c1c;
}

.email {
  margin: 2px 0 0 0;
}

.permissions-line {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.permission-pill {
  padding: 4px 8px;
  border-radius: 8px;
  border: 1px solid var(--border);
  font-size: 12px;
  font-weight: 600;
  background: rgba(91, 231, 196, 0.08);
}

.permission-pill.muted {
  background: rgba(0, 0, 0, 0.04);
  border-color: var(--border);
  color: var(--muted);
}

.card-actions {
  display: flex;
  gap: 8px;
}

.empty {
  text-align: center;
  padding: 28px 10px;
  color: var(--muted);
  display: grid;
  gap: 6px;
  place-items: center;
}

.empty-icon {
  font-size: 28px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.section-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 8px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field input,
.field select {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
}

.field.checkbox {
  justify-content: flex-end;
}

.checkbox-inline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.checkbox-inline input {
  width: 16px;
  height: 16px;
}

.permissions {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.permissions-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.permission-actions {
  display: flex;
  gap: 6px;
}

.permission-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
  max-height: 420px;
  overflow-y: auto;
  padding-right: 4px;
}

.permission-card {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px;
  align-items: flex-start;
}

.permission-card input {
  margin-top: 2px;
}

.hint {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
}

.error {
  color: #b91c1c;
  margin: 4px 0 0 0;
  font-weight: 600;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.btn {
  border: 1px solid var(--border);
  padding: 10px 14px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
}

.btn.primary {
  background: linear-gradient(135deg, var(--primary), var(--primary-strong));
  color: #0c1829;
  border: none;
}

.btn.ghost {
  background: transparent;
}

.btn.danger {
  color: #b91c1c;
  border-color: rgba(239, 68, 68, 0.4);
}

.btn.sm {
  padding: 6px 10px;
  font-size: 12px;
}

.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 32px 18px;
  z-index: 9999;
}

.modal-box {
  width: min(1100px, 96vw);
  margin: 12px auto 24px;
  padding: 16px;
  border-radius: var(--radius);
  box-shadow: 0 14px 48px rgba(0, 0, 0, 0.25);
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 10px;
}
</style>



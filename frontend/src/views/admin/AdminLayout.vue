<template>
  <div class="layout">
    <aside class="glass">
      <div class="brand">
        <div class="dot"></div>
        Mercadinho
      </div>
      <nav>
        <RouterLink to="/admin/dashboard">Dashboard</RouterLink>
        <RouterLink to="/admin/products">Produtos</RouterLink>
        <RouterLink to="/admin/suppliers">Fornecedores</RouterLink>
        <RouterLink to="/admin/categories">Categorias</RouterLink>
        <RouterLink to="/admin/units">Unidades</RouterLink>
        <RouterLink to="/admin/locations">Locais</RouterLink>
        <RouterLink to="/admin/purchases">Compras</RouterLink>
        <RouterLink to="/admin/stock-movements">Estoque</RouterLink>
        <RouterLink to="/admin/sales">Vendas</RouterLink>
      </nav>
      <button class="logout" @click="logout">Sair</button>
    </aside>
    <main>
      <header>
        <div>
          <p class="eyebrow">admin</p>
          <h2>Backoffice</h2>
        </div>
        <div class="header-actions">
          <button class="btn btn-ghost notify" @click="toggleNotifications">
            Notificações
            <span v-if="unread" class="badge">{{ unread }}</span>
          </button>
          <div class="user" v-if="user">
            <span>{{ user.name }}</span>
          </div>
        </div>
      </header>
      <section class="content glass">
        <router-view />
      </section>
      <div v-if="showNotifications" class="notif-panel glass">
        <div class="notif-header">
          <strong>Notificações</strong>
          <div class="notif-actions">
            <button class="btn btn-ghost btn-sm" @click="notifications.markAllRead()">Marcar lidas</button>
            <button class="btn btn-ghost btn-sm btn-danger" @click="clearAllNotifications" title="Limpar todas">🗑️</button>
            <button class="btn-close" @click="showNotifications = false" title="Fechar">×</button>
          </div>
        </div>
        <div v-if="!items.length" class="empty">Sem notificações</div>
        <div
          v-for="n in items"
          :key="n._id"
          :class="['notif-item', !n.read ? 'unread' : '']"
          @click="notifications.markRead(n._id)"
        >
          <div class="notif-title">{{ n.title }}</div>
          <div class="notif-message">{{ translateMessage(n.message) }}</div>
          <div v-if="n.location" class="notif-location">Local: {{ n.location }}</div>
          <small>{{ new Date(n.createdAt).toLocaleString() }}</small>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../../stores/auth';
import { useNotificationStore } from '../../stores/notifications';
import { onMounted, ref } from 'vue';

const auth = useAuthStore();
const router = useRouter();
const { user } = storeToRefs(auth);

const notifications = useNotificationStore();
const { unread, items } = storeToRefs(notifications);
const showNotifications = ref(false);

function logout() {
  auth.logout();
  router.push('/admin/login');
}

function toggleNotifications() {
  showNotifications.value = !showNotifications.value;
  if (showNotifications.value) {
    notifications.fetchAll().catch(() => {
      // Erro já tratado pelo interceptor
      showNotifications.value = false;
    });
  }
}

// Traduz termos em inglês nas mensagens antigas
function translateMessage(message: string): string {
  const translations: Record<string, string> = {
    'CREDIT_CARD': 'Cartão de Crédito',
    'DEBIT_CARD': 'Cartão de Débito',
    'PIX': 'PIX',
    'CASH': 'Dinheiro',
    'VOUCHER': 'Voucher'
  };

  let translatedMessage = message;
  for (const [key, value] of Object.entries(translations)) {
    translatedMessage = translatedMessage.replace(new RegExp(key, 'g'), value);
  }
  return translatedMessage;
}

// Limpa todas as notificações com confirmação
function clearAllNotifications() {
  if (confirm('Tem certeza que deseja limpar todas as notificações? Esta ação não pode ser desfeita.')) {
    notifications.deleteAll().catch(() => {
      alert('Erro ao limpar notificações');
    });
  }
}

onMounted(() => {
  notifications.fetchUnread().catch(() => {});
});
</script>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  min-height: 100vh;
}
.glass {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border);
  backdrop-filter: blur(14px);
  box-shadow: var(--shadow);
  border-radius: var(--radius);
}
aside {
  margin: 18px 0 18px 18px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 18px;
  height: calc(100vh - 36px);
}
.brand {
  font-weight: 700;
  font-size: 18px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--primary);
}
nav {
  display: grid;
  gap: 8px;
}
nav a {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid transparent;
}
nav a.router-link-active {
  background: rgba(91, 231, 196, 0.12);
  border: 1px solid rgba(91, 231, 196, 0.35);
}
main {
  padding: 18px;
  display: flex;
  flex-direction: column;
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}
.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}
.content {
  margin-top: 12px;
  padding: 16px;
  max-width: 1200px;
  width: 100%;
  margin-left: auto;
  margin-right: auto;
}
.logout {
  background: #ef4444;
  border: none;
  color: #fff;
  padding: 10px 12px;
  border-radius: 10px;
}
.eyebrow {
  text-transform: uppercase;
  letter-spacing: 2px;
  font-size: 11px;
  color: var(--primary);
  margin: 0;
}
.btn {
  border: 1px solid var(--border);
  padding: 8px 10px;
  border-radius: 10px;
  background: #fff;
  color: var(--text);
}
.btn-ghost {
  background: transparent;
}
.notify {
  position: relative;
  padding-right: 14px;
}
.badge {
  background: #ef4444;
  color: #fff;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 12px;
  margin-left: 6px;
}
.notif-panel {
  position: absolute;
  top: 56px;
  right: 24px;
  width: 320px;
  max-height: 420px;
  overflow: auto;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow);
  padding: 10px;
  z-index: 5;
}
.notif-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.notif-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
.btn-sm {
  font-size: 12px;
  padding: 6px 8px;
}
.btn-danger:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: #ef4444;
  color: #ef4444;
}
.btn-close {
  background: transparent;
  border: none;
  color: var(--text);
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: background 0.2s;
}
.btn-close:hover {
  background: rgba(0, 0, 0, 0.05);
}
.notif-item {
  padding: 8px;
  border-radius: 10px;
  border: 1px solid var(--border);
  margin-bottom: 6px;
  background: rgba(16, 180, 157, 0.05);
}
.notif-item.unread {
  border-color: var(--primary);
}
.notif-item small {
  color: var(--muted);
}
@media (max-width: 980px) {
  .layout {
    grid-template-columns: 1fr;
  }
  aside {
    margin: 12px;
    flex-direction: row;
    flex-wrap: wrap;
    height: auto;
    position: static;
  }
}
</style>

<template>
  <div class="layout">
    <aside class="glass">
      <div class="brand">
        <div class="brand-icon">
          <div class="dot"></div>
        </div>
        <div class="brand-text">
          <h1>Scarlat</h1>
          <p>Mercadinho</p>
        </div>
      </div>

                        <nav>
        <div class="nav-section" v-if="showOverview">
          <p class="nav-label">Visão Geral</p>
          <RouterLink v-if="can('DASHBOARD')" to="/admin/dashboard" class="nav-item">
            <span class="icon">📊</span>
            <span>Dashboard</span>
          </RouterLink>
        </div>

        <div class="nav-section" v-if="showInventory">
          <p class="nav-label">Inventário</p>
          <RouterLink v-if="can('PRODUCTS')" to="/admin/products" class="nav-item">
            <span class="icon">📦</span>
            <span>Produtos</span>
          </RouterLink>
          <RouterLink
            v-if="can('EXPIRING_PRODUCTS')"
            to="/admin/expiring-products"
            class="nav-item expiring-link"
          >
            <span class="icon">⏳</span>
            <span class="link-content">
              <span>Vencimentos</span>
              <span v-if="criticalBatchCount > 0" class="critical-badge">{{ criticalBatchCount }}</span>
            </span>
          </RouterLink>
          <RouterLink v-if="can('CATEGORIES')" to="/admin/categories" class="nav-item">
            <span class="icon">🏷️</span>
            <span>Categorias</span>
          </RouterLink>
          <RouterLink v-if="can('STOCK_MOVEMENTS')" to="/admin/stock-movements" class="nav-item">
            <span class="icon">📦</span>
            <span>Movimentações</span>
          </RouterLink>
        </div>

        <div class="nav-section" v-if="showOperations">
          <p class="nav-label">Operações</p>
          <RouterLink v-if="can('PURCHASES')" to="/admin/purchases" class="nav-item">
            <span class="icon">🧾</span>
            <span>Compras</span>
          </RouterLink>
          <RouterLink v-if="can('SALES')" to="/admin/sales" class="nav-item">
            <span class="icon">🧾</span>
            <span>Vendas</span>
          </RouterLink>
          <RouterLink v-if="can('NFC_E')" to="/admin/nfce" class="nav-item">
            <span class="icon">🧾</span>
            <span>NFC-e</span>
          </RouterLink>
          <RouterLink v-if="can('FISCAL')" to="/admin/fiscal" class="nav-item">
            <span class="icon">🧾</span>
            <span>Fiscal</span>
          </RouterLink>
        </div>

        <div class="nav-section" v-if="showCadastros">
          <p class="nav-label">Cadastros</p>
          <RouterLink v-if="can('SUPPLIERS')" to="/admin/suppliers" class="nav-item">
            <span class="icon">🚚</span>
            <span>Fornecedores</span>
          </RouterLink>
          <RouterLink v-if="can('LOCATIONS')" to="/admin/locations" class="nav-item">
            <span class="icon">📍</span>
            <span>Locais</span>
          </RouterLink>
        </div>

        <div class="nav-section" v-if="showSystem">
          <p class="nav-label">Sistema</p>
          <RouterLink v-if="can('SETTINGS')" to="/admin/settings" class="nav-item">
            <span class="icon">⚙️</span>
            <span>Configurações</span>
          </RouterLink>
          <RouterLink v-if="isAdmin" to="/admin/users" class="nav-item">
            <span class="icon">👥</span>
            <span>Usuários</span>
          </RouterLink>
        </div>
      </nav>


      <button class="logout" @click="logout">
        <span class="icon">🚪</span>
        <span>Sair</span>
      </button>
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
          <div class="notif-header-title">
            <span class="notif-header-icon">🔔</span>
            <strong>Notificações</strong>
          </div>
          <div class="notif-actions">
            <button class="btn btn-ghost btn-sm" @click="notifications.markAllRead()" title="Marcar todas como lidas">
              <span class="action-icon">✓</span>
            </button>
            <button class="btn btn-ghost btn-sm btn-danger" @click="clearAllNotifications" title="Limpar todas">
              <span class="action-icon">🗑️</span>
            </button>
            <button class="btn-close" @click="showNotifications = false" title="Fechar">×</button>
          </div>
        </div>

        <div v-if="!items.length" class="empty">
          <div class="empty-icon">📭</div>
          <p class="empty-title">Sem notificações</p>
          <p class="empty-subtitle">Você está em dia!</p>
        </div>

        <div class="notif-list">
          <div v-for="n in items" :key="n._id" :class="['notif-item', !n.read ? 'unread' : '', `notif-${n.type}`]"
            @click="notifications.markRead(n._id)">
            <div class="notif-icon-wrapper">
              <span class="notif-icon">{{ getNotificationIcon(n.type) }}</span>
            </div>
            <div class="notif-content">
              <div class="notif-title">{{ n.title }}</div>
              <div class="notif-message">{{ translateMessage(n.message) }}</div>
              <div class="notif-meta">
                <span v-if="n.location" class="notif-location">
                  <span class="location-icon">📍</span>
                  {{ n.location }}
                </span>
                <span class="notif-time">{{ formatTime(n.createdAt) }}</span>
              </div>
            </div>
            <div v-if="!n.read" class="unread-dot"></div>
          </div>
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
import { onMounted, onUnmounted, ref, computed } from 'vue';
import api from '../../services/api';
import { PermissionKey } from '../../constants/permissions';

const auth = useAuthStore();
const router = useRouter();
const { user } = storeToRefs(auth);

const notifications = useNotificationStore();
const { unread, items } = storeToRefs(notifications);
const showNotifications = ref(false);

const criticalBatchCount = ref(0);
let criticalInterval: number | null = null;

const isAdmin = computed(() => auth.user?.role === 'ADMIN');
const can = (permission: PermissionKey) => auth.hasPermission(permission);
const showOverview = computed(() => can('DASHBOARD'));
const showInventory = computed(
  () => can('PRODUCTS') || can('EXPIRING_PRODUCTS') || can('CATEGORIES') || can('STOCK_MOVEMENTS')
);
const showOperations = computed(
  () => can('PURCHASES') || can('SALES') || can('NFC_E') || can('FISCAL')
);
const showCadastros = computed(() => can('SUPPLIERS') || can('LOCATIONS'));
const showSystem = computed(() => can('SETTINGS') || isAdmin.value);

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

// Retorna o emoji apropriado para cada tipo de notificação
function getNotificationIcon(type: string): string {
  const icons: Record<string, string> = {
    'SALE_COMPLETED': '💰',
    'LOW_STOCK': '📉',
    'PURCHASE_REGISTERED': '🛒',
    'SYSTEM_ALERT': '🔔',
    'EXPIRING_PRODUCT': '⏰',
    'EXPIRED_PRODUCT': '⚠️'
  };
  return icons[type] || '📢';
}

// Formata o timestamp de forma mais amigável
function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Agora';
  if (diffMins < 60) return `${diffMins}min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;

  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
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

// Busca contagem de produtos críticos
async function fetchCriticalCount() {
  if (!can('EXPIRING_PRODUCTS')) {
    criticalBatchCount.value = 0;
    return;
  }
  try {
    const { data } = await api.get('/batches/critical-count');
    criticalBatchCount.value = data.count;
  } catch (error) {
    // Silenciosamente falha
  }
}

onMounted(() => {
  notifications.fetchUnread().catch(() => { });
  if (can('EXPIRING_PRODUCTS')) {
    fetchCriticalCount();
    // Atualiza a cada 2 minutos
    criticalInterval = window.setInterval(() => {
      fetchCriticalCount();
    }, 120000);
  }
});

onUnmounted(() => {
  if (criticalInterval) {
    clearInterval(criticalInterval);
  }
});
</script>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: 280px 1fr;
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
  padding: 20px 18px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: sticky;
  top: 18px;
  height: calc(100vh - 36px);
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: smooth;
}

/* Scrollbar personalizado - mais elegante */
aside::-webkit-scrollbar {
  width: 6px;
}

aside::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 3px;
  margin: 8px 0;
}

aside::-webkit-scrollbar-thumb {
  background: rgba(91, 231, 196, 0.25);
  border-radius: 3px;
  transition: background 0.2s ease;
}

aside::-webkit-scrollbar-thumb:hover {
  background: rgba(91, 231, 196, 0.45);
}
  
  /* Brand */
  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border);
  }
  
  .brand-icon {
    width: 42px;
    height: 42px;
    background: linear-gradient(135deg, var(--primary), var(--primary-strong));
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(91, 231, 196, 0.25);
  }
  
  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #0c1829;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
  }
  
  .brand-text h1 {
    font-size: 18px;
    font-weight: 700;
    margin: 0;
    line-height: 1.2;
    color: var(--text);
  }
  
  .brand-text p {
    font-size: 12px;
    margin: 0;
    color: var(--muted);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  /* Navigation */
  nav {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 20px;
    overflow-y: auto;
    scroll-behavior: smooth;
  }

  nav::-webkit-scrollbar {
    width: 0;
  }
  
  .nav-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .nav-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--muted);
    padding: 0 14px 6px;
    margin: 0;
  }
  
  .nav-item {
    padding: 11px 14px;
    border-radius: 10px;
    border: 1px solid transparent;
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
    color: var(--text);
    text-decoration: none;
  }
  
  .nav-item:hover {
    background: rgba(91, 231, 196, 0.06);
    border-color: rgba(91, 231, 196, 0.15);
  }
  
  .nav-item.router-link-active {
    background: rgba(91, 231, 196, 0.12);
    border: 1px solid rgba(91, 231, 196, 0.35);
    color: var(--primary-strong);
    font-weight: 600;
  }
  
  .nav-item .icon {
    font-size: 18px;
    width: 20px;
    text-align: center;
    flex-shrink: 0;
  }
  
  /* Link especial para produtos vencendo */
  .nav-item.expiring-link {
    background: rgba(245, 158, 11, 0.08);
    border: 1px solid rgba(245, 158, 11, 0.2);
  }
  
  .nav-item.expiring-link:hover {
    background: rgba(245, 158, 11, 0.12);
    border-color: rgba(245, 158, 11, 0.3);
  }
  
  .nav-item.expiring-link.router-link-active {
    background: rgba(245, 158, 11, 0.15);
    border: 1px solid rgba(245, 158, 11, 0.4);
    color: #f59e0b;
  }
  
  .link-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: 8px;
  }
  
  .critical-badge {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: #fff;
    border-radius: 10px;
    padding: 2px 7px;
    font-size: 10px;
    font-weight: 700;
    flex-shrink: 0;
    animation: pulse-critical 2s ease-in-out infinite;
    box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4);
    min-width: 20px;
    text-align: center;
  }
  
  @keyframes pulse-critical {
  
    0%,
    100% {
      transform: scale(1);
      box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4);
    }
  
    50% {
      transform: scale(1.08);
      box-shadow: 0 3px 10px rgba(239, 68, 68, 0.6);
    }
  }
  
main {
  padding: 18px;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}
  
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 1600px;
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
  max-width: 1600px;
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  flex: 1;
  overflow-y: hidden;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  padding-bottom: 8px;
}
  
  /* Logout Button */
  .logout {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    border: none;
    color: #fff;
    padding: 12px 18px;
    border-radius: 12px;
    font-weight: 600;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.25);
    margin-top: 16px;
    position: relative;
  }
  
  .logout::before {
    content: '';
    position: absolute;
    top: -16px;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--border);
  }
  
  .logout:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35);
  }
  
  .logout:active {
    transform: translateY(0);
  }
  
  .logout .icon {
    font-size: 18px;
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
  
  /* Notification Panel */
  .notif-panel {
    position: absolute;
    top: 56px;
    right: 24px;
    width: 380px;
    max-height: 520px;
    display: flex;
    flex-direction: column;
    background: #fff;
    border: 1px solid var(--border);
    border-radius: 14px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    z-index: 5;
    overflow: hidden;
  }
  
  .notif-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 16px;
    border-bottom: 1px solid var(--border);
    background: rgba(91, 231, 196, 0.03);
  }
  
  .notif-header-title {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .notif-header-icon {
    font-size: 20px;
  }
  
  .notif-header strong {
    font-size: 16px;
    font-weight: 600;
    color: var(--text);
  }
  
  .notif-actions {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  
  .btn-sm {
    font-size: 12px;
    padding: 6px 10px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 4px;
    transition: all 0.2s ease;
  }
  
  .btn-sm .action-icon {
    font-size: 14px;
  }
  
  .btn-sm:hover {
    background: rgba(91, 231, 196, 0.1);
    border-color: rgba(91, 231, 196, 0.3);
  }
  
  .btn-danger:hover {
    background: rgba(239, 68, 68, 0.1);
    border-color: #ef4444;
    color: #ef4444;
  }
  
  .btn-close {
    background: transparent;
    border: none;
    color: var(--muted);
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    transition: all 0.2s ease;
    line-height: 1;
  }
  
  .btn-close:hover {
    background: rgba(0, 0, 0, 0.06);
    color: var(--text);
  }
  
  /* Empty State */
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    text-align: center;
  }
  
  .empty-icon {
    font-size: 56px;
    margin-bottom: 12px;
    opacity: 0.5;
  }
  
  .empty-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text);
    margin: 0 0 4px 0;
  }
  
  .empty-subtitle {
    font-size: 13px;
    color: var(--muted);
    margin: 0;
  }
  
  /* Notification List */
  .notif-list {
    overflow-y: auto;
    max-height: 440px;
    padding: 8px;
    scroll-behavior: smooth;
  }

  .notif-list::-webkit-scrollbar {
    width: 6px;
  }

  .notif-list::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 3px;
  }

  .notif-list::-webkit-scrollbar-thumb {
    background: rgba(91, 231, 196, 0.25);
    border-radius: 3px;
    transition: background 0.2s ease;
  }

  .notif-list::-webkit-scrollbar-thumb:hover {
    background: rgba(91, 231, 196, 0.45);
  }
  
  /* Notification Item */
  .notif-item {
    display: flex;
    gap: 12px;
    padding: 12px;
    border-radius: 10px;
    border: 1px solid var(--border);
    margin-bottom: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    background: #fff;
  }
  
  .notif-item:hover {
    background: rgba(91, 231, 196, 0.04);
    border-color: rgba(91, 231, 196, 0.2);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }
  
  .notif-item.unread {
    border-color: var(--primary);
    background: rgba(91, 231, 196, 0.06);
    border-width: 2px;
    padding: 11px;
  }
  
  .notif-icon-wrapper {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    background: rgba(91, 231, 196, 0.1);
  }
  
  /* Color coding por tipo */
  .notif-SALE_COMPLETED .notif-icon-wrapper {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(22, 163, 74, 0.1));
  }
  
  .notif-LOW_STOCK .notif-icon-wrapper {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.1));
  }
  
  .notif-PURCHASE_REGISTERED .notif-icon-wrapper {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.1));
  }
  
  .notif-EXPIRING_PRODUCT .notif-icon-wrapper {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.1));
  }
  
  .notif-EXPIRED_PRODUCT .notif-icon-wrapper {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.1));
  }
  
  .notif-SYSTEM_ALERT .notif-icon-wrapper {
    background: linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(147, 51, 234, 0.1));
  }
  
  .notif-content {
    flex: 1;
    min-width: 0;
  }
  
  .notif-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 4px;
    line-height: 1.3;
  }
  
  .notif-message {
    font-size: 13px;
    color: var(--muted);
    margin-bottom: 6px;
    line-height: 1.4;
    word-wrap: break-word;
  }
  
  .notif-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    color: var(--muted);
  }
  
  .notif-location {
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 2px 8px;
    background: rgba(91, 231, 196, 0.1);
    border-radius: 6px;
    font-weight: 500;
  }
  
  .location-icon {
    font-size: 10px;
  }
  
  .notif-time {
    font-weight: 500;
  }
  
  .unread-dot {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary), var(--primary-strong));
    box-shadow: 0 0 0 2px #fff, 0 0 8px rgba(91, 231, 196, 0.5);
    animation: pulse-dot 2s ease-in-out infinite;
  }
  
  @keyframes pulse-dot {
  
    0%,
    100% {
      transform: scale(1);
      opacity: 1;
    }
  
    50% {
      transform: scale(1.1);
      opacity: 0.8;
    }
  }
  
  @media (max-width: 980px) {
    .layout {
      grid-template-columns: 1fr;
    }
  
    aside {
      margin: 12px;
      padding: 16px;
      height: auto;
      position: static;
      overflow-y: visible;
    }
  
    .brand {
      padding-bottom: 12px;
    }
  
    .brand-icon {
      width: 36px;
      height: 36px;
    }
  
    .brand-text h1 {
      font-size: 16px;
    }
  
    nav {
      gap: 12px;
    }
  
    .nav-section {
      gap: 2px;
    }
  
    .nav-label {
      padding: 0 8px 4px;
      font-size: 10px;
    }
  
    .nav-item {
      padding: 8px 10px;
      font-size: 13px;
    }
  
    .nav-item .icon {
      font-size: 16px;
      width: 18px;
    }
  
    .logout {
      margin-top: 12px;
      padding: 10px 14px;
      font-size: 13px;
    }
  
    .logout::before {
      top: -12px;
    }
  
    /* Notification panel mobile */
    .notif-panel {
      left: 12px;
      right: 12px;
      width: auto;
      max-height: 70vh;
    }
  
    .notif-header {
      padding: 12px;
    }
  
    .notif-header strong {
      font-size: 14px;
    }
  
    .notif-list {
      max-height: calc(70vh - 60px);
    }
  
    .notif-item {
      padding: 10px;
    }
  
    .notif-icon-wrapper {
      width: 36px;
      height: 36px;
      font-size: 18px;
    }
  
    .notif-title {
      font-size: 13px;
    }
  
    .notif-message {
      font-size: 12px;
  }
}
</style>






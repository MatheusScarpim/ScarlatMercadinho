<template>
  <div class="chat-admin">
    <div class="chat-layout">
      <!-- Lista de sessões -->
      <div class="sessions-panel">
        <div class="sessions-header">
          <h3>Conversas</h3>
          <button class="btn-refresh" @click="fetchSessions" title="Atualizar">🔄</button>
        </div>

        <div v-if="!sessions.length" class="sessions-empty">
          <div class="empty-icon">💬</div>
          <p>Nenhuma conversa ativa</p>
        </div>

        <div
          v-for="s in sessions"
          :key="s._id"
          :class="['session-item', selectedSession === s._id ? 'active' : '']"
          @click="selectSession(s._id)"
        >
          <div class="session-avatar">👤</div>
          <div class="session-info">
            <div class="session-name">
              {{ s.customerName || 'Cliente' }}
              <span v-if="s.location" class="session-location">📍 {{ s.location }}</span>
            </div>
            <p class="session-preview">
              <span v-if="s.lastSender === 'AI'" class="ai-tag">IA: </span>
              {{ truncate(s.lastMessage, 50) }}
            </p>
          </div>
          <div class="session-meta">
            <span class="session-time">{{ formatTime(s.lastAt) }}</span>
            <span v-if="s.unreadCount > 0" class="session-badge">{{ s.unreadCount }}</span>
          </div>
        </div>
      </div>

      <!-- Área de mensagens -->
      <div class="messages-panel">
        <div v-if="!selectedSession" class="no-session">
          <div class="no-session-icon">📨</div>
          <p>Selecione uma conversa para responder</p>
        </div>

        <template v-else>
          <div class="messages-header">
            <div>
              <strong>{{ currentSessionName }}</strong>
              <span v-if="currentSessionLocation" class="header-location">📍 {{ currentSessionLocation }}</span>
            </div>
            <button class="btn-close-session" @click="closeCurrentSession">Encerrar conversa</button>
          </div>

          <div class="messages-body" ref="adminMessagesRef">
            <div v-for="msg in currentMessages" :key="msg._id" :class="['msg', msgClass(msg)]">
              <div class="msg-sender">
                <span v-if="msg.sender === 'CUSTOMER'">👤 Cliente</span>
                <span v-else-if="msg.sender === 'AI'">🤖 IA</span>
                <span v-else>👨‍💼 Atendente</span>
                <span class="msg-time">{{ formatDateTime(msg.createdAt) }}</span>
              </div>
              <div class="msg-bubble">{{ msg.message }}</div>
            </div>
          </div>

          <div class="reply-input">
            <input
              v-model="replyMsg"
              placeholder="Digite sua resposta..."
              @keyup.enter="sendReply"
              :disabled="replying"
            />
            <button class="send-btn" @click="sendReply" :disabled="!replyMsg.trim() || replying">
              Enviar
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import api from '../../services/api';

const sessions = ref<any[]>([]);
const selectedSession = ref<string | null>(null);
const currentMessages = ref<any[]>([]);
const currentSessionName = ref('');
const currentSessionLocation = ref('');
const replyMsg = ref('');
const replying = ref(false);
const adminMessagesRef = ref<HTMLElement | null>(null);

let pollInterval: number | null = null;

async function fetchSessions() {
  try {
    const { data } = await api.get('/chat/sessions');
    sessions.value = data;
  } catch {
    // ignora
  }
}

async function selectSession(sessionId: string) {
  selectedSession.value = sessionId;
  const session = sessions.value.find(s => s._id === sessionId);
  currentSessionName.value = session?.customerName || 'Cliente';
  currentSessionLocation.value = session?.location || '';
  await fetchCurrentMessages();
}

async function fetchCurrentMessages() {
  if (!selectedSession.value) return;
  try {
    const { data } = await api.get(`/chat/messages/${selectedSession.value}`);
    currentMessages.value = data;
    await nextTick();
    scrollToBottom();
  } catch {
    // ignora
  }
}

async function sendReply() {
  const text = replyMsg.value.trim();
  if (!text || !selectedSession.value) return;

  replying.value = true;
  replyMsg.value = '';

  try {
    const { data } = await api.post('/chat/reply', {
      sessionId: selectedSession.value,
      message: text,
    });
    currentMessages.value.push(data);
    await nextTick();
    scrollToBottom();
  } catch {
    alert('Erro ao enviar resposta');
  }

  replying.value = false;
}

async function closeCurrentSession() {
  if (!selectedSession.value) return;
  if (!confirm('Deseja encerrar esta conversa?')) return;

  try {
    await api.post('/chat/close', { sessionId: selectedSession.value });
    selectedSession.value = null;
    currentMessages.value = [];
    await fetchSessions();
  } catch {
    alert('Erro ao encerrar conversa');
  }
}

function scrollToBottom() {
  if (adminMessagesRef.value) {
    adminMessagesRef.value.scrollTop = adminMessagesRef.value.scrollHeight;
  }
}

function msgClass(msg: any) {
  if (msg.sender === 'CUSTOMER') return 'msg-customer';
  if (msg.sender === 'AI') return 'msg-ai';
  return 'msg-admin';
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Agora';
  if (diffMins < 60) return `${diffMins}min`;
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffHours < 24) return `${diffHours}h`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function truncate(str: string, len: number) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '...' : str;
}

onMounted(() => {
  fetchSessions();
  // Polling a cada 5 segundos
  pollInterval = window.setInterval(() => {
    fetchSessions();
    if (selectedSession.value) fetchCurrentMessages();
  }, 5000);
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
});
</script>

<style scoped>
.chat-admin {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chat-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  flex: 1;
  min-height: 0;
  gap: 12px;
  height: calc(100vh - 140px);
}

/* Sessions Panel */
.sessions-panel {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow-y: auto;
  background: var(--surface);
}

.sessions-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  background: var(--surface);
  z-index: 1;
}

.sessions-header h3 {
  margin: 0;
  font-size: 16px;
}

.btn-refresh {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  transition: background 0.2s;
}

.btn-refresh:hover {
  background: rgba(16, 180, 157, 0.1);
}

.sessions-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: var(--muted);
}

.sessions-empty .empty-icon {
  font-size: 40px;
  margin-bottom: 8px;
  opacity: 0.5;
}

.session-item {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid var(--border);
}

.session-item:hover {
  background: rgba(16, 180, 157, 0.05);
}

.session-item.active {
  background: rgba(16, 180, 157, 0.1);
  border-left: 3px solid var(--primary);
}

.session-avatar {
  font-size: 24px;
  flex-shrink: 0;
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 6px;
}

.session-location {
  font-size: 11px;
  font-weight: 400;
  color: var(--muted);
}

.session-preview {
  font-size: 12px;
  color: var(--muted);
  margin: 2px 0 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ai-tag {
  color: #f59e0b;
  font-weight: 600;
}

.session-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.session-time {
  font-size: 11px;
  color: var(--muted);
}

.session-badge {
  background: var(--primary);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  border-radius: 10px;
  padding: 2px 7px;
  min-width: 18px;
  text-align: center;
}

/* Messages Panel */
.messages-panel {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--surface);
}

.no-session {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--muted);
}

.no-session-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.4;
}

.messages-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.messages-header strong {
  font-size: 15px;
}

.header-location {
  font-size: 12px;
  color: var(--muted);
  margin-left: 8px;
}

.btn-close-session {
  background: none;
  border: 1px solid #ef4444;
  color: #ef4444;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-close-session:hover {
  background: #ef4444;
  color: #fff;
}

/* Messages body */
.messages-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.messages-body::-webkit-scrollbar {
  width: 5px;
}

.messages-body::-webkit-scrollbar-thumb {
  background: rgba(16, 180, 157, 0.25);
  border-radius: 3px;
}

.msg {
  display: flex;
  flex-direction: column;
  max-width: 70%;
}

.msg-customer {
  align-self: flex-start;
}

.msg-admin {
  align-self: flex-end;
}

.msg-ai {
  align-self: flex-start;
}

.msg-sender {
  font-size: 11px;
  color: var(--muted);
  margin-bottom: 4px;
  display: flex;
  gap: 8px;
  align-items: center;
}

.msg-time {
  font-size: 10px;
  opacity: 0.7;
}

.msg-bubble {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.5;
  word-wrap: break-word;
}

.msg-customer .msg-bubble {
  background: var(--surface-2);
  color: var(--text);
  border-bottom-left-radius: 4px;
}

.msg-admin .msg-bubble {
  background: linear-gradient(135deg, var(--primary), var(--primary-strong));
  color: #fff;
  border-bottom-right-radius: 4px;
}

.msg-ai .msg-bubble {
  background: #fef3c7;
  color: #78350f;
  border-bottom-left-radius: 4px;
}

/* Reply input */
.reply-input {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  background: var(--surface);
}

.reply-input input {
  flex: 1;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 16px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  background: var(--surface-2);
  color: var(--text);
}

.reply-input input:focus {
  border-color: var(--primary);
}

.reply-input .send-btn {
  background: linear-gradient(135deg, var(--primary), var(--primary-strong));
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.reply-input .send-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 180, 157, 0.3);
}

.reply-input .send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .chat-layout {
    grid-template-columns: 1fr;
  }

  .sessions-panel {
    max-height: 200px;
  }
}
</style>

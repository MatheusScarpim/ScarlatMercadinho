<template>
  <div class="help-chat">
    <!-- Botão flutuante -->
    <button class="chat-fab" @click="toggleChat" :class="{ active: isOpen }">
      <span v-if="!isOpen" class="fab-icon">💬</span>
      <span v-else class="fab-icon">✕</span>
    </button>

    <!-- Painel do chat -->
    <transition name="chat-slide">
      <div v-if="isOpen" class="chat-panel glass">
        <!-- Header -->
        <div class="chat-header">
          <div class="chat-header-info">
            <span class="chat-avatar">🏪</span>
            <div>
              <strong>Ajuda</strong>
              <p class="chat-status" :class="modeClass">{{ modeLabel }}</p>
            </div>
          </div>
          <button class="chat-close" @click="toggleChat">✕</button>
        </div>

        <!-- Tab bar -->
        <div class="chat-tabs">
          <button :class="['tab', activeTab === 'contato' ? 'active' : '']" @click="activeTab = 'contato'">Contato</button>
          <button :class="['tab', activeTab === 'chat' ? 'active' : '']" @click="activeTab = 'chat'">Chat</button>
        </div>

        <!-- Contato -->
        <div v-if="activeTab === 'contato'" class="chat-body contact-body">
          <div class="contact-card">
            <p class="contact-title">Entre em contato conosco</p>

            <a v-if="contactInfo.phone" :href="'tel:' + contactInfo.phone" class="contact-item">
              <span class="contact-icon">📞</span>
              <div>
                <span class="contact-label">Telefone</span>
                <span class="contact-value">{{ contactInfo.phone }}</span>
              </div>
            </a>

            <a v-if="contactInfo.email" :href="'mailto:' + contactInfo.email" class="contact-item">
              <span class="contact-icon">✉️</span>
              <div>
                <span class="contact-label">E-mail</span>
                <span class="contact-value">{{ contactInfo.email }}</span>
              </div>
            </a>

            <div class="contact-hours">
              <span class="contact-icon">🕐</span>
              <div>
                <span class="contact-label">Atendimento humano</span>
                <span class="contact-value">Seg a Sáb, 8:30 - 18:00</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Chat -->
        <div v-if="activeTab === 'chat'" class="chat-body messages-body" ref="messagesRef">
          <!-- Mensagem de boas-vindas -->
          <div class="msg msg-system">
            <p v-if="isBusinessHoursLocal">
              Você está falando com nossa equipe de atendimento. Envie sua dúvida!
            </p>
            <p v-else>
              Fora do horário comercial. Nosso assistente virtual vai te ajudar!
            </p>
          </div>

          <div v-for="msg in messages" :key="msg._id" :class="['msg', msgClass(msg)]">
            <div class="msg-bubble">
              <p>{{ msg.message }}</p>
              <span class="msg-time">{{ formatTime(msg.createdAt) }}</span>
            </div>
          </div>

          <div v-if="loading" class="msg msg-ai">
            <div class="msg-bubble typing">
              <span class="dot"></span><span class="dot"></span><span class="dot"></span>
            </div>
          </div>
        </div>

        <!-- Input -->
        <div v-if="activeTab === 'chat'" class="chat-input">
          <input
            v-model="inputMsg"
            placeholder="Digite sua mensagem..."
            @keyup.enter="sendMessage"
            :disabled="loading"
            readonly
            @click="openVk()"
            maxlength="1000"
          />
          <button class="send-btn" @click="sendMessage" :disabled="!inputMsg.trim() || loading">
            ➤
          </button>
        </div>
      </div>
    </transition>

    <!-- Virtual Keyboard -->
    <VirtualKeyboard
      v-model="vkValue"
      :visible="vkOpen"
      label="Digite sua mensagem"
      @update:modelValue="onVkUpdate"
      @confirm="onVkConfirm"
      @cancel="onVkCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch, computed } from 'vue';
import axios from 'axios';
import wl from '../config/whitelabel';
import VirtualKeyboard from './VirtualKeyboard.vue';

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const isOpen = ref(false);
const activeTab = ref<'contato' | 'chat'>('contato');
const inputMsg = ref('');
const loading = ref(false);
const messages = ref<any[]>([]);
const messagesRef = ref<HTMLElement | null>(null);
const isBusinessHoursLocal = ref(false);
const vkOpen = ref(false);
const vkValue = ref('');

const contactInfo = computed(() => ({
  phone: wl.contactPhone,
  email: wl.contactEmail,
}));

// Gera um sessionId único por sessão do browser
const sessionId = ref(
  sessionStorage.getItem('chat-session') || `kiosk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
);
sessionStorage.setItem('chat-session', sessionId.value);

const modeClass = ref('offline');
const modeLabel = ref('Carregando...');

function updateMode() {
  if (isBusinessHoursLocal.value) {
    modeClass.value = 'online';
    modeLabel.value = 'Atendente disponível';
  } else {
    modeClass.value = 'ai';
    modeLabel.value = 'Assistente virtual';
  }
}

async function fetchStatus() {
  try {
    const { data } = await axios.get(`${apiBase}/chat/status`);
    isBusinessHoursLocal.value = data.businessHours;
  } catch {
    isBusinessHoursLocal.value = false;
  }
  updateMode();
}

async function fetchMessages() {
  try {
    const { data } = await axios.get(`${apiBase}/chat/messages/${sessionId.value}`);
    messages.value = data;
    await nextTick();
    scrollToBottom();
  } catch {
    // ignora
  }
}

function toggleChat() {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    fetchStatus();
    if (messages.value.length === 0) fetchMessages();
  }
}

function msgClass(msg: any) {
  if (msg.sender === 'CUSTOMER') return 'msg-user';
  if (msg.sender === 'AI') return 'msg-ai';
  return 'msg-admin';
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function scrollToBottom() {
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight;
  }
}

function openVk() {
  vkValue.value = inputMsg.value;
  vkOpen.value = true;
}

function onVkUpdate(val: string) {
  vkValue.value = val;
  inputMsg.value = val;
}

function onVkConfirm() {
  vkOpen.value = false;
}

function onVkCancel() {
  vkOpen.value = false;
}

async function sendMessage() {
  const text = inputMsg.value.trim();
  if (!text) return;

  inputMsg.value = '';
  loading.value = true;

  // Adiciona mensagem do usuário localmente
  messages.value.push({
    _id: `local-${Date.now()}`,
    sender: 'CUSTOMER',
    message: text,
    createdAt: new Date().toISOString(),
  });

  await nextTick();
  scrollToBottom();

  try {
    const { data } = await axios.post(`${apiBase}/chat/send`, {
      sessionId: sessionId.value,
      message: text,
    });

    if (data.mode === 'ai' && data.message) {
      messages.value.push(data.message);
    }
    // No modo human, a resposta virá quando o admin responder (polling)
  } catch {
    messages.value.push({
      _id: `error-${Date.now()}`,
      sender: 'AI',
      message: 'Desculpe, ocorreu um erro. Tente novamente.',
      createdAt: new Date().toISOString(),
    });
  }

  loading.value = false;
  await nextTick();
  scrollToBottom();
}

// Polling para novas mensagens (quando em modo humano)
let pollInterval: number | null = null;

watch(isOpen, (open) => {
  if (open) {
    pollInterval = window.setInterval(async () => {
      if (activeTab.value === 'chat' && isBusinessHoursLocal.value) {
        await fetchMessages();
      }
    }, 5000);
  } else {
    if (pollInterval) clearInterval(pollInterval);
  }
});

onMounted(() => {
  fetchStatus();
  // Atualiza status a cada 5 minutos
  setInterval(fetchStatus, 300000);
});
</script>

<style scoped>
.help-chat {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
  font-family: inherit;
}

/* FAB */
.chat-fab {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, var(--primary, #10b49d), var(--primary-strong, #0e9c87));
  color: #fff;
  font-size: 26px;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(16, 180, 157, 0.35);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-fab:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 24px rgba(16, 180, 157, 0.45);
}

.chat-fab.active {
  background: #ef4444;
  box-shadow: 0 4px 16px rgba(239, 68, 68, 0.3);
}

.fab-icon {
  line-height: 1;
}

/* Panel */
.chat-panel {
  position: absolute;
  bottom: 72px;
  right: 0;
  width: 380px;
  max-height: 520px;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--surface, #fff);
  border: 1px solid var(--border, #d9e2ec);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

/* Header */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: linear-gradient(135deg, var(--primary, #10b49d), var(--primary-strong, #0e9c87));
  color: #fff;
}

.chat-header-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chat-avatar {
  font-size: 28px;
}

.chat-header strong {
  font-size: 15px;
  display: block;
}

.chat-status {
  font-size: 11px;
  margin: 0;
  opacity: 0.9;
}

.chat-status.online::before,
.chat-status.ai::before {
  content: '';
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-right: 5px;
}

.chat-status.online::before {
  background: #4ade80;
}

.chat-status.ai::before {
  background: #fbbf24;
}

.chat-close {
  background: none;
  border: none;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.chat-close:hover {
  opacity: 1;
}

/* Tabs */
.chat-tabs {
  display: flex;
  border-bottom: 1px solid var(--border, #d9e2ec);
}

.tab {
  flex: 1;
  padding: 10px;
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  color: var(--muted, #5b6577);
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
}

.tab.active {
  color: var(--primary, #10b49d);
  border-bottom-color: var(--primary, #10b49d);
}

.tab:hover {
  background: rgba(16, 180, 157, 0.05);
}

/* Chat body */
.chat-body {
  flex: 1;
  overflow-y: auto;
  max-height: 340px;
  min-height: 200px;
}

.chat-body::-webkit-scrollbar {
  width: 5px;
}

.chat-body::-webkit-scrollbar-thumb {
  background: rgba(16, 180, 157, 0.25);
  border-radius: 3px;
}

/* Contato */
.contact-body {
  padding: 16px;
}

.contact-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.contact-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text, #1f2937);
  margin: 0 0 4px;
  text-align: center;
}

.contact-item,
.contact-hours {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border, #d9e2ec);
  border-radius: 12px;
  transition: border-color 0.2s, background 0.2s;
  text-decoration: none;
  color: inherit;
}

.contact-item:hover {
  border-color: var(--primary, #10b49d);
  background: rgba(16, 180, 157, 0.05);
}

.contact-icon {
  font-size: 22px;
  flex-shrink: 0;
}

.contact-label {
  display: block;
  font-size: 11px;
  color: var(--muted, #5b6577);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.contact-value {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--text, #1f2937);
  margin-top: 2px;
}

/* Messages */
.messages-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.msg {
  display: flex;
}

.msg-system {
  justify-content: center;
}

.msg-system p {
  background: rgba(16, 180, 157, 0.1);
  color: var(--muted, #5b6577);
  font-size: 12px;
  padding: 8px 14px;
  border-radius: 10px;
  text-align: center;
  margin: 0;
}

.msg-user {
  justify-content: flex-end;
}

.msg-ai,
.msg-admin {
  justify-content: flex-start;
}

.msg-bubble {
  max-width: 80%;
  padding: 10px 14px;
  border-radius: 14px;
  font-size: 13px;
  line-height: 1.4;
  position: relative;
}

.msg-bubble p {
  margin: 0;
  word-wrap: break-word;
}

.msg-user .msg-bubble {
  background: linear-gradient(135deg, var(--primary, #10b49d), var(--primary-strong, #0e9c87));
  color: #fff;
  border-bottom-right-radius: 4px;
}

.msg-ai .msg-bubble {
  background: var(--surface-2, #f0f5f7);
  color: var(--text, #1f2937);
  border-bottom-left-radius: 4px;
}

.msg-admin .msg-bubble {
  background: #dbeafe;
  color: #1e3a5f;
  border-bottom-left-radius: 4px;
}

.msg-time {
  font-size: 10px;
  opacity: 0.6;
  display: block;
  margin-top: 4px;
  text-align: right;
}

/* Typing indicator */
.typing {
  display: flex;
  gap: 4px;
  padding: 14px 18px;
}

.typing .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--muted, #5b6577);
  animation: typing-bounce 1.4s infinite ease-in-out;
}

.typing .dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing .dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing-bounce {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Input */
.chat-input {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid var(--border, #d9e2ec);
  background: var(--surface, #fff);
}

.chat-input input {
  flex: 1;
  border: 1px solid var(--border, #d9e2ec);
  border-radius: 20px;
  padding: 10px 16px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
  background: var(--surface-2, #f0f5f7);
  color: var(--text, #1f2937);
}

.chat-input input:focus {
  border-color: var(--primary, #10b49d);
}

.send-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, var(--primary, #10b49d), var(--primary-strong, #0e9c87));
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.05);
}

.send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Slide transition */
.chat-slide-enter-active,
.chat-slide-leave-active {
  transition: all 0.3s ease;
}

.chat-slide-enter-from,
.chat-slide-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

@media (max-width: 480px) {
  .chat-panel {
    width: calc(100vw - 48px);
    max-height: 70vh;
  }

  .help-chat {
    bottom: 16px;
    right: 16px;
  }
}
</style>

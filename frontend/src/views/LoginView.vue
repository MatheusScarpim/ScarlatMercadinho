<template>
  <div class="login">
    <div class="card glass">
      <div class="card-header">
        <img v-if="wl.logoUrl" :src="resolveAssetUrl(wl.logoUrl)" :alt="wl.brandName" class="login-logo" />
        <p class="eyebrow">{{ wl.labels.loginEyebrow }}</p>
        <h2>Entrar</h2>
      </div>
      <form @submit.prevent="submit" @input="resetIdleTimer" @keydown="resetIdleTimer">
        <label>Email</label>
        <input v-model="email" type="email" required />
        <label>Senha</label>
        <input v-model="password" type="password" required />
        <button type="submit">Entrar</button>
        <p v-if="error" class="error">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import wl, { resolveAssetUrl } from '../config/whitelabel';

const email = ref('');
const password = ref('');
const error = ref('');
const auth = useAuthStore();
const router = useRouter();

// Se o tablet ficar mais de 30s parado na tela de login, volta para o quiosque.
const IDLE_TIMEOUT = 30000;
let idleTimer: number | null = null;

function goToKiosk() {
  router.push('/kiosk');
}

function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = window.setTimeout(goToKiosk, IDLE_TIMEOUT);
}

onMounted(() => {
  resetIdleTimer();
});

onBeforeUnmount(() => {
  if (idleTimer) clearTimeout(idleTimer);
});

async function submit() {
  if (idleTimer) clearTimeout(idleTimer);
  try {
    await auth.login({ email: email.value, password: password.value });
    router.push('/admin/products');
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Falha no login';
    resetIdleTimer();
  }
}
</script>

<style scoped>
.login {
  display: grid;
  place-items: center;
  height: 100vh;
  background: radial-gradient(circle at 18% 18%, rgba(16, 180, 157, 0.1), transparent 26%),
    radial-gradient(circle at 80% 8%, rgba(14, 156, 135, 0.12), transparent 30%),
    #f6f8fb;
}
.card {
  padding: 28px 24px;
  border-radius: 14px;
  min-width: 340px;
  width: 380px;
}
.card-header {
  margin-bottom: 8px;
}
form {
  display: grid;
  gap: 12px;
}
label {
  display: block;
}
input {
  width: 100%;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: #fdfefe;
  color: var(--text);
}
button {
  margin-top: 8px;
  width: 100%;
  background: linear-gradient(120deg, var(--primary), var(--primary-strong));
  color: #fafdff;
  border: none;
  padding: 12px;
  border-radius: 10px;
}
.error {
  color: #c62828;
}
.login-logo {
  width: 64px;
  height: 64px;
  object-fit: contain;
  margin-bottom: 8px;
}
.eyebrow {
  text-transform: uppercase;
  letter-spacing: 2px;
  font-size: 12px;
  color: var(--primary);
  margin: 0 0 4px 0;
}
.glass {
  background: #fff;
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  backdrop-filter: blur(4px);
}
</style>

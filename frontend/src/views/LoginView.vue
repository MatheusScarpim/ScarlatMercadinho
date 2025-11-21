<template>
  <div class="login">
    <div class="card glass">
      <div class="card-header">
        <p class="eyebrow">painel</p>
        <h2>Entrar</h2>
      </div>
      <form @submit.prevent="submit">
        <label>Email</label>
        <input v-model="email" type="email" required />
        <label>Senha</label>
        <input v-model="password" type="password" required />
        <button type="submit">Entrar</button>
        <p v-if="error" class="error">{{ error }}</p>
      </form>
      <div class="hint">Use o admin padrão: admin@example.com / admin123</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const email = ref('');
const password = ref('');
const error = ref('');
const auth = useAuthStore();
const router = useRouter();

async function submit() {
  try {
    await auth.login({ email: email.value, password: password.value });
    router.push('/admin/products');
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Falha no login';
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
.hint {
  margin-top: 10px;
  font-size: 12px;
  color: var(--muted);
  text-align: center;
}
</style>

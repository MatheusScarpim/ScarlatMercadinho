import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './assets/base.css';
import { applyTheme, updateConfig } from './config/whitelabel';
import { fetchWhitelabel } from './services/settings';

// ─── MSW preview bootstrap ────────────────────────────────
// Seedea localStorage SINCRONO antes de Pinia inicializar (apps com store
// que le auth do localStorage no boot consideram-se logados → pula /auth/login).
// Worker start e async (sem top-level await pra cobrir target chrome87+).
if (import.meta.env.MODE === 'preview') {
  try {
    const _u = { id: 'preview-user', name: 'Preview User', email: 'preview@mathai.dev', role: 'ADMIN', permissions: ['*'] };
    const _t = 'preview-fake-token';
    localStorage.setItem('token', _t);
    localStorage.setItem('accessToken', _t);
    localStorage.setItem('auth_token', _t);
    localStorage.setItem('authToken', _t);
    localStorage.setItem('user', JSON.stringify(_u));
    localStorage.setItem('currentUser', JSON.stringify(_u));
    localStorage.setItem('auth', JSON.stringify({ token: _t, user: _u }));
  } catch { /* ignore */ }
  import('./mocks/preview/browser').then(({ worker }) => worker.start({ onUnhandledRequest: 'bypass' })).catch(() => { /* preview-only */ });
}

applyTheme();

const app = createApp(App);
app.use(createPinia());
app.use(router);

app.mount('#app');

// Carrega config do banco (não bloqueia o boot)
fetchWhitelabel()
  .then((cfg) => updateConfig(cfg))
  .catch(() => { /* usa defaults */ });

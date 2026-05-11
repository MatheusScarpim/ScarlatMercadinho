import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './assets/base.css';
import { applyTheme, updateConfig } from './config/whitelabel';
import { fetchWhitelabel } from './services/settings';

applyTheme();

if (import.meta.env.VITE_ENABLE_MSW) {
  const { worker } = await import('./mocks/browser');
  await worker.start();
}

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');

// Carrega config do banco (não bloqueia o boot)
fetchWhitelabel()
  .then((cfg) => updateConfig(cfg))
  .catch(() => { /* usa defaults */ });

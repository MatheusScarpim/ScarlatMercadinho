import axios from 'axios';
import { useAuthStore } from '../stores/auth';
import router from '../router';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
});

// Interceptor de requisição - adiciona o token
api.interceptors.request.use((config) => {
  const auth = useAuthStore();
  const currentPath = router.currentRoute.value.path;
  const isAdminArea = currentPath.startsWith('/admin');

  // O token de admin só é enviado dentro da área administrativa.
  // No quiosque um token de admin expirado causaria 401 nas rotas kioskOrAuth.
  if (auth.token && isAdminArea) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${auth.token}`;
  }
  const kioskToken = import.meta.env.VITE_KIOSK_TOKEN;
  if (kioskToken) {
    config.headers = config.headers || {};
    config.headers['x-kiosk-token'] = kioskToken;
  }
  return config;
});

// Interceptor de resposta - trata erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Se receber 401 (Unauthorized), significa que o token é inválido/expirado
    if (error.response?.status === 401) {
      const auth = useAuthStore();
      const currentPath = router.currentRoute.value.path;
      const isAdminArea = currentPath.startsWith('/admin');

      // Só faz logout/redirect dentro da área administrativa.
      // No quiosque (/kiosk, /calculadora) um 401 nunca deve levar à tela de login.
      if (auth.token && isAdminArea) {
        console.warn('[AUTH] Token inválido ou expirado. Fazendo logout...');
        auth.logout();
        router.push('/admin/login');
      }
    }
    return Promise.reject(error);
  }
);

export default api;

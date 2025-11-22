import axios from 'axios';
import { useAuthStore } from '../stores/auth';
import router from '../router';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
});

// Interceptor de requisição - adiciona o token
api.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth.token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${auth.token}`;
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

      // Só faz logout se estiver autenticado (evita loops em login)
      if (auth.token) {
        console.warn('[AUTH] Token inválido ou expirado. Fazendo logout...');
        auth.logout();
        router.push('/admin/login');
      }
    }
    return Promise.reject(error);
  }
);

export default api;

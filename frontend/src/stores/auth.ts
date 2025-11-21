import { defineStore } from 'pinia';
import api from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    user: (localStorage.getItem('user') && (JSON.parse(localStorage.getItem('user') as string) as User)) || null as User | null
  }),
  actions: {
    async login(payload: LoginPayload) {
      const { data } = await api.post('/auth/login', payload);
      this.token = data.token;
      this.user = data.user;
      localStorage.setItem('token', this.token);
      localStorage.setItem('user', JSON.stringify(this.user));
    },
    logout() {
      this.token = '';
      this.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }
});

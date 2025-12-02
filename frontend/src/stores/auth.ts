import { defineStore } from 'pinia';
import api from '../services/api';
import { PermissionKey } from '../constants/permissions';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'STAFF';
  permissions: PermissionKey[];
}

interface LoginPayload {
  email: string;
  password: string;
}

function loadStoredUser(): User | null {
  const stored = localStorage.getItem('user');
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored) as Partial<User>;
    if (!parsed || !parsed.id) return null;
    return {
      id: parsed.id,
      name: parsed.name || '',
      email: parsed.email || '',
      role: (parsed.role as User['role']) || 'STAFF',
      permissions: (Array.isArray(parsed.permissions) ? parsed.permissions : []) as PermissionKey[]
    };
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    user: loadStoredUser() as User | null
  }),
  actions: {
    async login(payload: LoginPayload) {
      const { data } = await api.post('/auth/login', payload);
      this.token = data.token;
      this.user = {
        ...data.user,
        permissions: (data.user.permissions || []) as PermissionKey[]
      };
      localStorage.setItem('token', this.token);
      localStorage.setItem('user', JSON.stringify(this.user));
    },
    logout() {
      this.token = '';
      this.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    hasPermission(permission: PermissionKey) {
      if (!this.user) return false;
      if (this.user.role === 'ADMIN') return true;
      return this.user.permissions?.includes(permission) || false;
    }
  }
});

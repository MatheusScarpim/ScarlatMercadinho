import { defineStore } from 'pinia';
import api from '../services/api';

export interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export const useNotificationStore = defineStore('notifications', {
  state: () => ({
    items: [] as Notification[],
    unread: 0
  }),
  actions: {
    async fetchUnread() {
      const { data } = await api.get('/notifications/unread-count');
      this.unread = data.unreadCount || 0;
    },
    async fetchAll() {
      const { data } = await api.get('/notifications');
      this.items = data;
      this.unread = data.filter((n: Notification) => !n.read).length;
    },
    async markAllRead() {
      await api.put('/notifications/mark-all-read');
      this.items = this.items.map((n) => ({ ...n, read: true }));
      this.unread = 0;
    },
    async markRead(id: string) {
      await api.put(`/notifications/${id}/read`);
      this.items = this.items.map((n) => (n._id === id ? { ...n, read: true } : n));
      this.unread = this.items.filter((n) => !n.read).length;
    }
  }
});

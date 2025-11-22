import { defineStore } from 'pinia';
import api from '../services/api';

export interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  location?: string;
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
      try {
        const { data } = await api.get('/notifications/unread-count');
        this.unread = data.unreadCount || 0;
        console.log('[NOTIFICATIONS] Fetched unread count:', this.unread);
      } catch (error) {
        console.error('[NOTIFICATIONS] Error fetching unread count:', error);
        throw error;
      }
    },
    async fetchAll() {
      try {
        const { data } = await api.get('/notifications');
        this.items = data;
        this.unread = data.filter((n: Notification) => !n.read).length;
        console.log('[NOTIFICATIONS] Fetched all notifications:', data.length);
      } catch (error) {
        console.error('[NOTIFICATIONS] Error fetching notifications:', error);
        throw error;
      }
    },
    async markAllRead() {
      try {
        await api.put('/notifications/mark-all-read');
        this.items = this.items.map((n) => ({ ...n, read: true }));
        this.unread = 0;
        console.log('[NOTIFICATIONS] Marked all as read');
      } catch (error) {
        console.error('[NOTIFICATIONS] Error marking all as read:', error);
        throw error;
      }
    },
    async markRead(id: string) {
      try {
        await api.put(`/notifications/${id}/read`);
        this.items = this.items.map((n) => (n._id === id ? { ...n, read: true } : n));
        this.unread = this.items.filter((n) => !n.read).length;
        console.log('[NOTIFICATIONS] Marked notification as read:', id);
      } catch (error) {
        console.error('[NOTIFICATIONS] Error marking notification as read:', error);
        throw error;
      }
    },
    async deleteAll() {
      try {
        await api.delete('/notifications/all');
        this.items = [];
        this.unread = 0;
        console.log('[NOTIFICATIONS] Deleted all notifications');
      } catch (error) {
        console.error('[NOTIFICATIONS] Error deleting all notifications:', error);
        throw error;
      }
    }
  }
});

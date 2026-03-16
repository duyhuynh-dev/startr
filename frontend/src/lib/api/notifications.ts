import apiClient, { getErrorMessage } from '../api-client';
import type { NotificationsListResponse, Notification, UnreadCountResponse } from './types';

export const notificationsApi = {
  async list(params?: { limit?: number; cursor?: string }): Promise<NotificationsListResponse> {
    try {
      const response = await apiClient.get<NotificationsListResponse>('/notifications', { params });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  async unreadCount(): Promise<number> {
    try {
      const response = await apiClient.get<UnreadCountResponse>('/notifications/unread-count');
      return response.data.unread_count;
    } catch {
      return 0;
    }
  },

  async markRead(notificationId: string): Promise<Notification> {
    try {
      const response = await apiClient.post<Notification>(`/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  async markAllRead(): Promise<{ marked_read: number }> {
    try {
      const response = await apiClient.post<{ marked_read: number }>(`/notifications/mark-all-read`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
};


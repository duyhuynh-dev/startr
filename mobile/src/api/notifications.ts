import apiClient from './client';

export interface NotificationItem {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export async function getNotifications(limit = 50): Promise<NotificationItem[]> {
  const res = await apiClient.get<NotificationItem[]>('/notifications', { params: { limit } });
  return res.data;
}

export async function getUnreadCount(): Promise<number> {
  const res = await apiClient.get<{ unread_count: number }>('/notifications/unread-count');
  return res.data.unread_count;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.post(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.post('/notifications/mark-all-read');
}

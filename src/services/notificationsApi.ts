import { Notification } from '@/types';
import { apiRequest } from './apiClient';

type NotificationPayload = Pick<
  Notification,
  'id' | 'userId' | 'titleAr' | 'titleEn' | 'messageAr' | 'messageEn' | 'type' | 'link' | 'isRead' | 'createdAt'
>;

interface WriteResponse {
  success?: boolean;
  item?: unknown;
  error?: string;
}

interface DeleteResponse {
  success?: boolean;
  error?: string;
}

export const notificationsApi = {
  getNotifications: async (): Promise<Notification[]> => {
    const response = await apiRequest<unknown>('/api/notifications');
    return Array.isArray(response) ? response.map(normalizeNotification) : [];
  },

  createNotification: async (notification: NotificationPayload): Promise<Notification> => {
    const response = await apiRequest<unknown>('/api/notifications', {
      method: 'POST',
      body: notification,
    });
    return unwrapNotification(response);
  },

  updateNotification: async (id: string, notification: Partial<NotificationPayload>): Promise<Notification> => {
    const response = await apiRequest<unknown>(`/api/notifications/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: notification,
    });
    return unwrapNotification(response);
  },

  deleteNotification: async (id: string): Promise<void> => {
    const response = await apiRequest<unknown>(`/api/notifications/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    if (response && typeof response === 'object') {
      const result = response as DeleteResponse;
      if (result.success === false) {
        throw new Error(result.error || 'Notification could not be deleted');
      }
    }
  },
};

const unwrapNotification = (response: unknown): Notification => {
  if (response && typeof response === 'object') {
    const result = response as WriteResponse;
    if (result.success === false) {
      throw new Error(result.error || 'Notification could not be saved');
    }
    if (result.item) {
      return normalizeNotification(result.item);
    }
  }

  return normalizeNotification(response);
};

const normalizeNotification = (value: unknown): Notification => {
  const item = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    id: stringValue(item.id),
    userId: stringValue(item.userId),
    titleAr: stringValue(item.titleAr),
    titleEn: stringValue(item.titleEn),
    messageAr: stringValue(item.messageAr),
    messageEn: stringValue(item.messageEn),
    type: normalizeType(item.type),
    link: optionalStringValue(item.link),
    isRead: booleanValue(item.isRead),
    createdAt: stringValue(item.createdAt),
  };
};

const stringValue = (value: unknown): string =>
  typeof value === 'string' ? value : value == null ? '' : String(value);

const optionalStringValue = (value: unknown): string | undefined => {
  const normalized = stringValue(value);
  return normalized ? normalized : undefined;
};

const booleanValue = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return ['1', 'true', 'yes', 'y'].includes(value.trim().toLowerCase());
  return false;
};

const normalizeType = (value: unknown): Notification['type'] => {
  const normalized = stringValue(value);
  return ['incident_assignment', 'procedure_assignment', 'expiry_reminder', 'overdue_alert', 'general', 'security'].includes(normalized)
    ? normalized as Notification['type']
    : 'general';
};

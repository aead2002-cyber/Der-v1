import { NotificationTemplate } from '@/types';
import { apiRequest } from './apiClient';

type NotificationTemplatePayload = Pick<NotificationTemplate, 'id' | 'name' | 'subject' | 'body' | 'type'>;

interface WriteResponse {
  success?: boolean;
  item?: unknown;
  error?: string;
}

interface DeleteResponse {
  success?: boolean;
  error?: string;
}

export const notificationTemplatesApi = {
  getNotificationTemplates: async (): Promise<NotificationTemplate[]> => {
    const response = await apiRequest<unknown>('/api/notificationTemplates');
    return Array.isArray(response) ? response.map(normalizeNotificationTemplate) : [];
  },

  createNotificationTemplate: async (template: NotificationTemplatePayload): Promise<NotificationTemplate> => {
    const response = await apiRequest<unknown>('/api/notificationTemplates', {
      method: 'POST',
      body: template,
    });
    return unwrapNotificationTemplate(response);
  },

  updateNotificationTemplate: async (id: string, template: NotificationTemplatePayload): Promise<NotificationTemplate> => {
    const response = await apiRequest<unknown>(`/api/notificationTemplates/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: template,
    });
    return unwrapNotificationTemplate(response);
  },

  deleteNotificationTemplate: async (id: string): Promise<void> => {
    const response = await apiRequest<unknown>(`/api/notificationTemplates/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    if (response && typeof response === 'object') {
      const result = response as DeleteResponse;
      if (result.success === false) {
        throw new Error(result.error || 'Notification template could not be deleted');
      }
    }
  },
};

const unwrapNotificationTemplate = (response: unknown): NotificationTemplate => {
  if (response && typeof response === 'object') {
    const result = response as WriteResponse;
    if (result.success === false) {
      throw new Error(result.error || 'Notification template could not be saved');
    }
    if (result.item) {
      return normalizeNotificationTemplate(result.item);
    }
  }

  return normalizeNotificationTemplate(response);
};

const normalizeNotificationTemplate = (value: unknown): NotificationTemplate => {
  const item = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    id: stringValue(item.id),
    name: stringValue(item.name),
    subject: stringValue(item.subject),
    body: stringValue(item.body),
    type: (stringValue(item.type) || 'assignment') as NotificationTemplate['type'],
  };
};

const stringValue = (value: unknown): string =>
  typeof value === 'string' ? value : value == null ? '' : String(value);

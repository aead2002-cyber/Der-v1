import { Notification } from '@/types';
import { notificationsApi } from '@/modules/der3/services/notificationsApi';

export type NotificationDispatchInput = Omit<Notification, 'id' | 'createdAt' | 'isRead'>;

export type NotificationDispatchOptions = {
  skipEmail?: boolean;
};

export async function dispatchNotification(
  notification: NotificationDispatchInput,
  options: NotificationDispatchOptions = {}
): Promise<Notification> {
  const payload: Notification = {
    ...notification,
    id: Math.random().toString(36).substr(2, 9),
    isRead: false,
    createdAt: new Date().toISOString(),
  };

  // TODO: Rebuild the email/log side effects with a backend-backed
  // notification delivery flow if the product still needs them.
  void options.skipEmail;

  return notificationsApi.createNotification(payload);
}

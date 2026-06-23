import { NotificationSettings } from '@/types';

const NOTIFICATION_SETTINGS_KEY = 'der3_notification_settings';

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  notifyBeforeDays: 30,
  emailNotificationsEnabled: true,
  ccAdmin: false,
  notifyOnAssignment: true,
  procedureExpiryNotificationDays: 7,
};

export const getNotificationSettings = (): NotificationSettings => {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_NOTIFICATION_SETTINGS };
  }

  const raw = window.localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
  if (!raw) {
    return { ...DEFAULT_NOTIFICATION_SETTINGS };
  }

  return JSON.parse(raw) as NotificationSettings;
};

export const saveNotificationSettings = (settings: NotificationSettings): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
};

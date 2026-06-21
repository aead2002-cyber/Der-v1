import { AuditLog } from '@/types';
import { apiRequest } from './apiClient';

type AuditLogPayload = Pick<
  AuditLog,
  'id' | 'userId' | 'userName' | 'action' | 'entityType' | 'entityId' | 'oldValue' | 'newValue' | 'timestamp' | 'ip' | 'userAgent'
>;

interface WriteResponse {
  success?: boolean;
  item?: unknown;
  error?: string;
}

export const auditLogsApi = {
  getAuditLogs: async (): Promise<AuditLog[]> => {
    const response = await apiRequest<unknown>('/api/auditLogs');
    return Array.isArray(response) ? response.map(normalizeAuditLog) : [];
  },

  createAuditLog: async (log: AuditLogPayload): Promise<AuditLog> => {
    const response = await apiRequest<unknown>('/api/auditLogs', {
      method: 'POST',
      body: log,
    });
    return unwrapAuditLog(response);
  },
};

const unwrapAuditLog = (response: unknown): AuditLog => {
  if (response && typeof response === 'object') {
    const result = response as WriteResponse;
    if (result.success === false) {
      throw new Error(result.error || 'Audit log could not be saved');
    }
    if (result.item) {
      return normalizeAuditLog(result.item);
    }
  }

  return normalizeAuditLog(response);
};

const normalizeAuditLog = (value: unknown): AuditLog => {
  const item = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    id: stringValue(item.id),
    userId: stringValue(item.userId),
    userName: stringValue(item.userName),
    action: stringValue(item.action) as AuditLog['action'],
    entityType: stringValue(item.entityType) as AuditLog['entityType'],
    entityId: stringValue(item.entityId),
    oldValue: parseJsonValue(item.oldValue),
    newValue: parseJsonValue(item.newValue),
    timestamp: item.timestamp ?? '',
    ip: optionalStringValue(item.ip),
    userAgent: optionalStringValue(item.userAgent),
  };
};

const parseJsonValue = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  if (!value.trim()) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const stringValue = (value: unknown): string =>
  typeof value === 'string' ? value : value == null ? '' : String(value);

const optionalStringValue = (value: unknown): string | undefined => {
  const normalized = stringValue(value);
  return normalized ? normalized : undefined;
};

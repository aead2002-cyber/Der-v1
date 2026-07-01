import { LookupOption, SecurityIncident } from '@/types';
import { apiBaseUrl, apiRequest } from './apiClient';

export type PublicIncidentPayload = Pick<
  SecurityIncident,
  'reporterEmail' | 'title' | 'description' | 'type' | 'priority' | 'attachments'
>;

export type PublicIncidentAntiAbusePayload = {
  honeypot?: string;
  formStartedAtUtc?: string;
  clientElapsedMs?: number;
};

interface WriteResponse {
  success?: boolean;
  item?: unknown;
  error?: string;
}

interface FileUploadResponse {
  url: string;
  name: string;
  size: number;
  mimeType: string;
}

export const publicApi = {
  getLookupOptions: async (category?: string): Promise<LookupOption[]> => {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    const response = await apiRequest<unknown>(`/api/public/lookupOptions${query}`, { auth: false });
    return Array.isArray(response) ? response.map(normalizeLookupOption) : [];
  },

  createIncident: async (incident: PublicIncidentPayload & PublicIncidentAntiAbusePayload): Promise<SecurityIncident> => {
    const response = await apiRequest<unknown>('/api/public/incidents', {
      method: 'POST',
      body: incident,
      auth: false,
    });
    return unwrapIncident(response);
  },

  uploadFile: async (file: File): Promise<FileUploadResponse> => {
    const form = new FormData();
    form.append('file', file);
    const response = await fetch(`${apiBaseUrl}/api/public/uploads`, {
      method: 'POST',
      body: form,
    });
    const text = await response.text();
    const data = text ? parseJson(text) : null;
    if (!response.ok) {
      throw new Error(extractErrorMessage(data, `Upload failed (${response.status})`));
    }
    return data as FileUploadResponse;
  },
};

const unwrapIncident = (response: unknown): SecurityIncident => {
  if (response && typeof response === 'object') {
    const result = response as WriteResponse;
    if (result.success === false) {
      throw new Error(result.error || 'Incident could not be submitted');
    }
    if (result.item) {
      return normalizeIncident(result.item);
    }
  }
  return normalizeIncident(response);
};

const normalizeIncident = (value: unknown): SecurityIncident => {
  const item = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    id: stringValue(item.id),
    reporterEmail: stringValue(item.reporterEmail),
    title: stringValue(item.title),
    description: stringValue(item.description),
    type: stringValue(item.type) || 'other',
    priority: normalizePriority(item.priority),
    status: normalizeStatus(item.status),
    reportedAt: stringValue(item.reportedAt),
    assignedTo: optionalStringValue(item.assignedTo),
    updatedAt: stringValue(item.updatedAt),
    closedAt: optionalStringValue(item.closedAt),
    attachments: stringArrayValue(item.attachments),
  };
};

const normalizeLookupOption = (value: unknown): LookupOption => {
  const item = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    id: stringValue(item.id),
    category: stringValue(item.category),
    value: stringValue(item.value),
    labelAr: stringValue(item.labelAr),
    labelEn: stringValue(item.labelEn),
    isActive: booleanValue(item.isActive),
    descriptionAr: optionalStringValue(item.descriptionAr),
    descriptionEn: optionalStringValue(item.descriptionEn),
  };
};

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const extractErrorMessage = (data: unknown, fallback: string): string => {
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    if (typeof record.error === 'string') return record.error;
    if (typeof record.message === 'string') return record.message;
  }
  return fallback;
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

const normalizePriority = (value: unknown): SecurityIncident['priority'] => {
  const normalized = stringValue(value);
  return ['critical', 'high', 'medium', 'low'].includes(normalized)
    ? normalized as SecurityIncident['priority']
    : 'medium';
};

const normalizeStatus = (value: unknown): SecurityIncident['status'] => {
  const normalized = stringValue(value);
  return ['new', 'open', 'investigating', 'resolved', 'closed'].includes(normalized)
    ? normalized as SecurityIncident['status']
    : 'new';
};

const stringArrayValue = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
    } catch {
      return value.split(',').map(item => item.trim()).filter(Boolean);
    }
  }
  return [];
};

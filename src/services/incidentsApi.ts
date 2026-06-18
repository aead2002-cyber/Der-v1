import { SecurityIncident } from '@/types';
import { apiRequest } from './apiClient';

type IncidentPayload = Pick<
  SecurityIncident,
  | 'id'
  | 'reporterEmail'
  | 'title'
  | 'description'
  | 'type'
  | 'priority'
  | 'status'
  | 'reportedAt'
  | 'assignedTo'
  | 'updatedAt'
  | 'closedAt'
  | 'attachments'
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

export const incidentsApi = {
  getIncidents: async (): Promise<SecurityIncident[]> => {
    const response = await apiRequest<unknown>('/api/incidents');
    return Array.isArray(response) ? response.map(normalizeIncident) : [];
  },

  createIncident: async (incident: IncidentPayload): Promise<SecurityIncident> => {
    const response = await apiRequest<unknown>('/api/incidents', {
      method: 'POST',
      body: incident,
    });
    return unwrapIncident(response);
  },

  updateIncident: async (id: string, incident: IncidentPayload): Promise<SecurityIncident> => {
    const response = await apiRequest<unknown>(`/api/incidents/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: incident,
    });
    return unwrapIncident(response);
  },

  deleteIncident: async (id: string): Promise<void> => {
    const response = await apiRequest<unknown>(`/api/incidents/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    if (response && typeof response === 'object') {
      const result = response as DeleteResponse;
      if (result.success === false) {
        throw new Error(result.error || 'Incident could not be deleted');
      }
    }
  },
};

const unwrapIncident = (response: unknown): SecurityIncident => {
  if (response && typeof response === 'object') {
    const result = response as WriteResponse;
    if (result.success === false) {
      throw new Error(result.error || 'Incident could not be saved');
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

const stringValue = (value: unknown): string =>
  typeof value === 'string' ? value : value == null ? '' : String(value);

const optionalStringValue = (value: unknown): string | undefined => {
  const normalized = stringValue(value);
  return normalized ? normalized : undefined;
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

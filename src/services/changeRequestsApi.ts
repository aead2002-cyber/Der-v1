import { ChangeRequest } from '@/types';
import { apiRequest } from './apiClient';

type ChangeRequestPayload = Pick<
  ChangeRequest,
  | 'id'
  | 'title'
  | 'description'
  | 'type'
  | 'senderId'
  | 'senderName'
  | 'receiverId'
  | 'receiverName'
  | 'status'
  | 'attachments'
  | 'history'
  | 'createdAt'
  | 'updatedAt'
>;

interface WriteResponse {
  success?: boolean;
  item?: unknown;
  error?: string;
}

export const changeRequestsApi = {
  getChangeRequests: async (): Promise<ChangeRequest[]> => {
    const response = await apiRequest<unknown>('/api/changeRequests');
    return Array.isArray(response) ? response.map(normalizeChangeRequest) : [];
  },

  createChangeRequest: async (request: ChangeRequestPayload): Promise<ChangeRequest> => {
    const response = await apiRequest<unknown>('/api/changeRequests', {
      method: 'POST',
      body: request,
    });
    return unwrapChangeRequest(response);
  },

  updateChangeRequest: async (id: string, request: ChangeRequestPayload): Promise<ChangeRequest> => {
    const response = await apiRequest<unknown>(`/api/changeRequests/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: request,
    });
    return unwrapChangeRequest(response);
  },
};

const unwrapChangeRequest = (response: unknown): ChangeRequest => {
  if (response && typeof response === 'object') {
    const result = response as WriteResponse;
    if (result.success === false) {
      throw new Error(result.error || 'Change request could not be saved');
    }
    if (result.item) {
      return normalizeChangeRequest(result.item);
    }
  }

  return normalizeChangeRequest(response);
};

const normalizeChangeRequest = (value: unknown): ChangeRequest => {
  const item = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    id: stringValue(item.id),
    title: stringValue(item.title),
    description: stringValue(item.description),
    type: stringValue(item.type) as ChangeRequest['type'],
    senderId: stringValue(item.senderId),
    senderName: stringValue(item.senderName),
    receiverId: stringValue(item.receiverId),
    receiverName: stringValue(item.receiverName),
    status: stringValue(item.status) as ChangeRequest['status'],
    attachments: stringArrayValue(item.attachments),
    history: arrayValue(item.history) as ChangeRequest['history'],
    createdAt: stringValue(item.createdAt),
    updatedAt: stringValue(item.updatedAt),
  };
};

const stringValue = (value: unknown): string =>
  typeof value === 'string' ? value : value == null ? '' : String(value);

const arrayValue = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const stringArrayValue = (value: unknown): string[] =>
  arrayValue(value).filter((item): item is string => typeof item === 'string');

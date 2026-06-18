import { IncidentNote } from '@/types';
import { apiRequest } from './apiClient';

type IncidentNotePayload = Pick<
  IncidentNote,
  'id' | 'incidentId' | 'authorId' | 'authorName' | 'content' | 'createdAt' | 'attachments'
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

export const incidentNotesApi = {
  getIncidentNotes: async (): Promise<IncidentNote[]> => {
    const response = await apiRequest<unknown>('/api/incidentNotes');
    return Array.isArray(response) ? response.map(normalizeIncidentNote) : [];
  },

  createIncidentNote: async (note: IncidentNotePayload): Promise<IncidentNote> => {
    const response = await apiRequest<unknown>('/api/incidentNotes', {
      method: 'POST',
      body: note,
    });
    return unwrapIncidentNote(response);
  },

  updateIncidentNote: async (id: string, note: IncidentNotePayload): Promise<IncidentNote> => {
    const response = await apiRequest<unknown>(`/api/incidentNotes/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: note,
    });
    return unwrapIncidentNote(response);
  },

  deleteIncidentNote: async (id: string): Promise<void> => {
    const response = await apiRequest<unknown>(`/api/incidentNotes/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    if (response && typeof response === 'object') {
      const result = response as DeleteResponse;
      if (result.success === false) {
        throw new Error(result.error || 'Incident note could not be deleted');
      }
    }
  },
};

const unwrapIncidentNote = (response: unknown): IncidentNote => {
  if (response && typeof response === 'object') {
    const result = response as WriteResponse;
    if (result.success === false) {
      throw new Error(result.error || 'Incident note could not be saved');
    }
    if (result.item) {
      return normalizeIncidentNote(result.item);
    }
  }

  return normalizeIncidentNote(response);
};

const normalizeIncidentNote = (value: unknown): IncidentNote => {
  const item = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    id: stringValue(item.id),
    incidentId: stringValue(item.incidentId),
    authorId: stringValue(item.authorId),
    authorName: stringValue(item.authorName),
    content: stringValue(item.content),
    createdAt: stringValue(item.createdAt),
    attachments: stringArrayValue(item.attachments),
  };
};

const stringValue = (value: unknown): string =>
  typeof value === 'string' ? value : value == null ? '' : String(value);

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

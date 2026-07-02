import { IncidentFeedback } from '@/types';
import { apiRequest } from '@/services/apiClient';

type IncidentFeedbackPayload = Pick<IncidentFeedback, 'id' | 'incidentId' | 'rating' | 'comment' | 'submittedAt'>;

interface WriteResponse {
  success?: boolean;
  item?: unknown;
  error?: string;
}

interface DeleteResponse {
  success?: boolean;
  error?: string;
}

export const incidentFeedbackApi = {
  getIncidentFeedback: async (): Promise<IncidentFeedback[]> => {
    const response = await apiRequest<unknown>('/api/incidentFeedback');
    return Array.isArray(response) ? response.map(normalizeIncidentFeedback) : [];
  },

  createIncidentFeedback: async (feedback: IncidentFeedbackPayload): Promise<IncidentFeedback> => {
    const response = await apiRequest<unknown>('/api/incidentFeedback', {
      method: 'POST',
      body: feedback,
    });
    return unwrapIncidentFeedback(response);
  },

  updateIncidentFeedback: async (id: string, feedback: IncidentFeedbackPayload): Promise<IncidentFeedback> => {
    const response = await apiRequest<unknown>(`/api/incidentFeedback/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: feedback,
    });
    return unwrapIncidentFeedback(response);
  },

  deleteIncidentFeedback: async (id: string): Promise<void> => {
    const response = await apiRequest<unknown>(`/api/incidentFeedback/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    if (response && typeof response === 'object') {
      const result = response as DeleteResponse;
      if (result.success === false) {
        throw new Error(result.error || 'Incident feedback could not be deleted');
      }
    }
  },
};

const unwrapIncidentFeedback = (response: unknown): IncidentFeedback => {
  if (response && typeof response === 'object') {
    const result = response as WriteResponse;
    if (result.success === false) {
      throw new Error(result.error || 'Incident feedback could not be saved');
    }
    if (result.item) {
      return normalizeIncidentFeedback(result.item);
    }
  }

  return normalizeIncidentFeedback(response);
};

const normalizeIncidentFeedback = (value: unknown): IncidentFeedback => {
  const item = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    id: stringValue(item.id),
    incidentId: stringValue(item.incidentId),
    rating: numberValue(item.rating, 0),
    comment: stringValue(item.comment),
    submittedAt: stringValue(item.submittedAt),
  };
};

const stringValue = (value: unknown): string =>
  typeof value === 'string' ? value : value == null ? '' : String(value);

const numberValue = (value: unknown, fallback: number): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

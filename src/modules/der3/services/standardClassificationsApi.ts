import { StandardClassification } from '@/types';
import { apiRequest } from '@/services/apiClient';

type StandardClassificationPayload = Pick<StandardClassification, 'id' | 'nameAr' | 'nameEn' | 'createdAt' | 'updatedAt'>;

interface WriteResponse {
  success?: boolean;
  item?: unknown;
  error?: string;
}

interface DeleteResponse {
  success?: boolean;
  error?: string;
}

export const standardClassificationsApi = {
  getStandardClassifications: async (): Promise<StandardClassification[]> => {
    const response = await apiRequest<unknown>('/api/standardClassifications');
    return Array.isArray(response) ? response.map(normalizeStandardClassification) : [];
  },

  createStandardClassification: async (classification: StandardClassificationPayload): Promise<StandardClassification> => {
    const response = await apiRequest<unknown>('/api/standardClassifications', {
      method: 'POST',
      body: classification,
    });
    return unwrapStandardClassification(response);
  },

  updateStandardClassification: async (id: string, classification: StandardClassificationPayload): Promise<StandardClassification> => {
    const response = await apiRequest<unknown>(`/api/standardClassifications/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: classification,
    });
    return unwrapStandardClassification(response);
  },

  deleteStandardClassification: async (id: string): Promise<void> => {
    const response = await apiRequest<unknown>(`/api/standardClassifications/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    if (response && typeof response === 'object') {
      const result = response as DeleteResponse;
      if (result.success === false) {
        throw new Error(result.error || 'Standard classification could not be deleted');
      }
    }
  },
};

const unwrapStandardClassification = (response: unknown): StandardClassification => {
  if (response && typeof response === 'object') {
    const result = response as WriteResponse;
    if (result.success === false) {
      throw new Error(result.error || 'Standard classification could not be saved');
    }
    if (result.item) {
      return normalizeStandardClassification(result.item);
    }
  }

  return normalizeStandardClassification(response);
};

const normalizeStandardClassification = (value: unknown): StandardClassification => {
  const item = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    id: stringValue(item.id),
    nameAr: stringValue(item.nameAr),
    nameEn: stringValue(item.nameEn),
    createdAt: item.createdAt ?? '',
    updatedAt: item.updatedAt ?? '',
  };
};

const stringValue = (value: unknown): string =>
  typeof value === 'string' ? value : value == null ? '' : String(value);

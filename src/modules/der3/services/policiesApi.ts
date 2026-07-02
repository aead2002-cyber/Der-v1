import { Policy } from '@/types';
import { apiRequest } from '@/services/apiClient';

type PolicyPayload = Pick<Policy, 'id' | 'nameAr' | 'nameEn' | 'descriptionAr' | 'descriptionEn' | 'frameworkId' | 'createdAt' | 'updatedAt'>;

interface WriteResponse {
  success?: boolean;
  item?: unknown;
  error?: string;
}

interface DeleteResponse {
  success?: boolean;
  error?: string;
}

export const policiesApi = {
  getPolicies: async (): Promise<Policy[]> => {
    const response = await apiRequest<unknown>('/api/policies');
    return Array.isArray(response) ? response.map(normalizePolicy) : [];
  },

  createPolicy: async (policy: PolicyPayload): Promise<Policy> => {
    const response = await apiRequest<unknown>('/api/policies', {
      method: 'POST',
      body: policy,
    });
    return unwrapPolicy(response);
  },

  updatePolicy: async (id: string, policy: PolicyPayload): Promise<Policy> => {
    const response = await apiRequest<unknown>(`/api/policies/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: policy,
    });
    return unwrapPolicy(response);
  },

  deletePolicy: async (id: string): Promise<void> => {
    const response = await apiRequest<unknown>(`/api/policies/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    if (response && typeof response === 'object') {
      const result = response as DeleteResponse;
      if (result.success === false) {
        throw new Error(result.error || 'Policy could not be deleted');
      }
    }
  },
};

const unwrapPolicy = (response: unknown): Policy => {
  if (response && typeof response === 'object') {
    const result = response as WriteResponse;
    if (result.success === false) {
      throw new Error(result.error || 'Policy could not be saved');
    }
    if (result.item) {
      return normalizePolicy(result.item);
    }
  }

  return normalizePolicy(response);
};

const normalizePolicy = (value: unknown): Policy => {
  const item = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    id: stringValue(item.id),
    nameAr: stringValue(item.nameAr),
    nameEn: stringValue(item.nameEn),
    descriptionAr: stringValue(item.descriptionAr),
    descriptionEn: stringValue(item.descriptionEn),
    frameworkId: stringValue(item.frameworkId),
    createdAt: item.createdAt ?? '',
    updatedAt: item.updatedAt ?? '',
  };
};

const stringValue = (value: unknown): string =>
  typeof value === 'string' ? value : value == null ? '' : String(value);

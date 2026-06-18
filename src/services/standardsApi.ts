import { Standard } from '@/types';
import { apiRequest } from './apiClient';

type StandardPayload = Pick<Standard, 'id' | 'policyId' | 'nameAr' | 'nameEn' | 'descriptionAr' | 'descriptionEn' | 'classifications' | 'attachments' | 'createdAt' | 'updatedAt'> & {
  policyItemId?: string;
  policyItemIds?: string[];
  potentialRisksAr?: string;
  potentialRisksEn?: string;
};

interface WriteResponse {
  success?: boolean;
  item?: unknown;
  error?: string;
}

interface DeleteResponse {
  success?: boolean;
  error?: string;
}

export const standardsApi = {
  getStandards: async (): Promise<Standard[]> => {
    const response = await apiRequest<unknown>('/api/standards');
    return Array.isArray(response) ? response.map(normalizeStandard) : [];
  },

  createStandard: async (standard: StandardPayload): Promise<Standard> => {
    const response = await apiRequest<unknown>('/api/standards', {
      method: 'POST',
      body: standard,
    });
    return unwrapStandard(response);
  },

  updateStandard: async (id: string, standard: StandardPayload): Promise<Standard> => {
    const response = await apiRequest<unknown>(`/api/standards/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: standard,
    });
    return unwrapStandard(response);
  },

  deleteStandard: async (id: string): Promise<void> => {
    const response = await apiRequest<unknown>(`/api/standards/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    if (response && typeof response === 'object') {
      const result = response as DeleteResponse;
      if (result.success === false) {
        throw new Error(result.error || 'Standard could not be deleted');
      }
    }
  },
};

const unwrapStandard = (response: unknown): Standard => {
  if (response && typeof response === 'object') {
    const result = response as WriteResponse;
    if (result.success === false) {
      throw new Error(result.error || 'Standard could not be saved');
    }
    if (result.item) {
      return normalizeStandard(result.item);
    }
  }

  return normalizeStandard(response);
};

export const normalizeStandard = (value: unknown): Standard => {
  const item = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    id: stringValue(item.id),
    policyId: stringValue(item.policyId),
    policyItemId: optionalStringValue(item.policyItemId),
    policyItemIds: stringArrayValue(item.policyItemIds),
    nameAr: stringValue(item.nameAr),
    nameEn: stringValue(item.nameEn),
    descriptionAr: stringValue(item.descriptionAr),
    descriptionEn: stringValue(item.descriptionEn),
    potentialRisksAr: optionalStringValue(item.potentialRisksAr),
    potentialRisksEn: optionalStringValue(item.potentialRisksEn),
    classifications: stringArrayValue(item.classifications),
    attachments: stringArrayValue(item.attachments),
    createdAt: item.createdAt ?? '',
    updatedAt: item.updatedAt ?? '',
  };
};

const stringValue = (value: unknown): string =>
  typeof value === 'string' ? value : value == null ? '' : String(value);

const optionalStringValue = (value: unknown): string | undefined => {
  const normalized = stringValue(value);
  return normalized ? normalized : undefined;
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
      return [];
    }
  }

  return [];
};

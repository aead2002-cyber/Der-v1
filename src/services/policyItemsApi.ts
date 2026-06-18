import { PolicyItem, Standard } from '@/types';
import { apiRequest } from './apiClient';

type PolicyItemPayload = Pick<PolicyItem, 'id' | 'policyId' | 'nameAr' | 'nameEn' | 'descriptionAr' | 'descriptionEn' | 'order' | 'createdAt' | 'updatedAt'> & {
  parentId?: string;
  attachments?: string[];
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

export const policyItemsApi = {
  getPolicyItems: async (policyId?: string): Promise<PolicyItem[]> => {
    const response = await apiRequest<unknown>('/api/policyItems');
    const items = Array.isArray(response) ? response.map(normalizePolicyItem) : [];
    return policyId ? items.filter(item => item.policyId === policyId) : items;
  },

  createPolicyItem: async (item: PolicyItemPayload): Promise<PolicyItem> => {
    const response = await apiRequest<unknown>('/api/policyItems', {
      method: 'POST',
      body: item,
    });
    return unwrapPolicyItem(response);
  },

  updatePolicyItem: async (id: string, item: PolicyItemPayload): Promise<PolicyItem> => {
    const response = await apiRequest<unknown>(`/api/policyItems/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: item,
    });
    return unwrapPolicyItem(response);
  },

  deletePolicyItem: async (id: string): Promise<void> => {
    const response = await apiRequest<unknown>(`/api/policyItems/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    if (response && typeof response === 'object') {
      const result = response as DeleteResponse;
      if (result.success === false) {
        throw new Error(result.error || 'Policy item could not be deleted');
      }
    }
  },

  getStandards: async (): Promise<Standard[]> => {
    const response = await apiRequest<unknown>('/api/standards');
    return Array.isArray(response) ? response.map(normalizeStandard) : [];
  },

  updateStandardPolicyItemIds: async (id: string, policyItemIds: string[]): Promise<Standard> => {
    const response = await apiRequest<unknown>(`/api/standards/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: {
        id,
        policyItemId: null,
        policyItemIds,
        updatedAt: new Date().toISOString(),
      },
    });
    return unwrapStandard(response);
  },
};

const unwrapPolicyItem = (response: unknown): PolicyItem => {
  if (response && typeof response === 'object') {
    const result = response as WriteResponse;
    if (result.success === false) {
      throw new Error(result.error || 'Policy item could not be saved');
    }
    if (result.item) {
      return normalizePolicyItem(result.item);
    }
  }

  return normalizePolicyItem(response);
};

const normalizePolicyItem = (value: unknown): PolicyItem => {
  const item = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    id: stringValue(item.id),
    policyId: stringValue(item.policyId),
    parentId: optionalStringValue(item.parentId),
    order: numberValue(item.order),
    nameAr: stringValue(item.nameAr),
    nameEn: stringValue(item.nameEn),
    descriptionAr: stringValue(item.descriptionAr),
    descriptionEn: stringValue(item.descriptionEn),
    attachments: stringArrayValue(item.attachments),
    createdAt: item.createdAt ?? '',
    updatedAt: item.updatedAt ?? '',
  };
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

const normalizeStandard = (value: unknown): Standard => {
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

const numberValue = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : Number(value) || 0;

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

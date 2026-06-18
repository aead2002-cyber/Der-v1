import { LookupOption } from '@/types';
import { apiRequest } from './apiClient';

type LookupOptionPayload = Pick<LookupOption, 'id' | 'category' | 'value' | 'labelAr' | 'labelEn' | 'isActive' | 'descriptionAr' | 'descriptionEn'>;

interface WriteResponse {
  success?: boolean;
  item?: unknown;
  error?: string;
}

interface DeleteResponse {
  success?: boolean;
  error?: string;
}

export const lookupOptionsApi = {
  getLookupOptions: async (): Promise<LookupOption[]> => {
    const response = await apiRequest<unknown>('/api/lookupOptions');
    return Array.isArray(response) ? response.map(normalizeLookupOption) : [];
  },

  createLookupOption: async (option: LookupOptionPayload): Promise<LookupOption> => {
    const response = await apiRequest<unknown>('/api/lookupOptions', {
      method: 'POST',
      body: option,
    });
    return unwrapLookupOption(response);
  },

  updateLookupOption: async (id: string, option: LookupOptionPayload): Promise<LookupOption> => {
    const response = await apiRequest<unknown>(`/api/lookupOptions/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: option,
    });
    return unwrapLookupOption(response);
  },

  deleteLookupOption: async (id: string): Promise<void> => {
    const response = await apiRequest<unknown>(`/api/lookupOptions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    if (response && typeof response === 'object') {
      const result = response as DeleteResponse;
      if (result.success === false) {
        throw new Error(result.error || 'Lookup option could not be deleted');
      }
    }
  },
};

const unwrapLookupOption = (response: unknown): LookupOption => {
  if (response && typeof response === 'object') {
    const result = response as WriteResponse;
    if (result.success === false) {
      throw new Error(result.error || 'Lookup option could not be saved');
    }
    if (result.item) {
      return normalizeLookupOption(result.item);
    }
  }

  return normalizeLookupOption(response);
};

const normalizeLookupOption = (value: unknown): LookupOption => {
  const item = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    id: stringValue(item.id),
    category: stringValue(item.category),
    value: stringValue(item.value),
    labelAr: stringValue(item.labelAr),
    labelEn: stringValue(item.labelEn),
    isActive: booleanValue(item.isActive, true),
    descriptionAr: optionalStringValue(item.descriptionAr),
    descriptionEn: optionalStringValue(item.descriptionEn),
  };
};

const stringValue = (value: unknown): string =>
  typeof value === 'string' ? value : value == null ? '' : String(value);

const optionalStringValue = (value: unknown): string | undefined => {
  const normalized = stringValue(value);
  return normalized ? normalized : undefined;
};

const booleanValue = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return ['1', 'true', 'yes', 'y'].includes(value.trim().toLowerCase());
  return fallback;
};

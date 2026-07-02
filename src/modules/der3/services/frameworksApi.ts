import { Framework } from '@/types';
import { apiRequest } from '@/services/apiClient';

type FrameworkPayload = Pick<Framework, 'id' | 'nameAr' | 'nameEn' | 'descriptionAr' | 'descriptionEn' | 'createdAt' | 'updatedAt'>;

interface WriteResponse {
  success?: boolean;
  item?: unknown;
  error?: string;
}

interface DeleteResponse {
  success?: boolean;
  error?: string;
}

export const frameworksApi = {
  getFrameworks: async (): Promise<Framework[]> => {
    const response = await apiRequest<unknown>('/api/frameworks');
    return Array.isArray(response) ? response.map(normalizeFramework) : [];
  },

  createFramework: async (framework: FrameworkPayload): Promise<Framework> => {
    const response = await apiRequest<unknown>('/api/frameworks', {
      method: 'POST',
      body: framework,
    });
    return unwrapFramework(response);
  },

  updateFramework: async (id: string, framework: FrameworkPayload): Promise<Framework> => {
    const response = await apiRequest<unknown>(`/api/frameworks/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: framework,
    });
    return unwrapFramework(response);
  },

  deleteFramework: async (id: string): Promise<void> => {
    const response = await apiRequest<unknown>(`/api/frameworks/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    if (response && typeof response === 'object') {
      const result = response as DeleteResponse;
      if (result.success === false) {
        throw new Error(result.error || 'Framework could not be deleted');
      }
    }
  },
};

const unwrapFramework = (response: unknown): Framework => {
  if (response && typeof response === 'object') {
    const result = response as WriteResponse;
    if (result.success === false) {
      throw new Error(result.error || 'Framework could not be saved');
    }
    if (result.item) {
      return normalizeFramework(result.item);
    }
  }

  return normalizeFramework(response);
};

const normalizeFramework = (value: unknown): Framework => {
  const item = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    id: stringValue(item.id),
    nameAr: stringValue(item.nameAr),
    nameEn: stringValue(item.nameEn),
    descriptionAr: stringValue(item.descriptionAr),
    descriptionEn: stringValue(item.descriptionEn),
    createdAt: item.createdAt ?? '',
    updatedAt: item.updatedAt ?? '',
  };
};

const stringValue = (value: unknown): string =>
  typeof value === 'string' ? value : value == null ? '' : String(value);

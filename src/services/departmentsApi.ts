import { Department } from '@/types';
import { apiRequest } from './apiClient';

type DepartmentPayload = Pick<Department, 'id' | 'nameAr' | 'nameEn' | 'descriptionAr' | 'descriptionEn' | 'createdAt' | 'updatedAt'>;

interface WriteResponse {
  success?: boolean;
  item?: unknown;
  error?: string;
}

interface DeleteResponse {
  success?: boolean;
  error?: string;
}

export const departmentsApi = {
  getDepartments: async (): Promise<Department[]> => {
    const response = await apiRequest<unknown>('/api/departments');
    return Array.isArray(response) ? response.map(normalizeDepartment) : [];
  },

  createDepartment: async (department: DepartmentPayload): Promise<Department> => {
    const response = await apiRequest<unknown>('/api/departments', {
      method: 'POST',
      body: department,
    });
    return unwrapDepartment(response);
  },

  updateDepartment: async (id: string, department: DepartmentPayload): Promise<Department> => {
    const response = await apiRequest<unknown>(`/api/departments/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: department,
    });
    return unwrapDepartment(response);
  },

  deleteDepartment: async (id: string): Promise<void> => {
    const response = await apiRequest<unknown>(`/api/departments/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    if (response && typeof response === 'object') {
      const result = response as DeleteResponse;
      if (result.success === false) {
        throw new Error(result.error || 'Department could not be deleted');
      }
    }
  },
};

const unwrapDepartment = (response: unknown): Department => {
  if (response && typeof response === 'object') {
    const result = response as WriteResponse;
    if (result.success === false) {
      throw new Error(result.error || 'Department could not be saved');
    }
    if (result.item) {
      return normalizeDepartment(result.item);
    }
  }

  return normalizeDepartment(response);
};

const normalizeDepartment = (value: unknown): Department => {
  const item = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    id: stringValue(item.id),
    nameAr: stringValue(item.nameAr),
    nameEn: stringValue(item.nameEn),
    descriptionAr: optionalStringValue(item.descriptionAr),
    descriptionEn: optionalStringValue(item.descriptionEn),
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

import { PermissionGroup } from '@/types';
import { apiRequest } from '@/services/apiClient';

type PermissionGroupPayload = Pick<
  PermissionGroup,
  'id' | 'nameAr' | 'nameEn' | 'descriptionAr' | 'descriptionEn' | 'isSystem' | 'permissions' | 'createdAt' | 'updatedAt'
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

export const permissionGroupsApi = {
  getPermissionGroups: async (): Promise<PermissionGroup[]> => {
    const response = await apiRequest<unknown>('/api/permissionGroups');
    return Array.isArray(response) ? response.map(normalizePermissionGroup) : [];
  },

  createPermissionGroup: async (group: PermissionGroupPayload): Promise<PermissionGroup> => {
    const response = await apiRequest<unknown>('/api/permissionGroups', {
      method: 'POST',
      body: group,
    });
    return unwrapPermissionGroup(response);
  },

  updatePermissionGroup: async (id: string, group: PermissionGroupPayload): Promise<PermissionGroup> => {
    const response = await apiRequest<unknown>(`/api/permissionGroups/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: group,
    });
    return unwrapPermissionGroup(response);
  },

  deletePermissionGroup: async (id: string): Promise<void> => {
    const response = await apiRequest<unknown>(`/api/permissionGroups/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    if (response && typeof response === 'object') {
      const result = response as DeleteResponse;
      if (result.success === false) {
        throw new Error(result.error || 'Permission group could not be deleted');
      }
    }
  },
};

const unwrapPermissionGroup = (response: unknown): PermissionGroup => {
  if (response && typeof response === 'object') {
    const result = response as WriteResponse;
    if (result.success === false) {
      throw new Error(result.error || 'Permission group could not be saved');
    }
    if (result.item) {
      return normalizePermissionGroup(result.item);
    }
  }

  return normalizePermissionGroup(response);
};

const normalizePermissionGroup = (value: unknown): PermissionGroup => {
  const item = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    id: stringValue(item.id),
    nameAr: stringValue(item.nameAr),
    nameEn: stringValue(item.nameEn),
    descriptionAr: optionalStringValue(item.descriptionAr),
    descriptionEn: optionalStringValue(item.descriptionEn),
    isSystem: booleanValue(item.isSystem),
    permissions: stringArrayValue(item.permissions),
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

const booleanValue = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return ['1', 'true', 'yes', 'y'].includes(value.trim().toLowerCase());
  return false;
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
      return value.split(',').map(item => item.trim()).filter(Boolean);
    }
  }

  return [];
};

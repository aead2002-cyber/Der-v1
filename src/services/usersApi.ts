import { User } from '@/types';
import { apiRequest } from './apiClient';

interface WriteResponse {
  success?: boolean;
  user?: unknown;
  error?: string;
}

interface DeleteResponse {
  success?: boolean;
  error?: string;
}

type UserPayload = Pick<User, 'uid' | 'email' | 'displayName' | 'displayNameEn' | 'role' | 'groupId' | 'teams' | 'departments' | 'photoURL' | 'receiveSecurityIncidents'> & {
  permissionOverrides?: User['permissionOverrides'];
};

type ProfilePayload = Pick<User, 'displayName' | 'displayNameEn' | 'photoURL'>;

export const usersApi = {
  getUsers: async (): Promise<User[]> => {
    const response = await apiRequest<unknown>('/api/users');
    return Array.isArray(response) ? response.map(normalizeUser) : [];
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiRequest<unknown>('/api/users/me');
    return unwrapUser(response);
  },

  createUser: async (user: UserPayload & { password?: string }): Promise<User> => {
    const response = await apiRequest<unknown>('/api/users', {
      method: 'POST',
      body: user,
    });
    return unwrapUser(response);
  },

  updateUser: async (id: string, user: UserPayload): Promise<User> => {
    const response = await apiRequest<unknown>(`/api/users/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: user,
    });
    return unwrapUser(response);
  },

  updateCurrentUserProfile: async (profile: ProfilePayload): Promise<User> => {
    const response = await apiRequest<unknown>('/api/users/me/profile', {
      method: 'PUT',
      body: profile,
    });
    return unwrapUser(response);
  },

  setPassword: async (uid: string, password: string): Promise<void> => {
    const response = await apiRequest<unknown>(`/api/users/${encodeURIComponent(uid)}/password`, {
      method: 'POST',
      body: { password },
    });

    if (response && typeof response === 'object') {
      const result = response as WriteResponse;
      if (result.success === false) {
        throw new Error(result.error || 'Password could not be set');
      }
    }
  },

  deleteUser: async (id: string): Promise<void> => {
    const response = await apiRequest<unknown>(`/api/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    if (response && typeof response === 'object') {
      const result = response as DeleteResponse;
      if (result.success === false) {
        throw new Error(result.error || 'User could not be deleted');
      }
    }
  },
};

const unwrapUser = (response: unknown): User => {
  if (response && typeof response === 'object') {
    const result = response as WriteResponse;
    if (result.success === false) {
      throw new Error(result.error || 'User could not be saved');
    }
    if (result.user) {
      return normalizeUser(result.user);
    }
  }

  return normalizeUser(response);
};

const normalizeUser = (value: unknown): User => {
  const item = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    uid: stringValue(item.uid),
    email: stringValue(item.email),
    displayName: stringValue(item.displayName),
    displayNameEn: optionalStringValue(item.displayNameEn),
    role: (stringValue(item.role) || 'user') as User['role'],
    groupId: optionalStringValue(item.groupId),
    permissionOverrides: item.permissionOverrides as User['permissionOverrides'] | undefined,
    teams: stringArrayValue(item.teams),
    departments: stringArrayValue(item.departments),
    photoURL: optionalStringValue(item.photoURL),
    receiveSecurityIncidents: booleanValue(item.receiveSecurityIncidents),
    ...(item.platforms !== undefined && item.platforms !== null
      ? { platforms: stringArrayValue(item.platforms) as User['platforms'] }
      : {}),
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

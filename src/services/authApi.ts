import { User } from '@/types';
import { apiRequest } from './apiClient';

interface VerifyResponse {
  ok?: boolean;
  requiresOtp?: boolean;
  message?: string;
  error?: string;
}

interface VerifyOtpResponse {
  ok?: boolean;
  token?: string;
  accessToken?: string;
  jwt?: string;
  user?: unknown;
  error?: string;
}

export interface AuthSession {
  token: string;
  user: User;
}

export const authApi = {
  verify: async (email: string, password: string): Promise<VerifyResponse> => {
    return apiRequest<VerifyResponse>('/api/auth/verify', {
      method: 'POST',
      auth: false,
      body: { email, password },
    });
  },

  verifyOtp: async (email: string, otp: string): Promise<AuthSession> => {
    const response = await apiRequest<VerifyOtpResponse>('/api/auth/verify-otp', {
      method: 'POST',
      auth: false,
      body: { email, otp },
    });

    if (!response.ok) {
      throw new Error(response.error || 'Invalid or expired verification code');
    }

    const token = response.token || response.accessToken || response.jwt;
    if (!token || !response.user) {
      throw new Error('Authentication response did not include a token and user');
    }

    return {
      token,
      user: normalizeUser(response.user, email),
    };
  },
};

const normalizeStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (typeof value === 'string' && value.length > 0) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [value];
    } catch {
      return [value];
    }
  }
  return [];
};

const normalizeUser = (value: unknown, fallbackEmail: string): User => {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const uid = stringValue(record.uid) || stringValue(record.id) || stringValue(record.userId) || fallbackEmail;
  const email = stringValue(record.email) || fallbackEmail;
  const displayName =
    stringValue(record.displayName) ||
    stringValue(record.name) ||
    stringValue(record.displayNameEn) ||
    email;
  const role = stringValue(record.role);

  return {
    ...(record as Partial<User>),
    uid,
    email,
    displayName,
    role: role === 'admin' || role === 'auditor' || role === 'user' ? role : 'user',
    teams: normalizeStringArray(record.teams),
    departments: normalizeStringArray(record.departments),
    ...(record.platforms !== undefined && record.platforms !== null
      ? { platforms: normalizeStringArray(record.platforms) as User['platforms'] }
      : {}),
  };
};

const stringValue = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

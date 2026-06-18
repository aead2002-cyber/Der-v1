import { Risk } from '@/types';
import { apiRequest } from './apiClient';

type RiskPayload = Pick<
  Risk,
  | 'id'
  | 'nameAr'
  | 'nameEn'
  | 'descriptionAr'
  | 'descriptionEn'
  | 'likelihood'
  | 'impact'
  | 'procedureIds'
  | 'createdAt'
  | 'updatedAt'
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

export const risksApi = {
  getRisks: async (): Promise<Risk[]> => {
    const response = await apiRequest<unknown>('/api/risks');
    return Array.isArray(response) ? response.map(normalizeRisk) : [];
  },

  createRisk: async (risk: RiskPayload): Promise<Risk> => {
    const response = await apiRequest<unknown>('/api/risks', {
      method: 'POST',
      body: risk,
    });
    return unwrapRisk(response);
  },

  updateRisk: async (id: string, risk: RiskPayload): Promise<Risk> => {
    const response = await apiRequest<unknown>(`/api/risks/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: risk,
    });
    return unwrapRisk(response);
  },

  deleteRisk: async (id: string): Promise<void> => {
    const response = await apiRequest<unknown>(`/api/risks/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    if (response && typeof response === 'object') {
      const result = response as DeleteResponse;
      if (result.success === false) {
        throw new Error(result.error || 'Risk could not be deleted');
      }
    }
  },
};

const unwrapRisk = (response: unknown): Risk => {
  if (response && typeof response === 'object') {
    const result = response as WriteResponse;
    if (result.success === false) {
      throw new Error(result.error || 'Risk could not be saved');
    }
    if (result.item) {
      return normalizeRisk(result.item);
    }
  }

  return normalizeRisk(response);
};

const normalizeRisk = (value: unknown): Risk => {
  const item = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    id: stringValue(item.id),
    nameAr: stringValue(item.nameAr),
    nameEn: stringValue(item.nameEn),
    descriptionAr: optionalStringValue(item.descriptionAr),
    descriptionEn: optionalStringValue(item.descriptionEn),
    likelihood: clampScore(item.likelihood, 3),
    impact: clampScore(item.impact, 3),
    procedureIds: stringArrayValue(item.procedureIds),
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

const clampScore = (value: unknown, fallback: number): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(5, Math.round(parsed)));
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

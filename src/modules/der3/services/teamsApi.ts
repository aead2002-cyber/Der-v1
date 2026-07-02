import { Team } from '@/types';
import { apiRequest } from '@/services/apiClient';

type TeamPayload = Pick<Team, 'id' | 'nameAr' | 'nameEn' | 'descriptionAr' | 'descriptionEn' | 'createdAt' | 'updatedAt'>;

interface WriteResponse {
  success?: boolean;
  item?: unknown;
  error?: string;
}

interface DeleteResponse {
  success?: boolean;
  error?: string;
}

export const teamsApi = {
  getTeams: async (): Promise<Team[]> => {
    const response = await apiRequest<unknown>('/api/teams');
    return Array.isArray(response) ? response.map(normalizeTeam) : [];
  },

  createTeam: async (team: TeamPayload): Promise<Team> => {
    const response = await apiRequest<unknown>('/api/teams', {
      method: 'POST',
      body: team,
    });
    return unwrapTeam(response);
  },

  updateTeam: async (id: string, team: TeamPayload): Promise<Team> => {
    const response = await apiRequest<unknown>(`/api/teams/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: team,
    });
    return unwrapTeam(response);
  },

  deleteTeam: async (id: string): Promise<void> => {
    const response = await apiRequest<unknown>(`/api/teams/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    if (response && typeof response === 'object') {
      const result = response as DeleteResponse;
      if (result.success === false) {
        throw new Error(result.error || 'Team could not be deleted');
      }
    }
  },
};

const unwrapTeam = (response: unknown): Team => {
  if (response && typeof response === 'object') {
    const result = response as WriteResponse;
    if (result.success === false) {
      throw new Error(result.error || 'Team could not be saved');
    }
    if (result.item) {
      return normalizeTeam(result.item);
    }
  }

  return normalizeTeam(response);
};

const normalizeTeam = (value: unknown): Team => {
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

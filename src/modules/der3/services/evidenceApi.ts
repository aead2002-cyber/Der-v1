import { Evidence } from '@/types';
import { apiRequest } from '@/services/apiClient';

type EvidencePayload = Pick<
  Evidence,
  'id' | 'procedureId' | 'name' | 'url' | 'type' | 'uploadedBy' | 'uploadedAt' | 'description'
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

export const evidenceApi = {
  getEvidence: async (procedureId?: string): Promise<Evidence[]> => {
    const response = await apiRequest<unknown>('/api/evidence');
    const rows = Array.isArray(response) ? response.map(normalizeEvidence) : [];
    return procedureId ? rows.filter(item => item.procedureId === procedureId) : rows;
  },

  createEvidence: async (evidence: EvidencePayload): Promise<Evidence> => {
    const response = await apiRequest<unknown>('/api/evidence', {
      method: 'POST',
      body: evidence,
    });
    return unwrapEvidence(response);
  },

  updateEvidence: async (id: string, evidence: Partial<EvidencePayload>): Promise<Evidence> => {
    const response = await apiRequest<unknown>(`/api/evidence/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: evidence,
    });
    return unwrapEvidence(response);
  },

  deleteEvidence: async (id: string): Promise<void> => {
    const response = await apiRequest<unknown>(`/api/evidence/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    if (response && typeof response === 'object') {
      const result = response as DeleteResponse;
      if (result.success === false) {
        throw new Error(result.error || 'Evidence could not be deleted');
      }
    }
  },
};

const unwrapEvidence = (response: unknown): Evidence => {
  if (response && typeof response === 'object') {
    const result = response as WriteResponse;
    if (result.success === false) {
      throw new Error(result.error || 'Evidence could not be saved');
    }
    if (result.item) {
      return normalizeEvidence(result.item);
    }
  }

  return normalizeEvidence(response);
};

export const normalizeEvidence = (value: unknown): Evidence => {
  const item = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    id: stringValue(item.id),
    procedureId: stringValue(item.procedureId),
    name: stringValue(item.name),
    url: stringValue(item.url),
    type: stringValue(item.type),
    uploadedBy: stringValue(item.uploadedBy),
    uploadedAt: item.uploadedAt ?? '',
    description: optionalStringValue(item.description),
  };
};

const stringValue = (value: unknown): string =>
  typeof value === 'string' ? value : value == null ? '' : String(value);

const optionalStringValue = (value: unknown): string | undefined => {
  const normalized = stringValue(value);
  return normalized ? normalized : undefined;
};

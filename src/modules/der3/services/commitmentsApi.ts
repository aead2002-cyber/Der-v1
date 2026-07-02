import { Commitment } from '@/types';
import { apiRequest } from '@/services/apiClient';

type CommitmentPayload = Pick<
  Commitment,
  | 'id'
  | 'nameAr'
  | 'nameEn'
  | 'descriptionAr'
  | 'descriptionEn'
  | 'expiryDate'
  | 'responsibleUser'
  | 'status'
  | 'evidenceTitle'
  | 'evidenceLink'
  | 'evidenceUploadedAt'
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

export const commitmentsApi = {
  getCommitments: async (): Promise<Commitment[]> => {
    const response = await apiRequest<unknown>('/api/commitments');
    return Array.isArray(response) ? response.map(normalizeCommitment) : [];
  },

  createCommitment: async (commitment: CommitmentPayload): Promise<Commitment> => {
    const response = await apiRequest<unknown>('/api/commitments', {
      method: 'POST',
      body: commitment,
    });
    return unwrapCommitment(response);
  },

  updateCommitment: async (id: string, commitment: CommitmentPayload): Promise<Commitment> => {
    const response = await apiRequest<unknown>(`/api/commitments/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: commitment,
    });
    return unwrapCommitment(response);
  },

  deleteCommitment: async (id: string): Promise<void> => {
    const response = await apiRequest<unknown>(`/api/commitments/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    if (response && typeof response === 'object') {
      const result = response as DeleteResponse;
      if (result.success === false) {
        throw new Error(result.error || 'Commitment could not be deleted');
      }
    }
  },
};

const unwrapCommitment = (response: unknown): Commitment => {
  if (response && typeof response === 'object') {
    const result = response as WriteResponse;
    if (result.success === false) {
      throw new Error(result.error || 'Commitment could not be saved');
    }
    if (result.item) {
      return normalizeCommitment(result.item);
    }
  }

  return normalizeCommitment(response);
};

const normalizeCommitment = (value: unknown): Commitment => {
  const item = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    id: stringValue(item.id),
    nameAr: stringValue(item.nameAr),
    nameEn: stringValue(item.nameEn),
    descriptionAr: optionalStringValue(item.descriptionAr),
    descriptionEn: optionalStringValue(item.descriptionEn),
    expiryDate: dateOnlyValue(item.expiryDate),
    responsibleUser: stringValue(item.responsibleUser),
    status: normalizeStatus(item.status),
    evidenceTitle: optionalStringValue(item.evidenceTitle),
    evidenceLink: optionalStringValue(item.evidenceLink),
    evidenceUploadedAt: optionalStringValue(item.evidenceUploadedAt),
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

const dateOnlyValue = (value: unknown): string => {
  const normalized = stringValue(value);
  return normalized.includes('T') ? normalized.split('T')[0] : normalized;
};

const normalizeStatus = (value: unknown): Commitment['status'] => {
  const normalized = stringValue(value);
  if (['active', 'expired', 'expiring_soon', 'completed'].includes(normalized)) {
    return normalized as Commitment['status'];
  }
  return 'active';
};

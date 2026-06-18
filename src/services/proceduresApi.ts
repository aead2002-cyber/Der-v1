import { Procedure } from '@/types';
import { apiRequest } from './apiClient';

type ProcedurePayload = Pick<
  Procedure,
  | 'id'
  | 'standardId'
  | 'policyId'
  | 'nameAr'
  | 'nameEn'
  | 'descriptionAr'
  | 'descriptionEn'
  | 'status'
  | 'importance'
  | 'startDate'
  | 'endDate'
  | 'assignedTo'
  | 'assignedTeams'
  | 'isPeriodic'
  | 'frequency'
  | 'attachments'
  | 'comments'
  | 'createdAt'
  | 'updatedAt'
>;

type ProcedureOverlay = Pick<Procedure, 'parentId' | 'order' | 'weight'>;

interface WriteResponse {
  success?: boolean;
  item?: unknown;
  error?: string;
}

interface DeleteResponse {
  success?: boolean;
  error?: string;
}

const OVERLAY_KEY = 'der3_procedure_overlay_v1';

export const proceduresApi = {
  getProcedures: async (): Promise<Procedure[]> => {
    const response = await apiRequest<unknown>('/api/procedures');
    return Array.isArray(response) ? response.map(normalizeProcedure) : [];
  },

  createProcedure: async (procedure: Procedure): Promise<Procedure> => {
    const existing = await proceduresApi.getProcedures();
    const response = await apiRequest<unknown>('/api/procedures', {
      method: 'POST',
      body: toProcedurePayload(procedure),
    });
    const saved = unwrapProcedure(response);
    saveOverlay(saved.id || procedure.id, buildOverlay(procedure, existing));
    return normalizeProcedure({ ...saved, id: saved.id || procedure.id });
  },

  updateProcedure: async (id: string, procedure: Procedure): Promise<Procedure> => {
    const existing = await proceduresApi.getProcedures();
    const response = await apiRequest<unknown>(`/api/procedures/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: toProcedurePayload({ ...procedure, id }),
    });
    const saved = unwrapProcedure(response);
    saveOverlay(id, buildOverlay({ ...procedure, id }, existing));
    return normalizeProcedure({ ...saved, id: saved.id || id });
  },

  deleteProcedure: async (id: string): Promise<void> => {
    const response = await apiRequest<unknown>(`/api/procedures/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    if (response && typeof response === 'object') {
      const result = response as DeleteResponse;
      if (result.success === false) {
        throw new Error(result.error || 'Procedure could not be deleted');
      }
    }

    deleteOverlay(id);
  },
};

const unwrapProcedure = (response: unknown): Procedure => {
  if (response && typeof response === 'object') {
    const result = response as WriteResponse;
    if (result.success === false) {
      throw new Error(result.error || 'Procedure could not be saved');
    }
    if (result.item) {
      return normalizeProcedure(result.item);
    }
  }

  return normalizeProcedure(response);
};

export const normalizeProcedure = (value: unknown): Procedure => {
  const item = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const id = stringValue(item.id);
  const overlay = getOverlay()[id] || {};

  return {
    id,
    parentId: overlay.parentId ?? optionalStringValue(item.parentId),
    order: overlay.order ?? numberValue(item.order),
    standardId: stringValue(item.standardId),
    policyId: stringValue(item.policyId),
    nameAr: stringValue(item.nameAr),
    nameEn: stringValue(item.nameEn),
    descriptionAr: stringValue(item.descriptionAr),
    descriptionEn: stringValue(item.descriptionEn),
    status: (stringValue(item.status) || 'not_started') as Procedure['status'],
    importance: (stringValue(item.importance) || 'medium') as Procedure['importance'],
    startDate: dateStringValue(item.startDate),
    endDate: dateStringValue(item.endDate),
    assignedTo: stringArrayValue(item.assignedTo),
    assignedTeams: stringArrayValue(item.assignedTeams),
    isPeriodic: booleanValue(item.isPeriodic),
    frequency: optionalStringValue(item.frequency) as Procedure['frequency'],
    attachments: stringArrayValue(item.attachments),
    comments: Array.isArray(item.comments) ? item.comments as Procedure['comments'] : [],
    weight: overlay.weight ?? numberValue(item.weight) ?? 1,
    createdAt: item.createdAt ?? '',
    updatedAt: item.updatedAt ?? '',
  };
};

const toProcedurePayload = (procedure: Procedure): ProcedurePayload => ({
  id: procedure.id,
  standardId: procedure.standardId,
  policyId: procedure.policyId,
  nameAr: procedure.nameAr,
  nameEn: procedure.nameEn,
  descriptionAr: procedure.descriptionAr || '',
  descriptionEn: procedure.descriptionEn || '',
  status: procedure.status,
  importance: procedure.importance,
  startDate: dateStringValue(procedure.startDate),
  endDate: dateStringValue(procedure.endDate),
  assignedTo: procedure.assignedTo || [],
  assignedTeams: procedure.assignedTeams || [],
  isPeriodic: !!procedure.isPeriodic,
  frequency: procedure.frequency,
  attachments: procedure.attachments || [],
  comments: procedure.comments || [],
  createdAt: procedure.createdAt,
  updatedAt: procedure.updatedAt,
});

const buildOverlay = (procedure: Procedure, existing: Procedure[]): ProcedureOverlay => {
  const current = existing.find(p => p.id === procedure.id);
  const parentChanged = current && current.parentId !== procedure.parentId;
  const order = procedure.order ?? (parentChanged ? undefined : current?.order) ?? nextSiblingOrder(procedure, existing);
  const weight = Math.max(1, Math.min(10, Math.round(Number(procedure.weight) || 1)));
  return {
    parentId: procedure.parentId || undefined,
    order,
    weight,
  };
};

const nextSiblingOrder = (procedure: Procedure, existing: Procedure[]): number => {
  const siblingOrders = existing
    .filter(p => p.id !== procedure.id && p.standardId === procedure.standardId && (p.parentId || '') === (procedure.parentId || ''))
    .map(p => Number(p.order) || 0);
  return siblingOrders.length ? Math.max(...siblingOrders) + 1 : 1;
};

const getOverlay = (): Record<string, ProcedureOverlay> => {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(OVERLAY_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const saveOverlay = (id: string, overlay: ProcedureOverlay): void => {
  if (typeof window === 'undefined' || !id) return;
  const next = { ...getOverlay(), [id]: overlay };
  window.localStorage.setItem(OVERLAY_KEY, JSON.stringify(next));
};

const deleteOverlay = (id: string): void => {
  if (typeof window === 'undefined' || !id) return;
  const next = { ...getOverlay() };
  delete next[id];
  window.localStorage.setItem(OVERLAY_KEY, JSON.stringify(next));
};

const stringValue = (value: unknown): string =>
  typeof value === 'string' ? value : value == null ? '' : String(value);

const optionalStringValue = (value: unknown): string | undefined => {
  const normalized = stringValue(value);
  return normalized ? normalized : undefined;
};

const numberValue = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const booleanValue = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return ['1', 'true', 'yes', 'y'].includes(value.trim().toLowerCase());
  return false;
};

const dateStringValue = (value: unknown): string => {
  const normalized = stringValue(value);
  const match = normalized.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : normalized;
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

import {
  legalAuditLogs,
  legalCaseDocuments,
  legalCaseSessions,
  legalCases,
  legalEmployees,
  legalGeneralDocuments,
  legalInvestigations,
  legalInvestigationDocuments,
  legalInvestigationSessions,
  legalParties,
  legalSettings,
  legalSummons,
} from './legalMockData';
import type {
  CloseLegalCaseInput,
  CloseLegalInvestigationInput,
  CreateLegalCaseDocumentInput,
  CreateLegalCaseInput,
  CreateLegalCaseSessionInput,
  CreateLegalEmployeeInput,
  CreateLegalInvestigationDocumentInput,
  CreateLegalInvestigationInput,
  CreateLegalInvestigationSessionInput,
  CreateLegalPartyInput,
  CreateLegalSummonsInput,
  LegalAuditLog,
  LegalCase,
  LegalCaseDocument,
  LegalCaseSession,
  LegalDashboardSummary,
  LegalDocumentListItem,
  LegalDocumentSource,
  LegalEmployee,
  LegalInvestigation,
  LegalInvestigationDocument,
  LegalInvestigationSession,
  LegalParty,
  LegalSettings,
  LegalSummons,
  ReopenLegalCaseInput,
  UpdateLegalCaseInput,
  UpdateLegalCaseSessionInput,
  UpdateLegalEmployeeInput,
  UpdateLegalInvestigationInput,
  UpdateLegalInvestigationSessionInput,
  UpdateLegalPartyInput,
  UpdateLegalSettingsInput,
  UpdateLegalSummonsInput,
} from '../types/legal';

const clone = <T,>(value: T): T => (value === undefined || value === null ? value : JSON.parse(JSON.stringify(value)) as T);
const resolve = async <T,>(value: T): Promise<T> => Promise.resolve(clone(value));
const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function audit(actionType: string, serviceName: string, before?: unknown, after?: unknown) {
  legalAuditLogs.unshift({
    id: id('audit'),
    userName: 'مستخدم النظام',
    actionType,
    serviceName,
    dateTime: now(),
    beforeValue: before === undefined ? undefined : JSON.stringify(before),
    afterValue: after === undefined ? undefined : JSON.stringify(after),
    ipAddress: '127.0.0.1',
  });
}

function pushAndReturn<T>(collection: T[], item: T): T {
  collection.unshift(item);
  return item;
}

function touchCase(item: LegalCase): LegalCase {
  return { ...item, updatedAt: now() };
}

function touchInvestigation(item: LegalInvestigation): LegalInvestigation {
  return { ...item, updatedAt: now() };
}

function buildDocumentsView(): LegalDocumentListItem[] {
  return [
    ...legalCaseDocuments.map(document => ({
      id: document.id,
      source: 'CASE' as const,
      relationId: document.caseId,
      description: document.description,
      fileId: document.fileId,
      fileName: document.fileName,
      fileType: document.fileType,
      addedAt: document.addedAt,
      addedByUserId: document.addedByUserId,
      documentCategory: document.documentCategory,
    })),
    ...legalInvestigationDocuments.map(document => ({
      id: document.id,
      source: 'INVESTIGATION' as const,
      relationId: document.investigationId,
      description: document.description,
      fileId: document.fileId,
      fileName: document.fileName,
      fileType: document.fileType,
      addedAt: document.addedAt,
      addedByUserId: document.addedByUserId,
      documentCategory: document.documentCategory,
    })),
    ...legalGeneralDocuments.map(document => clone(document)),
  ];
}

function getDashboardSummary(): LegalDashboardSummary {
  return {
    activeCases: legalCases.filter(item => item.status === 'ACTIVE').length,
    closedCases: legalCases.filter(item => item.status === 'CLOSED').length,
    upcomingCaseSessionsThisWeek: legalCaseSessions.filter(item => Boolean(item.nextSessionDate)).length,
    openInvestigations: legalInvestigations.filter(item => item.status === 'OPEN').length,
    closedInvestigations: legalInvestigations.filter(item => item.status === 'CLOSED').length,
    upcomingSummons: legalSummons.filter(item => item.status === 'SENT' || item.status === 'CONFIRMED').length,
    legalDocumentsCount: buildDocumentsView().length,
  };
}

export async function getLegalDashboardSummary(): Promise<LegalDashboardSummary> {
  return resolve(getDashboardSummary());
}

export async function getLegalParties(): Promise<LegalParty[]> {
  return resolve(legalParties);
}

export async function createLegalParty(input: CreateLegalPartyInput): Promise<LegalParty> {
  const item: LegalParty = { id: id('party'), ...input, createdAt: now(), updatedAt: now() };
  pushAndReturn(legalParties, item);
  audit('CREATE_PARTY', 'LegalPartiesService', undefined, item);
  return resolve(item);
}

export async function updateLegalParty(idValue: string, input: UpdateLegalPartyInput): Promise<LegalParty | undefined> {
  const index = legalParties.findIndex(item => item.id === idValue);
  if (index === -1) return resolve(undefined);
  const before = clone(legalParties[index]);
  legalParties[index] = { ...legalParties[index], ...input, updatedAt: now() };
  audit('UPDATE_PARTY', 'LegalPartiesService', before, legalParties[index]);
  return resolve(legalParties[index]);
}

export async function deleteLegalParty(idValue: string): Promise<boolean> {
  const index = legalParties.findIndex(item => item.id === idValue);
  if (index === -1) return resolve(false);
  const before = clone(legalParties[index]);
  legalParties.splice(index, 1);
  audit('DELETE_PARTY', 'LegalPartiesService', before);
  return resolve(true);
}

export async function getLegalCases(): Promise<LegalCase[]> {
  return resolve(legalCases);
}

export async function getLegalCaseById(idValue: string): Promise<LegalCase | undefined> {
  return resolve(legalCases.find(item => item.id === idValue));
}

export async function createLegalCase(input: CreateLegalCaseInput): Promise<LegalCase> {
  const item: LegalCase = { id: id('case'), ...input, status: 'ACTIVE', createdAt: now(), updatedAt: now() };
  pushAndReturn(legalCases, item);
  audit('CREATE_CASE', 'LegalCasesService', undefined, item);
  return resolve(item);
}

export async function updateLegalCase(idValue: string, input: UpdateLegalCaseInput): Promise<LegalCase | undefined> {
  const index = legalCases.findIndex(item => item.id === idValue);
  if (index === -1) return resolve(undefined);
  const before = clone(legalCases[index]);
  legalCases[index] = touchCase({ ...legalCases[index], ...input });
  audit('UPDATE_CASE', 'LegalCasesService', before, legalCases[index]);
  return resolve(legalCases[index]);
}

export async function closeLegalCase(idValue: string, input: CloseLegalCaseInput): Promise<LegalCase | undefined> {
  const index = legalCases.findIndex(item => item.id === idValue);
  if (index === -1) return resolve(undefined);
  const before = clone(legalCases[index]);
  legalCases[index] = touchCase({
    ...legalCases[index],
    status: 'CLOSED',
    closedAt: input.closedAt,
    closureReason: input.closureReason,
    closureNotes: input.closureNotes,
  });
  audit('CLOSE_CASE', 'LegalCasesService', before, legalCases[index]);
  return resolve(legalCases[index]);
}

export async function reopenLegalCase(idValue: string, input: ReopenLegalCaseInput): Promise<LegalCase | undefined> {
  const index = legalCases.findIndex(item => item.id === idValue);
  if (index === -1) return resolve(undefined);
  const before = clone(legalCases[index]);
  legalCases[index] = touchCase({
    ...legalCases[index],
    status: 'ACTIVE',
    reopenedAt: input.reopenedAt || now(),
    reopenedByUserId: input.reopenedByUserId,
    reopenReason: input.reopenReason,
  });
  audit('REOPEN_CASE', 'LegalCasesService', before, legalCases[index]);
  return resolve(legalCases[index]);
}

export async function deleteLegalCase(idValue: string): Promise<boolean> {
  const index = legalCases.findIndex(item => item.id === idValue);
  if (index === -1) return resolve(false);
  const before = clone(legalCases[index]);
  legalCases.splice(index, 1);
  for (let i = legalCaseDocuments.length - 1; i >= 0; i -= 1) if (legalCaseDocuments[i].caseId === idValue) legalCaseDocuments.splice(i, 1);
  for (let i = legalCaseSessions.length - 1; i >= 0; i -= 1) if (legalCaseSessions[i].caseId === idValue) legalCaseSessions.splice(i, 1);
  audit('DELETE_CASE', 'LegalCasesService', before);
  return resolve(true);
}

export async function getLegalCaseDocuments(caseId?: string): Promise<LegalCaseDocument[]> {
  return resolve(caseId ? legalCaseDocuments.filter(item => item.caseId === caseId) : legalCaseDocuments);
}

export async function createLegalCaseDocument(input: CreateLegalCaseDocumentInput): Promise<LegalCaseDocument> {
  const item: LegalCaseDocument = {
    id: id('case-doc'),
    caseId: input.caseId,
    description: input.description,
    fileId: id('file'),
    fileName: input.fileName,
    fileType: input.fileType,
    addedAt: now(),
    addedByUserId: input.addedByUserId,
    documentCategory: input.documentCategory,
  };
  pushAndReturn(legalCaseDocuments, item);
  audit('ADD_CASE_DOCUMENT', 'LegalDocumentsService', undefined, item);
  return resolve(item);
}

export async function deleteLegalCaseDocument(idValue: string): Promise<boolean> {
  const index = legalCaseDocuments.findIndex(item => item.id === idValue);
  if (index === -1) return resolve(false);
  const before = clone(legalCaseDocuments[index]);
  legalCaseDocuments.splice(index, 1);
  audit('DELETE_CASE_DOCUMENT', 'LegalDocumentsService', before);
  return resolve(true);
}

export async function getLegalCaseSessions(caseId?: string): Promise<LegalCaseSession[]> {
  return resolve(caseId ? legalCaseSessions.filter(item => item.caseId === caseId) : legalCaseSessions);
}

export async function createLegalCaseSession(input: CreateLegalCaseSessionInput): Promise<LegalCaseSession> {
  const item: LegalCaseSession = { id: id('case-session'), ...input, createdAt: now(), updatedAt: now() };
  pushAndReturn(legalCaseSessions, item);
  audit('ADD_CASE_SESSION', 'LegalCasesService', undefined, item);
  return resolve(item);
}

export async function updateLegalCaseSession(idValue: string, input: UpdateLegalCaseSessionInput): Promise<LegalCaseSession | undefined> {
  const index = legalCaseSessions.findIndex(item => item.id === idValue);
  if (index === -1) return resolve(undefined);
  const before = clone(legalCaseSessions[index]);
  legalCaseSessions[index] = { ...legalCaseSessions[index], ...input, updatedAt: now() };
  audit('UPDATE_CASE_SESSION', 'LegalCasesService', before, legalCaseSessions[index]);
  return resolve(legalCaseSessions[index]);
}

export async function deleteLegalCaseSession(idValue: string): Promise<boolean> {
  const index = legalCaseSessions.findIndex(item => item.id === idValue);
  if (index === -1) return resolve(false);
  const before = clone(legalCaseSessions[index]);
  legalCaseSessions.splice(index, 1);
  audit('DELETE_CASE_SESSION', 'LegalCasesService', before);
  return resolve(true);
}

export async function getLegalEmployees(): Promise<LegalEmployee[]> {
  return resolve(legalEmployees);
}

export async function createLegalEmployee(input: CreateLegalEmployeeInput): Promise<LegalEmployee> {
  const item: LegalEmployee = { id: id('emp'), ...input };
  pushAndReturn(legalEmployees, item);
  audit('CREATE_EMPLOYEE', 'LegalEmployeesService', undefined, item);
  return resolve(item);
}

export async function updateLegalEmployee(idValue: string, input: UpdateLegalEmployeeInput): Promise<LegalEmployee | undefined> {
  const index = legalEmployees.findIndex(item => item.id === idValue);
  if (index === -1) return resolve(undefined);
  const before = clone(legalEmployees[index]);
  legalEmployees[index] = { ...legalEmployees[index], ...input };
  audit('UPDATE_EMPLOYEE', 'LegalEmployeesService', before, legalEmployees[index]);
  return resolve(legalEmployees[index]);
}

export async function deleteLegalEmployee(idValue: string): Promise<boolean> {
  const index = legalEmployees.findIndex(item => item.id === idValue);
  if (index === -1) return resolve(false);
  const before = clone(legalEmployees[index]);
  legalEmployees.splice(index, 1);
  audit('DELETE_EMPLOYEE', 'LegalEmployeesService', before);
  return resolve(true);
}

export async function getLegalInvestigations(): Promise<LegalInvestigation[]> {
  return resolve(legalInvestigations);
}

export async function getLegalInvestigationById(idValue: string): Promise<LegalInvestigation | undefined> {
  return resolve(legalInvestigations.find(item => item.id === idValue));
}

export async function createLegalInvestigation(input: CreateLegalInvestigationInput): Promise<LegalInvestigation> {
  const item: LegalInvestigation = { id: id('inv'), ...input, status: 'OPEN', createdAt: now(), updatedAt: now(), result: 'OTHER' };
  pushAndReturn(legalInvestigations, item);
  audit('CREATE_INVESTIGATION', 'LegalInvestigationsService', undefined, item);
  return resolve(item);
}

export async function updateLegalInvestigation(idValue: string, input: UpdateLegalInvestigationInput): Promise<LegalInvestigation | undefined> {
  const index = legalInvestigations.findIndex(item => item.id === idValue);
  if (index === -1) return resolve(undefined);
  const before = clone(legalInvestigations[index]);
  legalInvestigations[index] = touchInvestigation({ ...legalInvestigations[index], ...input });
  audit('UPDATE_INVESTIGATION', 'LegalInvestigationsService', before, legalInvestigations[index]);
  return resolve(legalInvestigations[index]);
}

export async function closeLegalInvestigation(idValue: string, input: CloseLegalInvestigationInput): Promise<LegalInvestigation | undefined> {
  const index = legalInvestigations.findIndex(item => item.id === idValue);
  if (index === -1) return resolve(undefined);
  const before = clone(legalInvestigations[index]);
  legalInvestigations[index] = touchInvestigation({
    ...legalInvestigations[index],
    status: 'CLOSED',
    closedAt: input.closedAt,
    result: input.result,
    finalDecision: input.finalDecision,
    finalRecommendations: input.finalRecommendations,
    closureNotes: input.closureNotes,
  });
  audit('CLOSE_INVESTIGATION', 'LegalInvestigationsService', before, legalInvestigations[index]);
  return resolve(legalInvestigations[index]);
}

export async function deleteLegalInvestigation(idValue: string): Promise<boolean> {
  const index = legalInvestigations.findIndex(item => item.id === idValue);
  if (index === -1) return resolve(false);
  const before = clone(legalInvestigations[index]);
  legalInvestigations.splice(index, 1);
  for (let i = legalInvestigationDocuments.length - 1; i >= 0; i -= 1) if (legalInvestigationDocuments[i].investigationId === idValue) legalInvestigationDocuments.splice(i, 1);
  for (let i = legalSummons.length - 1; i >= 0; i -= 1) if (legalSummons[i].investigationId === idValue) legalSummons.splice(i, 1);
  for (let i = legalInvestigationSessions.length - 1; i >= 0; i -= 1) if (legalInvestigationSessions[i].investigationId === idValue) legalInvestigationSessions.splice(i, 1);
  audit('DELETE_INVESTIGATION', 'LegalInvestigationsService', before);
  return resolve(true);
}

export async function getLegalInvestigationDocuments(investigationId?: string): Promise<LegalInvestigationDocument[]> {
  return resolve(investigationId ? legalInvestigationDocuments.filter(item => item.investigationId === investigationId) : legalInvestigationDocuments);
}

export async function createLegalInvestigationDocument(input: CreateLegalInvestigationDocumentInput): Promise<LegalInvestigationDocument> {
  const item: LegalInvestigationDocument = {
    id: id('inv-doc'),
    investigationId: input.investigationId,
    description: input.description,
    fileId: id('file'),
    fileName: input.fileName,
    fileType: input.fileType,
    addedAt: now(),
    addedByUserId: input.addedByUserId,
    documentCategory: input.documentCategory,
  };
  pushAndReturn(legalInvestigationDocuments, item);
  audit('ADD_INVESTIGATION_DOCUMENT', 'LegalDocumentsService', undefined, item);
  return resolve(item);
}

export async function deleteLegalInvestigationDocument(idValue: string): Promise<boolean> {
  const index = legalInvestigationDocuments.findIndex(item => item.id === idValue);
  if (index === -1) return resolve(false);
  const before = clone(legalInvestigationDocuments[index]);
  legalInvestigationDocuments.splice(index, 1);
  audit('DELETE_INVESTIGATION_DOCUMENT', 'LegalDocumentsService', before);
  return resolve(true);
}

export async function getLegalSummons(investigationId?: string): Promise<LegalSummons[]> {
  return resolve(investigationId ? legalSummons.filter(item => item.investigationId === investigationId) : legalSummons);
}

export async function createLegalSummons(input: CreateLegalSummonsInput): Promise<LegalSummons> {
  const item: LegalSummons = { id: id('sum'), ...input, createdAt: now(), updatedAt: now() };
  pushAndReturn(legalSummons, item);
  audit('CREATE_SUMMONS', 'LegalInvestigationsService', undefined, item);
  return resolve(item);
}

export async function updateLegalSummons(idValue: string, input: UpdateLegalSummonsInput): Promise<LegalSummons | undefined> {
  const index = legalSummons.findIndex(item => item.id === idValue);
  if (index === -1) return resolve(undefined);
  const before = clone(legalSummons[index]);
  legalSummons[index] = { ...legalSummons[index], ...input, updatedAt: now() };
  audit('UPDATE_SUMMONS', 'LegalInvestigationsService', before, legalSummons[index]);
  return resolve(legalSummons[index]);
}

export async function deleteLegalSummons(idValue: string): Promise<boolean> {
  const index = legalSummons.findIndex(item => item.id === idValue);
  if (index === -1) return resolve(false);
  const before = clone(legalSummons[index]);
  legalSummons.splice(index, 1);
  audit('DELETE_SUMMONS', 'LegalInvestigationsService', before);
  return resolve(true);
}

export async function getLegalInvestigationSessions(investigationId?: string): Promise<LegalInvestigationSession[]> {
  return resolve(investigationId ? legalInvestigationSessions.filter(item => item.investigationId === investigationId) : legalInvestigationSessions);
}

export async function createLegalInvestigationSession(input: CreateLegalInvestigationSessionInput): Promise<LegalInvestigationSession> {
  const item: LegalInvestigationSession = { id: id('inv-session'), ...input, createdAt: now(), updatedAt: now() };
  pushAndReturn(legalInvestigationSessions, item);
  audit('CREATE_INVESTIGATION_SESSION', 'LegalInvestigationsService', undefined, item);
  return resolve(item);
}

export async function updateLegalInvestigationSession(idValue: string, input: UpdateLegalInvestigationSessionInput): Promise<LegalInvestigationSession | undefined> {
  const index = legalInvestigationSessions.findIndex(item => item.id === idValue);
  if (index === -1) return resolve(undefined);
  const before = clone(legalInvestigationSessions[index]);
  legalInvestigationSessions[index] = { ...legalInvestigationSessions[index], ...input, updatedAt: now() };
  audit('UPDATE_INVESTIGATION_SESSION', 'LegalInvestigationsService', before, legalInvestigationSessions[index]);
  return resolve(legalInvestigationSessions[index]);
}

export async function deleteLegalInvestigationSession(idValue: string): Promise<boolean> {
  const index = legalInvestigationSessions.findIndex(item => item.id === idValue);
  if (index === -1) return resolve(false);
  const before = clone(legalInvestigationSessions[index]);
  legalInvestigationSessions.splice(index, 1);
  audit('DELETE_INVESTIGATION_SESSION', 'LegalInvestigationsService', before);
  return resolve(true);
}

export async function getLegalDocuments(): Promise<LegalDocumentListItem[]> {
  return resolve(buildDocumentsView());
}

export async function createLegalDocument(input: {
  source: LegalDocumentSource;
  relationId?: string;
  description: string;
  fileName: string;
  fileType: string;
  documentCategory?: string;
  addedByUserId: string;
}): Promise<LegalDocumentListItem> {
  const item: LegalDocumentListItem = {
    id: id('doc'),
    source: input.source,
    relationId: input.relationId || 'general',
    description: input.description,
    fileId: id('file'),
    fileName: input.fileName,
    fileType: input.fileType,
    addedAt: now(),
    addedByUserId: input.addedByUserId,
    documentCategory: input.documentCategory as LegalDocumentListItem['documentCategory'],
  };

  if (input.source === 'CASE') {
    legalCaseDocuments.push({
      id: item.id,
      caseId: item.relationId,
      description: item.description,
      fileId: item.fileId,
      fileName: item.fileName,
      fileType: item.fileType,
      addedAt: item.addedAt,
      addedByUserId: item.addedByUserId,
      documentCategory: item.documentCategory,
    });
  } else if (input.source === 'INVESTIGATION') {
    legalInvestigationDocuments.push({
      id: item.id,
      investigationId: item.relationId,
      description: item.description,
      fileId: item.fileId,
      fileName: item.fileName,
      fileType: item.fileType,
      addedAt: item.addedAt,
      addedByUserId: item.addedByUserId,
      documentCategory: item.documentCategory,
    });
  } else {
    legalGeneralDocuments.unshift(item);
  }

  audit('CREATE_DOCUMENT', 'LegalDocumentsService', undefined, item);
  return resolve(item);
}

export async function deleteLegalDocument(idValue: string): Promise<boolean> {
  const caseIndex = legalCaseDocuments.findIndex(item => item.id === idValue);
  if (caseIndex !== -1) {
    const before = clone(legalCaseDocuments[caseIndex]);
    legalCaseDocuments.splice(caseIndex, 1);
    audit('DELETE_DOCUMENT', 'LegalDocumentsService', before);
    return resolve(true);
  }

  const invIndex = legalInvestigationDocuments.findIndex(item => item.id === idValue);
  if (invIndex !== -1) {
    const before = clone(legalInvestigationDocuments[invIndex]);
    legalInvestigationDocuments.splice(invIndex, 1);
    audit('DELETE_DOCUMENT', 'LegalDocumentsService', before);
    return resolve(true);
  }

  const genIndex = legalGeneralDocuments.findIndex(item => item.id === idValue);
  if (genIndex !== -1) {
    const before = clone(legalGeneralDocuments[genIndex]);
    legalGeneralDocuments.splice(genIndex, 1);
    audit('DELETE_DOCUMENT', 'LegalDocumentsService', before);
    return resolve(true);
  }

  return resolve(false);
}

export async function getLegalAuditLogs(): Promise<LegalAuditLog[]> {
  return resolve(legalAuditLogs);
}

export async function getLegalSettings(): Promise<LegalSettings> {
  return resolve(legalSettings);
}

export async function updateLegalSettings(input: UpdateLegalSettingsInput): Promise<LegalSettings> {
  const before = clone(legalSettings);
  Object.assign(legalSettings, input);
  audit('UPDATE_SETTINGS', 'LegalSettingsService', before, legalSettings);
  return resolve(legalSettings);
}



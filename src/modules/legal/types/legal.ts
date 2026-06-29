export type LegalPartyType = 'PERSON' | 'COMPANY' | 'GOVERNMENT' | 'OTHER';
export type LegalCaseDirection = 'AGAINST_US' | 'BY_US';
export type LegalCaseCategory = 'LABOR' | 'COMMERCIAL' | 'CRIMINAL' | 'REAL_ESTATE' | 'ADMINISTRATIVE' | 'OTHER';
export type LegalCaseStatus = 'ACTIVE' | 'CLOSED';
export type LegalSessionJudgmentStatus = 'IN_OUR_FAVOR' | 'AGAINST_US' | 'POSTPONED' | 'UNDER_REVIEW' | 'OTHER';
export type LegalEmployeeStatus = 'ACTIVE' | 'INACTIVE';
export type LegalInvestigationStatus = 'OPEN' | 'CLOSED';
export type LegalSummonsStatus = 'SENT' | 'CONFIRMED' | 'NO_SHOW' | 'CANCELLED';
export type LegalDocumentSource = 'CASE' | 'INVESTIGATION' | 'CONTRACT' | 'GENERAL';
export type LegalDocumentCategory = 'CONTRACT' | 'MEMO' | 'JUDGMENT' | 'MINUTES' | 'OTHER';
export type LegalCaseClosureReason = 'RECONCILIATION' | 'FINAL_JUDGMENT' | 'WAIVER' | 'ARCHIVE' | 'OTHER';
export type LegalInvestigationResult = 'PROVEN' | 'NOT_PROVEN' | 'ARCHIVED' | 'REFERRED' | 'OTHER';

export interface LegalParty {
  id: string;
  name: string;
  partyType: LegalPartyType;
  identityNumber?: string;
  contactInfo?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LegalCase {
  id: string;
  internalCaseNumber: string;
  officialCaseNumber: string;
  caseDate: string;
  direction: LegalCaseDirection;
  category: LegalCaseCategory;
  courtName: string;
  plaintiffPartyId: string;
  defendantPartyId: string;
  subject?: string;
  claimAmount?: number;
  status: LegalCaseStatus;
  supervisorUserIds: string[];
  closedAt?: string;
  closureReason?: LegalCaseClosureReason;
  closureNotes?: string;
  reopenedAt?: string;
  reopenedByUserId?: string;
  reopenReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LegalCaseDocument {
  id: string;
  caseId: string;
  description: string;
  fileId: string;
  fileName: string;
  fileType: string;
  addedAt: string;
  addedByUserId: string;
  documentCategory?: LegalDocumentCategory;
}

export interface LegalCaseSession {
  id: string;
  caseId: string;
  sessionDateTime: string;
  location: string;
  attendees: string[];
  attendeeRoles: string[];
  attachments?: string[];
  judgmentStatus: LegalSessionJudgmentStatus;
  judgmentText?: string;
  notes?: string;
  nextSessionDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LegalEmployee {
  id: string;
  name: string;
  employeeNumber: string;
  department: string;
  jobTitle: string;
  email: string;
  mobile?: string;
  status: LegalEmployeeStatus;
}

export interface LegalInvestigation {
  id: string;
  investigationNumber: string;
  investigationDate: string;
  subject: string;
  employeeIds: string[];
  status: LegalInvestigationStatus;
  closedAt?: string;
  result?: LegalInvestigationResult;
  finalDecision?: string;
  finalRecommendations?: string;
  closureNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LegalInvestigationDocument {
  id: string;
  investigationId: string;
  description: string;
  fileId: string;
  fileName: string;
  fileType: string;
  addedAt: string;
  addedByUserId: string;
  documentCategory?: LegalDocumentCategory;
}

export interface LegalSummons {
  id: string;
  investigationId: string;
  employeeId: string;
  sessionDateTime: string;
  location: string;
  subject: string;
  notes?: string;
  status: LegalSummonsStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface LegalInvestigationSession {
  id: string;
  investigationId: string;
  summonsId?: string;
  attendeeEmployeeIds: string[];
  sessionDateTime: string;
  location: string;
  subject: string;
  statementText: string;
  attachments?: string[];
  investigatorNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LegalDashboardSummary {
  activeCases: number;
  closedCases: number;
  upcomingCaseSessionsThisWeek: number;
  openInvestigations: number;
  closedInvestigations: number;
  upcomingSummons: number;
  legalDocumentsCount: number;
}

export interface LegalAuditLog {
  id: string;
  userName: string;
  actionType: string;
  serviceName: string;
  dateTime: string;
  beforeValue?: string;
  afterValue?: string;
  ipAddress?: string;
}

export interface LegalSettings {
  caseReminderHours: number;
  allowedFileTypes: string[];
  maxFileSizeMb: number;
  enableInternalNotifications: boolean;
  enableEmailNotifications: boolean;
}

export interface LegalDocumentListItem {
  id: string;
  source: LegalDocumentSource;
  relationId: string;
  description: string;
  fileId: string;
  fileName: string;
  fileType: string;
  addedAt: string;
  addedByUserId: string;
  documentCategory?: LegalDocumentCategory;
}

export interface LegalReportCard {
  id: string;
  title: string;
  description: string;
}

export interface CreateLegalPartyInput {
  name: string;
  partyType: LegalPartyType;
  identityNumber?: string;
  contactInfo?: string;
  notes?: string;
}

export interface UpdateLegalPartyInput extends CreateLegalPartyInput {}

export interface CreateLegalCaseInput {
  internalCaseNumber: string;
  officialCaseNumber: string;
  caseDate: string;
  direction: LegalCaseDirection;
  category: LegalCaseCategory;
  courtName: string;
  plaintiffPartyId: string;
  defendantPartyId: string;
  subject?: string;
  claimAmount?: number;
  supervisorUserIds: string[];
}

export interface UpdateLegalCaseInput extends CreateLegalCaseInput {}

export interface CloseLegalCaseInput {
  closedAt: string;
  closureReason: LegalCaseClosureReason;
  closureNotes?: string;
}

export interface ReopenLegalCaseInput {
  reopenReason: string;
  reopenedByUserId: string;
  reopenedAt?: string;
}

export interface CreateLegalCaseDocumentInput {
  caseId: string;
  description: string;
  fileName: string;
  fileType: string;
  documentCategory?: LegalDocumentCategory;
  addedByUserId: string;
}

export interface CreateLegalCaseSessionInput {
  caseId: string;
  sessionDateTime: string;
  location: string;
  attendees: string[];
  attendeeRoles: string[];
  judgmentStatus: LegalSessionJudgmentStatus;
  judgmentText?: string;
  notes?: string;
  nextSessionDate?: string;
  attachments?: string[];
}

export interface UpdateLegalCaseSessionInput extends CreateLegalCaseSessionInput {}

export interface CreateLegalEmployeeInput {
  name: string;
  employeeNumber: string;
  department: string;
  jobTitle: string;
  email: string;
  mobile?: string;
  status: LegalEmployeeStatus;
}

export interface UpdateLegalEmployeeInput extends CreateLegalEmployeeInput {}

export interface CreateLegalInvestigationInput {
  investigationNumber: string;
  investigationDate: string;
  subject: string;
  employeeIds: string[];
}

export interface UpdateLegalInvestigationInput extends CreateLegalInvestigationInput {}

export interface CloseLegalInvestigationInput {
  closedAt: string;
  result: LegalInvestigationResult;
  finalDecision: string;
  finalRecommendations?: string;
  closureNotes?: string;
}

export interface CreateLegalInvestigationDocumentInput {
  investigationId: string;
  description: string;
  fileName: string;
  fileType: string;
  documentCategory?: LegalDocumentCategory;
  addedByUserId: string;
}

export interface CreateLegalSummonsInput {
  investigationId: string;
  employeeId: string;
  sessionDateTime: string;
  location: string;
  subject: string;
  notes?: string;
  status: LegalSummonsStatus;
}

export interface UpdateLegalSummonsInput extends CreateLegalSummonsInput {}

export interface CreateLegalInvestigationSessionInput {
  investigationId: string;
  summonsId?: string;
  attendeeEmployeeIds: string[];
  sessionDateTime: string;
  location: string;
  subject: string;
  statementText: string;
  attachments?: string[];
  investigatorNotes?: string;
}

export interface UpdateLegalInvestigationSessionInput extends CreateLegalInvestigationSessionInput {}

export interface UpdateLegalSettingsInput extends LegalSettings {}

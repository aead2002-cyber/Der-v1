export type Status = 'not_started' | 'in_progress' | 'completed';
export type Importance = 'high' | 'medium' | 'low';
export type Role = 'admin' | 'auditor' | 'user';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  displayNameEn?: string;
  /** Legacy role; kept so existing seed users keep working. New code should
   * rely on `groupId` + `permissionOverrides` instead. When `groupId` is unset
   * we fall back to a built-in group named after the role. */
  role: Role;
  /** Membership in exactly one PermissionGroup. */
  groupId?: string;
  /** Per-user adjustments on top of the group's permissions. */
  permissionOverrides?: {
    /** Keys granted in addition to the group's permissions. */
    granted?: string[];
    /** Keys explicitly revoked even though the group includes them. */
    revoked?: string[];
  };
  teams: string[];
  departments: string[];
  photoURL?: string;
  /** When true, this user can sign in without receiving/entering an OTP. */
  bypassOtp?: boolean;
  /** When true, this user receives direct notification (and email) for every new security incident report. */
  receiveSecurityIncidents?: boolean;
  /** Temporary frontend-only platform access list until backend authorization is added. */
  platforms?: import('./shared/types/platform').PlatformCode[];
}

export interface PermissionGroup {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  /** Built-in groups (admin/auditor/user) — cannot be deleted; permissions still editable. */
  isSystem?: boolean;
  /** Permission keys this group grants. See src/permissions.ts. */
  permissions: string[];
  createdAt?: any;
  updatedAt?: any;
}

export interface Framework {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  createdAt: any;
  updatedAt: any;
}

export interface Policy {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  frameworkId: string;
  createdAt: any;
  updatedAt: any;
}

export interface PolicyItem {
  id: string;
  policyId: string;
  parentId?: string;
  order: number;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  attachments?: string[];
  createdAt: any;
  updatedAt: any;
}

export interface StandardClassification {
  id: string;
  nameAr: string;
  nameEn: string;
  createdAt: any;
  updatedAt: any;
}

export interface Standard {
  id: string;
  policyId: string;
  policyItemId?: string; // DEPRECATED — kept for backward compatibility, use policyItemIds
  policyItemIds?: string[]; // Many-to-many: a standard can link to multiple items
  nameAr: string;
  nameEn: string;
  descriptionAr: string; // Used as the objective (الهدف)
  descriptionEn: string;
  potentialRisksAr?: string; // المخاطر المحتملة
  potentialRisksEn?: string;
  classifications: string[]; // Array of classification IDs
  attachments?: string[];
  order?: number; // Manual sort order within the same policy
  createdAt: any;
  updatedAt: any;
}

export type Frequency = 'annual' | 'semi_annual' | 'quarterly' | 'specific_date';

export interface Procedure {
  id: string;
  parentId?: string;
  order?: number; // Manual sort order within siblings of same parent
  standardId: string;
  policyId: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  status: Status;
  importance: Importance;
  startDate: string;
  endDate: string;
  assignedTo: string[]; // User UIDs
  assignedTeams: string[];
  isPeriodic: boolean;
  frequency?: Frequency;
  attachments?: string[];
  comments?: Comment[];
  /** Weight 1–10 for completion calculations. Only meaningful on leaf procedures
   * (procedures without children). For parent procedures, the effective weight
   * is computed as the sum of all descendant leaf weights — this stored value
   * is ignored. Defaults to 1. */
  weight?: number;
  createdAt: any;
  updatedAt: any;
}

export interface Evidence {
  id: string;
  procedureId: string;
  name: string;
  url: string;
  type: string;
  uploadedBy: string;
  uploadedAt: any;
  description?: string;
}

export interface Comment {
  id: string;
  procedureId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: any;
}

export interface Team {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  createdAt: any;
  updatedAt: any;
}

export interface Department {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  createdAt: any;
  updatedAt: any;
}

export interface Risk {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  likelihood: number; // 1-5 manual default (auto-recomputed from linked procedures when present)
  impact: number; // 1-5
  procedureIds?: string[];
  createdAt: any;
  updatedAt: any;
}

export interface Commitment {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  expiryDate: string;
  responsibleUser: string; // User UID
  status: 'active' | 'expired' | 'expiring_soon' | 'completed';
  evidenceTitle?: string;
  evidenceLink?: string;
  evidenceUploadedAt?: string;
  createdAt: any;
  updatedAt: any;
}

export interface NotificationSettings {
  notifyBeforeDays: number; // For Commitments
  emailNotificationsEnabled: boolean;
  ccAdmin: boolean;
  notifyOnAssignment: boolean;
  procedureExpiryNotificationDays: number;
}

export interface ComplianceThreshold {
  id: string;
  labelAr: string;
  labelEn: string;
  min: number;
  max: number;
  color: string;
}

export interface ComplianceSettings {
  thresholds: ComplianceThreshold[];
  systemLogo?: string;
}

export interface EmailSettings {
  smtpServer: string;
  smtpPort: number;
  smtpUser?: string;
  smtpPassword?: string;
  senderEmail: string;
  senderName: string;
  encryption: 'none' | 'ssl' | 'tls';
}

export interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: 'assignment' | 'expiry_reminder' | 'overdue_alert' | 'password_reset' | 'otp' | 'password_changed' | 'incident_new_to_owner' | 'incident_received_to_reporter' | 'incident_resolved_to_reporter';
}

export interface NotificationLog {
  id: string;
  recipientId: string;
  recipientEmail: string;
  recipientName: string;
  type: 'assignment' | 'expiry_reminder' | 'overdue_alert';
  subject: string;
  body: string;
  status: 'sent' | 'failed' | 'pending';
  sentAt: string;
  errorMessage?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: 'create' | 'update' | 'delete' | 'status_change' | 'evidence_add' | 'comment_add' | 'assignment';
  entityType: 'policy' | 'standard' | 'procedure' | 'evidence' | 'comment' | 'user' | 'framework' | 'commitment' | 'incident' | 'policy_item' | 'standard_classification' | 'risk' | 'incident_note' | 'change_request' | 'lookup_option' | 'auth';
  entityId: string;
  oldValue?: any;
  newValue?: any;
  timestamp: any;
  ip?: string;
  userAgent?: string;
}

export interface Notification {
  id: string;
  userId: string;
  titleAr: string;
  titleEn: string;
  messageAr: string;
  messageEn: string;
  type: 'incident_assignment' | 'procedure_assignment' | 'expiry_reminder' | 'overdue_alert' | 'general' | 'security';
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface SecurityIncident {
  id: string;
  reporterEmail: string;
  title: string;
  description: string;
  type: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'new' | 'open' | 'investigating' | 'resolved' | 'closed';
  reportedAt: string;
  assignedTo?: string; // User UID
  updatedAt: string;
  closedAt?: string;
  attachments?: string[];
}

export interface IncidentNote {
  id: string;
  incidentId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  attachments?: string[];
}

export interface IncidentFeedback {
  id: string;
  incidentId: string;
  rating: number; // 1-5
  comment: string;
  submittedAt: string;
}

export type ChangeRequestStatus = 'pending' | 'approved' | 'rejected' | 'clarification_needed';
export type ChangeRequestType = 'tool_change' | 'firewall_open' | 'access_request' | 'other' | (string & {});

export interface ChangeRequestHistory {
  action: 'create' | 'approve' | 'reject' | 'request_clarification' | 'respond_clarification';
  note: string;
  userId: string;
  userName: string;
  timestamp: string;
  attachments?: string[];
}

export interface ChangeRequest {
  id: string;
  title: string;
  description: string;
  type: ChangeRequestType;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  status: ChangeRequestStatus;
  attachments?: string[];
  history: ChangeRequestHistory[];
  createdAt: string;
  updatedAt: string;
}

export interface LookupOption {
  id: string;
  category: string; // e.g., 'change_request_type', 'incident_type', 'procedure_status'
  value: string;
  labelAr: string;
  labelEn: string;
  isActive: boolean;
  descriptionAr?: string;
  descriptionEn?: string;
}

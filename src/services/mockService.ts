import { Policy, Standard, Procedure, AuditLog, User, Framework, Evidence, StandardClassification, PolicyItem, Team, Department, Commitment, NotificationSettings, EmailSettings, NotificationTemplate, ComplianceSettings, NotificationLog, SecurityIncident, IncidentFeedback, IncidentNote, Notification, ChangeRequest, LookupOption, Risk, PermissionGroup } from '../types';
import i18n from '../i18n';
import { DEFAULT_GROUPS } from '../permissions';
// for testing the github actions.test1
const STORAGE_KEYS = {
  POLICIES: 'der3_policies',
  POLICY_ITEMS: 'der3_policy_items',
  STANDARDS: 'der3_standards',
  PROCEDURES: 'der3_procedures',
  AUDIT_LOGS: 'der3_audit_logs',
  USERS: 'der3_users',
  FRAMEWORKS: 'der3_frameworks',
  EVIDENCE: 'der3_evidence',
  STANDARD_CLASSIFICATIONS: 'der3_standard_classifications',
  TEAMS: 'der3_teams',
  DEPARTMENTS: 'der3_departments',
  COMMITMENTS: 'der3_commitments',
  NOTIFICATION_SETTINGS: 'der3_notification_settings',
  EMAIL_SETTINGS: 'der3_email_settings',
  NOTIFICATION_TEMPLATES: 'der3_notification_templates',
  COMPLIANCE_SETTINGS: 'der3_compliance_settings',
  CURRENT_USER: 'der3_current_user',
  PENDING_OTP: 'der3_pending_otp',
  NOTIFICATION_LOGS: 'der3_notification_logs',
  RISKS: 'der3_risks',
  INCIDENTS: 'der3_incidents',
  INCIDENT_FEEDBACK: 'der3_incident_feedback',
  INCIDENT_NOTES: 'der3_incident_notes',
  NOTIFICATIONS: 'der3_notifications',
  RESET_TOKENS: 'der3_reset_tokens',
  CHANGE_REQUESTS: 'der3_change_requests',
  LOOKUP_OPTIONS: 'der3_lookup_options',
  PERMISSION_GROUPS: 'der3_permission_groups'
};

const API_ENTITY_MAP: Record<string, { entity: string }> = {
  [STORAGE_KEYS.USERS]: { entity: 'users' },
  [STORAGE_KEYS.POLICIES]: { entity: 'policies' },
  [STORAGE_KEYS.POLICY_ITEMS]: { entity: 'policyItems' },
  [STORAGE_KEYS.STANDARDS]: { entity: 'standards' },
  [STORAGE_KEYS.PROCEDURES]: { entity: 'procedures' },
  [STORAGE_KEYS.AUDIT_LOGS]: { entity: 'auditLogs' },
  [STORAGE_KEYS.CHANGE_REQUESTS]: { entity: 'changeRequests' },
  [STORAGE_KEYS.LOOKUP_OPTIONS]: { entity: 'lookupOptions' },
  [STORAGE_KEYS.EVIDENCE]: { entity: 'evidence' },
  [STORAGE_KEYS.FRAMEWORKS]: { entity: 'frameworks' },
  [STORAGE_KEYS.STANDARD_CLASSIFICATIONS]: { entity: 'standardClassifications' },
  [STORAGE_KEYS.TEAMS]: { entity: 'teams' },
  [STORAGE_KEYS.DEPARTMENTS]: { entity: 'departments' },
  [STORAGE_KEYS.COMMITMENTS]: { entity: 'commitments' },
  [STORAGE_KEYS.NOTIFICATION_TEMPLATES]: { entity: 'notificationTemplates' },
  [STORAGE_KEYS.NOTIFICATION_LOGS]: { entity: 'notificationLogs' },
  [STORAGE_KEYS.RISKS]: { entity: 'risks' },
  [STORAGE_KEYS.INCIDENTS]: { entity: 'incidents' },
  [STORAGE_KEYS.INCIDENT_NOTES]: { entity: 'incidentNotes' },
  [STORAGE_KEYS.INCIDENT_FEEDBACK]: { entity: 'incidentFeedback' },
  [STORAGE_KEYS.NOTIFICATIONS]: { entity: 'notifications' },
  [STORAGE_KEYS.PERMISSION_GROUPS]: { entity: 'permissionGroups' }
};

// Base origin for the backend API. Configure via VITE_API_URL in .env.
// Example: VITE_API_URL=http://192.168.1.50:4000
export const apiOrigin: string =
  (import.meta as any).env?.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:4000';
export const apiUrl: string = `${apiOrigin}/api`;

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB — must match server config
export const MAX_UPLOAD_MB = MAX_UPLOAD_BYTES / 1024 / 1024;

export const uploadFile = async (file: File): Promise<{ url: string; name: string } | null> => {
  if (file.size > MAX_UPLOAD_BYTES) {
    const lang = (typeof window !== 'undefined' ? (window as any).i18nLang : 'ar');
    const msg = lang === 'en'
      ? `File "${file.name}" exceeds the maximum allowed size of ${MAX_UPLOAD_MB} MB`
      : `الملف "${file.name}" يتجاوز الحد الأقصى المسموح به (${MAX_UPLOAD_MB} ميجابايت)`;
    try { (await import('sonner')).toast.error(msg); } catch { /* noop */ }
    console.error('[upload] file too large:', file.name, file.size);
    return null;
  }
  const form = new FormData();
  form.append('file', file);
  try {
    const res = await fetch(`${apiUrl}/uploads`, { method: 'POST', body: form });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      let serverMsg = '';
      try { serverMsg = JSON.parse(text).error || ''; } catch { /* noop */ }
      console.error('[upload] failed', res.status, serverMsg || text);
      try { (await import('sonner')).toast.error(serverMsg || `Upload failed (${res.status})`); } catch { /* noop */ }
      return null;
    }
    const data = await res.json();
    // Store the relative path (e.g. "/api/files/<id>") rather than the absolute
    // URL. `resolveAttachmentUrl` prepends the current apiOrigin at display
    // time, so photos remain valid when the system is moved to another server.
    return { url: data.url as string, name: data.name };
  } catch (err) {
    console.error('[upload] error', err);
    return null;
  }
};

// Returns linked policy item IDs, transparently merging legacy single
// `policyItemId` with new `policyItemIds[]` array.
export const getStandardItemIds = (s: Standard | any): string[] => {
  if (!s) return [];
  const arr = Array.isArray(s.policyItemIds) ? s.policyItemIds.filter(Boolean) : [];
  if (arr.length > 0) return arr;
  if (s.policyItemId) return [s.policyItemId];
  return [];
};

export const resolveAttachmentUrl = (value: string): string | null => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/uploads/') || value.startsWith('/api/files/')) return `${apiOrigin}${value}`;
  return null;
};

const syncApiRequest = <T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: any): T | null => {
  try {
    const xhr = new XMLHttpRequest();
    xhr.open(method, `${apiUrl}${path}`, false);
    xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
    xhr.send(body ? JSON.stringify(body) : null);
    if (xhr.status >= 200 && xhr.status < 300) {
      return xhr.responseText ? JSON.parse(xhr.responseText) : null;
    }
    console.error(`[API] ${method} ${path} failed ${xhr.status}: ${xhr.responseText}`);
  } catch (error) {
    console.error(`[API] ${method} ${path} threw:`, error);
  }
  return null;
};

// In-memory cache to avoid hammering the API with synchronous XHRs on every
// getLocalData() call. Invalidated on writes to the same key.
const memoryCache = new Map<string, unknown>();

// Public helper for callers that wrote data outside of setLocalData (e.g. their
// own bulk POST). Clears the cached value so the next getLocalData refetches.
export const invalidateLocalCache = (storageKey: string): void => {
  memoryCache.delete(storageKey);
  localStorage.removeItem(storageKey);
};

export const STORAGE_KEY_NAMES = STORAGE_KEYS;

const getLocalData = <T>(key: string, defaultValue: T): T => {
  if (memoryCache.has(key)) {
    return memoryCache.get(key) as T;
  }

  const mapping = API_ENTITY_MAP[key];
  if (mapping) {
    const response = syncApiRequest<any[]>('GET', `/${mapping.entity}`);
    if (Array.isArray(response)) {
      const result = response as unknown as T;
      localStorage.setItem(key, JSON.stringify(result));
      memoryCache.set(key, result);
      return result;
    }
  }

  const data = localStorage.getItem(key);
  const parsed: T = data ? JSON.parse(data) : defaultValue;
  memoryCache.set(key, parsed);
  return parsed;
};

const setLocalData = <T>(key: string, data: T): void => {
  // Cache a fresh copy so consumers that called getLocalData before this write
  // observe a new reference on the next read (so React state updates re-render).
  const cached = (Array.isArray(data) ? [...data] : data) as T;
  memoryCache.set(key, cached);
  const mapping = API_ENTITY_MAP[key];
  if (mapping) {
    const result = syncApiRequest<{ success?: boolean }>('POST', `/${mapping.entity}/bulk`, data);
    if (!result || !result.success) {
      console.error(`[API] persist failed for ${key}; localStorage updated but DB out of sync`);
    }
  }
  localStorage.setItem(key, JSON.stringify(data));
};

// Same as setLocalData but persists to the API in the background (non-blocking).
// Use for high-frequency writes (audit logs, notifications) that shouldn't make
// the UI wait. Cache + localStorage are still updated synchronously.
const setLocalDataAsync = <T>(key: string, data: T): void => {
  const cached = (Array.isArray(data) ? [...data] : data) as T;
  memoryCache.set(key, cached);
  localStorage.setItem(key, JSON.stringify(data));
  const mapping = API_ENTITY_MAP[key];
  if (!mapping) return;
  fetch(`${apiUrl}/${mapping.entity}/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).catch(err => {
    console.warn(`[API] async persist failed for ${key}:`, err?.message || err);
  });
};

const normalizeUserArrays = (user: any): User => {
  const normalize = (value: any): string[] => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.length > 0) {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [value];
      } catch {
        return [value];
      }
    }
    return [];
  };

  return {
    ...user,
    teams: normalize(user.teams),
    departments: normalize(user.departments)
  };
};

const NOTIFICATION_TYPE_TO_LOG_TYPE: Record<Notification['type'], NotificationLog['type']> = {
  procedure_assignment: 'assignment',
  incident_assignment: 'assignment',
  expiry_reminder: 'expiry_reminder',
  overdue_alert: 'overdue_alert',
  general: 'assignment',
  security: 'assignment'
};

const appendNotificationLog = (entry: NotificationLog) => {
  const logs = getLocalData<NotificationLog[]>(STORAGE_KEYS.NOTIFICATION_LOGS, []);
  logs.unshift(entry);
  setLocalData(STORAGE_KEYS.NOTIFICATION_LOGS, logs);
};

const buildEmailBody = (recipientName: string, message: string, link?: string) => {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const linkHtml = link ? `<p><a href="${origin}${link}">${origin}${link}</a></p>` : '';
  return {
    text: `Hello ${recipientName},\n\n${message}\n${link ? `\n${origin}${link}\n` : ''}\n— DER3 Shield System`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:520px">
<p>Hello <b>${recipientName}</b>,</p>
<p>${message}</p>
${linkHtml}
<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">
<p style="color:#94a3b8;font-size:12px">DER3 Shield System</p>
</div>`
  };
};

// Render a template subject/body by substituting {{var}} tokens
const renderTemplate = (text: string, vars: Record<string, string>): string => {
  if (!text) return '';
  return text.replace(/\{\{\s*([\w_]+)\s*\}\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{{${k}}}`));
};

// Built-in fallback templates for types added after the initial schema.
// Used when the user-editable template list doesn't yet contain the type.
const BUILTIN_TEMPLATES: Partial<Record<NotificationTemplate['type'], { subject: string; body: string }>> = {
  incident_new_to_owner: {
    subject: 'DER3 — بلاغ أمني جديد: {{incident_title}}',
    body: '<div style="font-family:system-ui,sans-serif;max-width:560px"><p>مرحباً <b>{{user_name}}</b>,</p><p>تم استلام بلاغ أمني جديد:</p><table style="border-collapse:collapse;font-size:13px;margin:8px 0"><tr><td style="padding:6px 12px 6px 0;color:#64748b">الرقم المرجعي:</td><td style="font-weight:bold;font-family:monospace">{{incident_id}}</td></tr><tr><td style="padding:6px 12px 6px 0;color:#64748b">العنوان:</td><td style="font-weight:bold">{{incident_title}}</td></tr><tr><td style="padding:6px 12px 6px 0;color:#64748b">الأولوية:</td><td style="font-weight:bold;color:#dc2626;text-transform:uppercase">{{incident_priority}}</td></tr><tr><td style="padding:6px 12px 6px 0;color:#64748b">المُبلِّغ:</td><td>{{reporter_email}}</td></tr><tr><td style="padding:6px 12px 6px 0;color:#64748b">التاريخ:</td><td>{{date}}</td></tr></table><p style="white-space:pre-wrap;background:#f8fafc;border-right:3px solid #1e293b;padding:10px 14px;border-radius:6px">{{incident_description}}</p><p><a href="{{link}}" style="display:inline-block;background:#1e293b;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">عرض البلاغ</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0"><p style="color:#94a3b8;font-size:12px">DER3 Shield System</p></div>'
  },
  incident_received_to_reporter: {
    subject: 'DER3 — تأكيد استلام البلاغ {{incident_id}}',
    body: '<div style="font-family:system-ui,sans-serif;max-width:520px"><p>مرحباً،</p><p>شكراً لتقديمك البلاغ الأمني. تم استلام بلاغك بنجاح وسيتم مراجعته من قبل الفريق المختص في أقرب وقت.</p><div style="background:#f1f5f9;border-radius:10px;padding:16px;margin:14px 0"><p style="margin:0;color:#64748b;font-size:12px;letter-spacing:1px;font-weight:bold">الرقم المرجعي</p><p style="margin:4px 0 0;font-family:monospace;font-size:22px;font-weight:bold;letter-spacing:2px">{{incident_id}}</p></div><p style="font-size:13px;color:#64748b">يمكنك الاحتفاظ بهذا الرقم للرجوع إليه عند الحاجة. سيتم إشعارك عند تغيّر حالة البلاغ.</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0"><p style="color:#94a3b8;font-size:12px">DER3 Shield System</p></div>'
  },
  incident_resolved_to_reporter: {
    subject: 'DER3 — تم إغلاق البلاغ {{incident_id}}',
    body: '<div style="font-family:system-ui,sans-serif;max-width:520px"><p>مرحباً،</p><p>نود إعلامك بأن البلاغ الأمني الذي تقدمت به قد تم <b style="color:#059669">{{incident_status_label}}</b>.</p><div style="background:#f1f5f9;border-radius:10px;padding:16px;margin:14px 0"><p style="margin:0;color:#64748b;font-size:12px;letter-spacing:1px;font-weight:bold">الرقم المرجعي</p><p style="margin:4px 0 0;font-family:monospace;font-size:22px;font-weight:bold;letter-spacing:2px">{{incident_id}}</p><p style="margin:8px 0 0;font-size:13px"><b>{{incident_title}}</b></p></div><p style="font-size:13px;color:#64748b">نشكر لكم تعاونكم في تعزيز أمن المنظومة.</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0"><p style="color:#94a3b8;font-size:12px">DER3 Shield System</p></div>'
  }
};

// Find a notification template by type. If missing, returns a sane default.
const getTemplateByType = (type: NotificationTemplate['type']): NotificationTemplate | null => {
  const templates = getLocalData<NotificationTemplate[]>(STORAGE_KEYS.NOTIFICATION_TEMPLATES, []);
  const found = Array.isArray(templates) ? templates.find(tpl => tpl.type === type) : null;
  if (found) return found;
  const builtin = BUILTIN_TEMPLATES[type];
  if (builtin) {
    return { id: `builtin-${type}`, name: `Built-in ${type}`, subject: builtin.subject, body: builtin.body, type };
  }
  return null;
};

// Resolve the absolute URL of the system logo for use in email HTML.
const getLogoUrl = (): string => {
  const cs = getLocalData<any>(STORAGE_KEYS.COMPLIANCE_SETTINGS, null);
  const raw = (cs && cs.systemLogo) ? cs.systemLogo : '/logo-der3.png';
  return resolveAttachmentUrl(raw) || (raw.startsWith('http') ? raw : `${apiOrigin}${raw}`);
};

// Build the canonical variable map merging logo_url with caller-provided vars
const withCommonVars = (vars: Record<string, string>): Record<string, string> => ({
  logo_url: getLogoUrl(),
  date: new Date().toLocaleString(),
  ...vars
});

const dispatchNotificationEmail = (notification: Notification): void => {
  const settings = getLocalData<NotificationSettings>(STORAGE_KEYS.NOTIFICATION_SETTINGS, {
    notifyBeforeDays: 30,
    emailNotificationsEnabled: true,
    ccAdmin: false,
    notifyOnAssignment: true,
    procedureExpiryNotificationDays: 7
  });
  if (!settings.emailNotificationsEnabled) return;

  const users = getLocalData<User[]>(STORAGE_KEYS.USERS, []);
  const recipient = Array.isArray(users) ? users.find(u => u.uid === notification.userId) : null;
  if (!recipient || !recipient.email) return;

  const lang = i18n.language === 'ar' ? 'ar' : 'en';
  const message = lang === 'ar' ? notification.messageAr : notification.messageEn;

  // Map notification type → template type. If a template exists, use it.
  const TPL_MAP: Record<Notification['type'], NotificationTemplate['type'] | null> = {
    procedure_assignment: 'assignment',
    incident_assignment: 'assignment',
    expiry_reminder: 'expiry_reminder',
    overdue_alert: 'overdue_alert',
    general: null,
    security: null
  };
  const tpl = TPL_MAP[notification.type] ? getTemplateByType(TPL_MAP[notification.type]!) : null;

  let subject: string;
  let html: string;
  let text: string;
  if (tpl) {
    const vars = withCommonVars({
      user_name: recipient.displayName || recipient.email,
      procedure_name: notification.titleAr || notification.titleEn || '',
      commitment_name: notification.titleAr || notification.titleEn || '',
      end_date: '',
      expiry_date: '',
      link: notification.link ? `${typeof window !== 'undefined' ? window.location.origin : ''}${notification.link}` : '',
      email: recipient.email
    });
    subject = renderTemplate(tpl.subject, vars);
    html = renderTemplate(tpl.body, vars);
    text = `${recipient.displayName || recipient.email}\n\n${message}`;
  } else {
    subject = lang === 'ar' ? notification.titleAr : notification.titleEn;
    const built = buildEmailBody(recipient.displayName || recipient.email, message, notification.link);
    text = built.text;
    html = built.html;
  }

  const emailSettings = getLocalData<EmailSettings>(STORAGE_KEYS.EMAIL_SETTINGS, {
    smtpServer: 'emails.mcci.org.sa',
    smtpPort: 587,
    senderEmail: 'no-reply@mcci.org.sa',
    senderName: 'DER3 Shield System',
    encryption: 'tls'
  } as EmailSettings);

  let cc: string[] | undefined;
  if (settings.ccAdmin) {
    cc = (Array.isArray(users) ? users : [])
      .filter(u => u.role === 'admin' && u.uid !== recipient.uid && u.email)
      .map(u => u.email);
    if (cc.length === 0) cc = undefined;
  }

  const logType = NOTIFICATION_TYPE_TO_LOG_TYPE[notification.type] || 'assignment';
  const logBase = {
    recipientId: recipient.uid,
    recipientEmail: recipient.email,
    recipientName: recipient.displayName || recipient.email,
    type: logType,
    subject,
    body: message
  };

  fetch(`${apiUrl}/email/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings: emailSettings, to: recipient.email, cc, subject, text, html })
  })
    .then(async res => {
      const data = await res.json().catch(() => ({} as any));
      if (res.ok && data.ok) {
        appendNotificationLog({ ...logBase, id: Math.random().toString(36).slice(2, 11), status: 'sent', sentAt: new Date().toISOString() });
      } else {
        appendNotificationLog({ ...logBase, id: Math.random().toString(36).slice(2, 11), status: 'failed', sentAt: new Date().toISOString(), errorMessage: data.error || `HTTP ${res.status}` });
      }
    })
    .catch(err => {
      appendNotificationLog({ ...logBase, id: Math.random().toString(36).slice(2, 11), status: 'failed', sentAt: new Date().toISOString(), errorMessage: err?.message || 'Network error' });
    });
};

// Send a templated email to an arbitrary address (not tied to a User record).
// Used for incident notifications that go to the reporter (who has no account)
// and to permission-holders by template type.
const sendTemplatedEmail = (
  templateType: NotificationTemplate['type'],
  to: string,
  vars: Record<string, string>,
  fallback: { subject: string; message: string; link?: string }
): void => {
  if (!to) return;
  const settings = getLocalData<NotificationSettings>(STORAGE_KEYS.NOTIFICATION_SETTINGS, {
    notifyBeforeDays: 30,
    emailNotificationsEnabled: true,
    ccAdmin: false,
    notifyOnAssignment: true,
    procedureExpiryNotificationDays: 7
  });
  if (!settings.emailNotificationsEnabled) return;

  const tpl = getTemplateByType(templateType);
  const fullVars = withCommonVars({ ...vars, email: to });

  let subject: string;
  let html: string;
  let text: string;
  if (tpl) {
    subject = renderTemplate(tpl.subject, fullVars);
    html = renderTemplate(tpl.body, fullVars);
    text = `${vars.user_name || to}\n\n${fallback.message}`;
  } else {
    subject = fallback.subject;
    const built = buildEmailBody(vars.user_name || to, fallback.message, fallback.link);
    text = built.text;
    html = built.html;
  }

  const emailSettings = getLocalData<EmailSettings>(STORAGE_KEYS.EMAIL_SETTINGS, {
    smtpServer: 'emails.mcci.org.sa',
    smtpPort: 587,
    senderEmail: 'no-reply@mcci.org.sa',
    senderName: 'DER3 Shield System',
    encryption: 'tls'
  } as EmailSettings);

  const logBase = {
    recipientId: to,
    recipientEmail: to,
    recipientName: vars.user_name || to,
    type: 'assignment' as NotificationLog['type'],
    subject,
    body: fallback.message
  };

  fetch(`${apiUrl}/email/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings: emailSettings, to, subject, text, html })
  })
    .then(async res => {
      const data = await res.json().catch(() => ({} as any));
      if (res.ok && data.ok) {
        appendNotificationLog({ ...logBase, id: Math.random().toString(36).slice(2, 11), status: 'sent', sentAt: new Date().toISOString() });
      } else {
        appendNotificationLog({ ...logBase, id: Math.random().toString(36).slice(2, 11), status: 'failed', sentAt: new Date().toISOString(), errorMessage: data.error || `HTTP ${res.status}` });
      }
    })
    .catch(err => {
      appendNotificationLog({ ...logBase, id: Math.random().toString(36).slice(2, 11), status: 'failed', sentAt: new Date().toISOString(), errorMessage: err?.message || 'Network error' });
    });
};

export const mockService = {
  getFrameworks: (): Framework[] => getLocalData(STORAGE_KEYS.FRAMEWORKS, [
    {
      id: 'nca',
      nameAr: 'الهيئة الوطنية للأمن السيبراني (NCA)',
      nameEn: 'National Cybersecurity Authority (NCA)',
      descriptionAr: 'الضوابط الأساسية للأمن السيبراني الصادرة من NCA',
      descriptionEn: 'Essential Cybersecurity Controls issued by NCA',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'iso27001',
      nameAr: 'آيزو 27001',
      nameEn: 'ISO/IEC 27001',
      descriptionAr: 'المعيار الدولي لإدارة أمن المعلومات',
      descriptionEn: 'International standard for information security management',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]),

  getPolicies: (): Policy[] => getLocalData(STORAGE_KEYS.POLICIES, []),
  getPolicyItems: (policyId?: string): PolicyItem[] => {
    const all = getLocalData<PolicyItem[]>(STORAGE_KEYS.POLICY_ITEMS, []);
    const filtered = policyId ? all.filter(i => i.policyId === policyId) : [...all];
    return filtered.sort((a, b) => (a.order || 0) - (b.order || 0));
  },
  getStandards: (): Standard[] => getLocalData(STORAGE_KEYS.STANDARDS, []),
  getStandardClassifications: (): StandardClassification[] => getLocalData(STORAGE_KEYS.STANDARD_CLASSIFICATIONS, []),
  
  getTeams: (): Team[] => getLocalData(STORAGE_KEYS.TEAMS, [
    { id: 'security', nameAr: 'فريق الأمن', nameEn: 'Security Team', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'it', nameAr: 'فريق تقنية المعلومات', nameEn: 'IT Team', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'compliance', nameAr: 'فريق الالتزام', nameEn: 'Compliance Team', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ]),

  getDepartments: (): Department[] => getLocalData(STORAGE_KEYS.DEPARTMENTS, [
    { id: 'it_dept', nameAr: 'إدارة تقنية المعلومات', nameEn: 'IT Department', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'hr_dept', nameAr: 'إدارة الموارد البشرية', nameEn: 'HR Department', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'finance_dept', nameAr: 'إدارة المالية', nameEn: 'Finance Department', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ]),

  getCommitments: (): Commitment[] => getLocalData(STORAGE_KEYS.COMMITMENTS, []),

  // ---- Risks ----
  getRisks: (): Risk[] => getLocalData<Risk[]>(STORAGE_KEYS.RISKS, []),

  saveRisk: (risk: Risk) => {
    const risks = mockService.getRisks();
    const index = risks.findIndex(r => r.id === risk.id);
    if (index >= 0) risks[index] = risk;
    else risks.push(risk);
    setLocalData(STORAGE_KEYS.RISKS, risks);
    mockService.addAuditLogAuto(index >= 0 ? 'update' : 'create', 'risk' as any, risk.id);
  },

  deleteRisk: (id: string) => {
    const risks = mockService.getRisks();
    setLocalData(STORAGE_KEYS.RISKS, risks.filter(r => r.id !== id));
    mockService.addAuditLogAuto('delete', 'risk' as any, id);
  },

  // Computes the effective likelihood of a risk:
  //  - No linked procedures → uses the stored value as-is.
  //  - All linked procedures completed → likelihood = 1 (lowest).
  //  - All linked procedures incomplete → likelihood = 5.
  //  - Mixed → likelihood = round(incompleteRatio * 5), min 1.
  getRiskLikelihood: (risk: Risk): number => {
    const ids = risk.procedureIds || [];
    if (ids.length === 0) return Math.max(1, Math.min(5, risk.likelihood || 1));
    const procedures = mockService.getProcedures();
    const linked = procedures.filter(p => ids.includes(p.id));
    if (linked.length === 0) return Math.max(1, Math.min(5, risk.likelihood || 1));
    const incomplete = linked.filter(p => p.status !== 'completed').length;
    if (incomplete === 0) return 1;
    if (incomplete === linked.length) return 5;
    const ratio = incomplete / linked.length;
    return Math.max(1, Math.round(ratio * 5));
  },

  getRiskScore: (risk: Risk): number => {
    const l = mockService.getRiskLikelihood(risk);
    const i = Math.max(1, Math.min(5, risk.impact || 1));
    return l * i;
  },


  getNotificationSettings: (): NotificationSettings => getLocalData(STORAGE_KEYS.NOTIFICATION_SETTINGS, {
    notifyBeforeDays: 30,
    emailNotificationsEnabled: true,
    ccAdmin: false,
    notifyOnAssignment: true,
    procedureExpiryNotificationDays: 7
  }),

  getProcedures: (): Procedure[] => getLocalData(STORAGE_KEYS.PROCEDURES, []),
  getEvidence: (procedureId?: string): Evidence[] => {
    const allEvidence = getLocalData<Evidence[]>(STORAGE_KEYS.EVIDENCE, []);
    if (procedureId) {
      return allEvidence.filter(e => e.procedureId === procedureId);
    }
    return allEvidence;
  },
  getAuditLogs: (): AuditLog[] => getLocalData(STORAGE_KEYS.AUDIT_LOGS, []),
  getUsers: (): User[] => {
    const raw = getLocalData<any[]>(STORAGE_KEYS.USERS, [
      {
        uid: '1',
        email: 'admin@der3.com',
        displayName: 'Admin User',
        role: 'admin',
        teams: [i18n.language === 'ar' ? 'فريق الأمن' : 'Security Team'],
        departments: [i18n.language === 'ar' ? 'إدارة تقنية المعلومات' : 'IT Department'],
        photoURL: 'https://i.pravatar.cc/150?u=1'
      },
      {
        uid: '2',
        email: 'ahmed@der3.com',
        displayName: 'Ahmed Al-Shehri',
        role: 'user',
        teams: [i18n.language === 'ar' ? 'فريق الأمن' : 'Security Team'],
        departments: [i18n.language === 'ar' ? 'إدارة تقنية المعلومات' : 'IT Department'],
        photoURL: 'https://i.pravatar.cc/150?u=2'
      },
      {
        uid: '3',
        email: 'mona@der3.com',
        displayName: 'Mona Al-Qahtani',
        role: 'user',
        teams: [i18n.language === 'ar' ? 'فريق الالتزام' : 'Compliance Team'],
        departments: [i18n.language === 'ar' ? 'إدارة تقنية المعلومات' : 'IT Department'],
        photoURL: 'https://i.pravatar.cc/150?u=3'
      }
    ]);
    return Array.isArray(raw) ? raw.map(normalizeUserArrays) : [];
  },

  saveFramework: (framework: Framework) => {
    const frameworks = mockService.getFrameworks();
    const index = frameworks.findIndex(f => f.id === framework.id);
    if (index >= 0) frameworks[index] = framework;
    else frameworks.push(framework);
    setLocalData(STORAGE_KEYS.FRAMEWORKS, frameworks);
    mockService.addAuditLogAuto(index >= 0 ? 'update' : 'create', 'framework', framework.id);
  },

  deleteFramework: (id: string) => {
    const frameworks = mockService.getFrameworks();
    const filtered = frameworks.filter(f => f.id !== id);
    setLocalData(STORAGE_KEYS.FRAMEWORKS, filtered);
    mockService.addAuditLogAuto('delete', 'framework', id);
  },

  savePolicy: (policy: Policy) => {
    const policies = mockService.getPolicies();
    const index = policies.findIndex(p => p.id === policy.id);
    if (index >= 0) policies[index] = policy;
    else policies.push(policy);
    setLocalData(STORAGE_KEYS.POLICIES, policies);
    mockService.addAuditLogAuto(index >= 0 ? 'update' : 'create', 'policy', policy.id);
  },

  bulkSavePolicies: (newPolicies: Policy[]) => {
    const existing = getLocalData<Policy[]>(STORAGE_KEYS.POLICIES, []);
    const combined = [...existing, ...newPolicies];
    setLocalData(STORAGE_KEYS.POLICIES, combined);
    mockService.addAuditLogAuto('create', 'policy', `bulk:${newPolicies.length}`);
  },

  deletePolicy: (id: string) => {
    const policies = mockService.getPolicies();
    const filtered = policies.filter(p => p.id !== id);
    setLocalData(STORAGE_KEYS.POLICIES, filtered);
    mockService.addAuditLogAuto('delete', 'policy', id);
  },

  deleteProcedure: (id: string) => {
    const procedures = mockService.getProcedures();
    const filtered = procedures.filter(p => p.id !== id);
    setLocalData(STORAGE_KEYS.PROCEDURES, filtered);
    mockService.addAuditLogAuto('delete', 'procedure', id);
  },

  saveUser: (user: User) => {
    const users = mockService.getUsers();
    const index = users.findIndex(u => u.uid === user.uid);
    if (index >= 0) users[index] = user;
    else users.push(user);
    setLocalData(STORAGE_KEYS.USERS, users);
    mockService.addAuditLogAuto(index >= 0 ? 'update' : 'create', 'user', user.uid);
  },

  deleteUser: (uid: string) => {
    const users = mockService.getUsers();
    const filtered = users.filter(u => u.uid !== uid);
    setLocalData(STORAGE_KEYS.USERS, filtered);
    mockService.addAuditLogAuto('delete', 'user', uid);
  },

  setUserPassword: (uid: string, password: string): { success: boolean; error?: string } => {
    if (!password || password.length < 6) {
      return { success: false, error: 'min_length' };
    }
    const response = syncApiRequest<{ success?: boolean; error?: string }>(
      'POST',
      `/users/${encodeURIComponent(uid)}/password`,
      { password }
    );
    if (response && response.success) {
      const user = mockService.getUsers().find(u => u.uid === uid);
      if (user) {
        mockService.addAuditLogAuto('update', 'user', uid, 'change_password');
      }
      return { success: true };
    }
    return { success: false, error: response?.error || 'request_failed' };
  },

  updateUser: (uid: string, updates: Partial<User>) => {
    const users = mockService.getUsers();
    const index = users.findIndex(u => u.uid === uid);
    if (index >= 0) {
      const updatedUser = { ...users[index], ...updates };
      users[index] = updatedUser;
      setLocalData(STORAGE_KEYS.USERS, users);
      
      const currentUser = mockService.getCurrentUser();
      if (currentUser && currentUser.uid === uid) {
        setLocalData(STORAGE_KEYS.CURRENT_USER, updatedUser);
      }
      
      mockService.addAuditLog(uid, updatedUser.displayName, 'update', 'user', uid);
      return updatedUser;
    }
    return null;
  },

  saveTeam: (team: Team) => {
    const teams = mockService.getTeams();
    const index = teams.findIndex(t => t.id === team.id);
    if (index >= 0) teams[index] = team;
    else teams.push(team);
    setLocalData(STORAGE_KEYS.TEAMS, teams);
  },

  deleteTeam: (id: string) => {
    const teams = mockService.getTeams();
    const filtered = teams.filter(t => t.id !== id);
    setLocalData(STORAGE_KEYS.TEAMS, filtered);
  },

  saveDepartment: (dept: Department) => {
    const depts = mockService.getDepartments();
    const index = depts.findIndex(d => d.id === dept.id);
    if (index >= 0) depts[index] = dept;
    else depts.push(dept);
    setLocalData(STORAGE_KEYS.DEPARTMENTS, depts);
  },

  deleteDepartment: (id: string) => {
    const depts = mockService.getDepartments();
    const filtered = depts.filter(d => d.id !== id);
    setLocalData(STORAGE_KEYS.DEPARTMENTS, filtered);
  },

  saveCommitment: (commitment: Commitment) => {
    const commitments = mockService.getCommitments();
    const index = commitments.findIndex(c => c.id === commitment.id);
    if (index >= 0) commitments[index] = commitment;
    else commitments.push(commitment);
    setLocalData(STORAGE_KEYS.COMMITMENTS, commitments);
    mockService.addAuditLogAuto(index >= 0 ? 'update' : 'create', 'commitment', commitment.id);
  },

  deleteCommitment: (id: string) => {
    const commitments = mockService.getCommitments();
    const filtered = commitments.filter(c => c.id !== id);
    setLocalData(STORAGE_KEYS.COMMITMENTS, filtered);
    mockService.addAuditLogAuto('delete', 'commitment', id);
  },

  saveNotificationSettings: (settings: NotificationSettings) => {
    setLocalData(STORAGE_KEYS.NOTIFICATION_SETTINGS, settings);
  },

  savePolicyItem: (item: PolicyItem) => {
    const items = getLocalData<PolicyItem[]>(STORAGE_KEYS.POLICY_ITEMS, []);
    const index = items.findIndex(i => i.id === item.id);
    
    // If it's a new item or parent changed, ensure order is sequential
    const oldItem = index >= 0 ? items[index] : null;
    const parentChanged = oldItem && oldItem.parentId !== item.parentId;

    if (index < 0 || parentChanged) {
      const siblings = items.filter(i => i.policyId === item.policyId && i.parentId === item.parentId);
      const maxOrder = siblings.reduce((max, i) => Math.max(max, i.order || 0), 0);
      item.order = maxOrder + 1;
    }

    if (index >= 0) items[index] = item;
    else items.push(item);
    setLocalData(STORAGE_KEYS.POLICY_ITEMS, items);
    mockService.addAuditLogAuto(index >= 0 ? 'update' : 'create', 'policy_item', item.id);
  },

  bulkSavePolicyItems: (newItems: PolicyItem[]) => {
    const existing = getLocalData<PolicyItem[]>(STORAGE_KEYS.POLICY_ITEMS, []);
    const combined = [...existing, ...newItems];
    setLocalData(STORAGE_KEYS.POLICY_ITEMS, combined);
    mockService.addAuditLogAuto('create', 'policy_item', `bulk:${newItems.length}`);
  },

  deletePolicyItem: (id: string) => {
    const items = getLocalData<PolicyItem[]>(STORAGE_KEYS.POLICY_ITEMS, []);
    const filtered = items.filter(i => i.id !== id);
    setLocalData(STORAGE_KEYS.POLICY_ITEMS, filtered);
    mockService.addAuditLogAuto('delete', 'policy_item', id);
  },

  saveStandard: (standard: Standard) => {
    const standards = mockService.getStandards();
    const index = standards.findIndex(s => s.id === standard.id);
    if (index < 0 && (standard.order === undefined || standard.order === null)) {
      const siblings = standards.filter(s => s.policyId === standard.policyId);
      const maxOrder = siblings.reduce((m, s) => Math.max(m, s.order || 0), 0);
      standard.order = maxOrder + 1;
    }
    if (index >= 0) standards[index] = standard;
    else standards.push(standard);
    setLocalData(STORAGE_KEYS.STANDARDS, standards);
    mockService.addAuditLogAuto(index >= 0 ? 'update' : 'create', 'standard', standard.id);
  },

  reorderStandard: (id: string, direction: 'up' | 'down') => {
    const standards = mockService.getStandards();
    const target = standards.find(s => s.id === id);
    if (!target) return;
    const siblings = standards
      .filter(s => s.policyId === target.policyId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    const idx = siblings.findIndex(s => s.id === id);
    const swapWith = direction === 'up' ? siblings[idx - 1] : siblings[idx + 1];
    if (!swapWith) return;
    const a = target.order || idx + 1;
    const b = swapWith.order || (direction === 'up' ? idx : idx + 2);
    target.order = b;
    swapWith.order = a;
    target.updatedAt = new Date().toISOString();
    swapWith.updatedAt = new Date().toISOString();
    setLocalData(STORAGE_KEYS.STANDARDS, standards);
  },

  reorderProcedure: (id: string, direction: 'up' | 'down') => {
    const procedures = mockService.getProcedures();
    const target = procedures.find(p => p.id === id);
    if (!target) return;
    const siblings = procedures
      .filter(p => p.standardId === target.standardId && (p.parentId || '') === (target.parentId || ''))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    const idx = siblings.findIndex(p => p.id === id);
    const swapWith = direction === 'up' ? siblings[idx - 1] : siblings[idx + 1];
    if (!swapWith) return;
    const a = target.order || idx + 1;
    const b = swapWith.order || (direction === 'up' ? idx : idx + 2);
    target.order = b;
    swapWith.order = a;
    target.updatedAt = new Date().toISOString();
    swapWith.updatedAt = new Date().toISOString();
    setLocalData(STORAGE_KEYS.PROCEDURES, procedures);
  },

  bulkSaveStandards: (newStandards: Standard[]) => {
    const existing = getLocalData<Standard[]>(STORAGE_KEYS.STANDARDS, []);
    const combined = [...existing, ...newStandards];
    setLocalData(STORAGE_KEYS.STANDARDS, combined);
    mockService.addAuditLogAuto('create', 'standard', `bulk:${newStandards.length}`);
  },

  deleteStandard: (id: string) => {
    const standards = mockService.getStandards();
    const filtered = standards.filter(s => s.id !== id);
    setLocalData(STORAGE_KEYS.STANDARDS, filtered);
    mockService.addAuditLogAuto('delete', 'standard', id);
  },

  saveStandardClassification: (classification: StandardClassification) => {
    const classifications = mockService.getStandardClassifications();
    const index = classifications.findIndex(c => c.id === classification.id);
    if (index >= 0) classifications[index] = classification;
    else classifications.push(classification);
    setLocalData(STORAGE_KEYS.STANDARD_CLASSIFICATIONS, classifications);
    mockService.addAuditLogAuto(index >= 0 ? 'update' : 'create', 'standard_classification', classification.id);
  },

  deleteStandardClassification: (id: string) => {
    const classifications = mockService.getStandardClassifications();
    const filtered = classifications.filter(c => c.id !== id);
    setLocalData(STORAGE_KEYS.STANDARD_CLASSIFICATIONS, filtered);
    mockService.addAuditLogAuto('delete', 'standard_classification', id);
  },

  saveProcedure: (procedure: Procedure) => {
    const procedures = mockService.getProcedures();
    const index = procedures.findIndex(p => p.id === procedure.id);
    const oldProc = index >= 0 ? procedures[index] : null;
    const parentChanged = oldProc && oldProc.parentId !== procedure.parentId;
    if (index < 0 || parentChanged) {
      const siblings = procedures.filter(p =>
        p.standardId === procedure.standardId && (p.parentId || '') === (procedure.parentId || '')
      );
      const maxOrder = siblings.reduce((m, p) => Math.max(m, p.order || 0), 0);
      procedure.order = maxOrder + 1;
    }
    if (index >= 0) procedures[index] = procedure;
    else procedures.push(procedure);
    setLocalData(STORAGE_KEYS.PROCEDURES, procedures);
    mockService.addAuditLogAuto(index >= 0 ? 'update' : 'create', 'procedure', procedure.id);
  },

  bulkSaveProcedures: (newProcedures: Procedure[]) => {
    const existing = getLocalData<Procedure[]>(STORAGE_KEYS.PROCEDURES, []);
    const combined = [...existing, ...newProcedures];
    setLocalData(STORAGE_KEYS.PROCEDURES, combined);
    mockService.addAuditLogAuto('create', 'procedure', `bulk:${newProcedures.length}`);
  },

  saveEvidence: (evidence: Evidence) => {
    const allEvidence = mockService.getEvidence();
    const index = allEvidence.findIndex(e => e.id === evidence.id);
    if (index >= 0) allEvidence[index] = evidence;
    else allEvidence.push(evidence);
    setLocalData(STORAGE_KEYS.EVIDENCE, allEvidence);
    mockService.addAuditLogAuto(index >= 0 ? 'update' : 'create', 'evidence', evidence.id);
  },

  deleteEvidence: (id: string) => {
    const allEvidence = mockService.getEvidence();
    const filtered = allEvidence.filter(e => e.id !== id);
    setLocalData(STORAGE_KEYS.EVIDENCE, filtered);
    mockService.addAuditLogAuto('delete', 'evidence', id);
  },

  addAuditLog: (userId: string, userName: string, action: any, entityType: any, entityId: string, oldValue?: any, newValue?: any) => {
    const logs = mockService.getAuditLogs();
    const newLog: AuditLog = {
      id: Math.random().toString(36).substr(2, 9),
      userId,
      userName,
      action,
      entityType,
      entityId,
      oldValue,
      newValue,
      timestamp: new Date().toISOString()
    };
    logs.unshift(newLog);
    if (logs.length > 1000) logs.length = 1000;
    // Fire-and-forget: audit logs shouldn't block the user's save operation.
    setLocalDataAsync(STORAGE_KEYS.AUDIT_LOGS, logs);
  },

  /** Like addAuditLog, but resolves the actor from getCurrentUser() automatically.
   * Use this everywhere a save/delete happens so the audit trail correctly attributes
   * actions to the signed-in user instead of hard-coding 'Admin User'. */
  addAuditLogAuto: (action: any, entityType: any, entityId: string, oldValue?: any, newValue?: any) => {
    const cu = mockService.getCurrentUser();
    const userId = cu?.uid || 'system';
    const userName = cu?.displayName || 'System';
    mockService.addAuditLog(userId, userName, action, entityType, entityId, oldValue, newValue);
  },

  /** Resolve a friendly name for an audit-log entity reference. Handles regular
   * IDs as well as the synthetic ones used by setting changes (e.g. 'email_settings',
   * 'template_xxx', 'group_xxx', 'change_password', 'bulk:N'). Returns null when
   * no name can be derived, so the caller can fall back to the raw ID. */
  getEntityDisplayName: (entityType: string, entityId: string, isRtl: boolean): string | null => {
    if (!entityId) return null;
    if (entityId === 'email_settings') return isRtl ? 'إعدادات البريد الإلكتروني' : 'Email Settings';
    if (entityId === 'compliance_settings') return isRtl ? 'إعدادات الالتزام' : 'Compliance Settings';
    if (entityId === 'change_password') return isRtl ? 'تغيير كلمة المرور' : 'Change Password';
    if (entityId.startsWith('template_')) {
      const tplId = entityId.slice('template_'.length);
      const tpl = mockService.getNotificationTemplates().find(t => t.id === tplId);
      return tpl ? `${isRtl ? 'قالب' : 'Template'}: ${tpl.name}` : `${isRtl ? 'قالب' : 'Template'} ${tplId}`;
    }
    if (entityId.startsWith('group_')) {
      const gid = entityId.slice('group_'.length);
      const g = mockService.getPermissionGroups().find(x => x.id === gid);
      return g ? `${isRtl ? 'مجموعة' : 'Group'}: ${isRtl ? g.nameAr : g.nameEn}` : `${isRtl ? 'مجموعة' : 'Group'} ${gid}`;
    }
    if (entityId.startsWith('bulk:')) {
      const n = entityId.slice('bulk:'.length);
      return isRtl ? `استيراد دفعي (${n} عنصر)` : `Bulk import (${n} items)`;
    }

    const pickName = (rec: any): string | null => {
      if (!rec) return null;
      return (isRtl ? rec.nameAr : rec.nameEn) || rec.name || rec.title || rec.displayName || null;
    };

    switch (entityType) {
      case 'framework': return pickName(mockService.getFrameworks().find(x => x.id === entityId));
      case 'policy': return pickName(mockService.getPolicies().find(x => x.id === entityId));
      case 'policy_item': return pickName(mockService.getPolicyItems().find(x => x.id === entityId));
      case 'standard': return pickName(mockService.getStandards().find(x => x.id === entityId));
      case 'standard_classification': return pickName(mockService.getStandardClassifications().find(x => x.id === entityId));
      case 'procedure': return pickName(mockService.getProcedures().find(x => x.id === entityId));
      case 'evidence': {
        const e = mockService.getEvidence().find((x: any) => x.id === entityId);
        return e ? e.name : null;
      }
      case 'user': return pickName(mockService.getUsers().find(x => x.uid === entityId));
      case 'commitment': return pickName(mockService.getCommitments().find(x => x.id === entityId));
      case 'incident': return pickName(mockService.getIncidents().find(x => x.id === entityId));
      case 'risk': return pickName(mockService.getRisks().find(x => x.id === entityId));
      case 'incident_note': return isRtl ? 'ملاحظة على بلاغ' : 'Incident Note';
      case 'change_request': return pickName(mockService.getChangeRequests().find(x => x.id === entityId));
      case 'lookup_option': {
        const opt = mockService.getLookupOptions().find(o => o.id === entityId);
        return opt ? `${opt.category}: ${isRtl ? opt.labelAr : opt.labelEn}` : null;
      }
      case 'auth': return entityId === 'login' ? (isRtl ? 'تسجيل دخول' : 'Sign-in') : entityId === 'logout' ? (isRtl ? 'تسجيل خروج' : 'Sign-out') : entityId;
      default: return null;
    }
  },

  /** Clamp the stored weight to 1–10 with a default of 1. Always use this when
   * reading a procedure's own (leaf) weight to be tolerant of legacy/null values. */
  getProcedureLeafWeight: (procedure: Procedure | { weight?: number } | null | undefined): number => {
    const raw = procedure && typeof (procedure as any).weight === 'number' ? (procedure as any).weight : 1;
    if (!Number.isFinite(raw)) return 1;
    return Math.max(1, Math.min(10, Math.round(raw)));
  },

  /** Returns true when this procedure has no sub-procedures (a leaf). */
  isLeafProcedure: (procedureId: string, allProcedures?: Procedure[]): boolean => {
    const procs = allProcedures ?? mockService.getProcedures();
    return !procs.some(p => p.parentId === procedureId);
  },

  /** Effective weight used in completion math: for a leaf, its own weight; for
   * a parent, the sum of all descendant leaf weights. */
  getProcedureEffectiveWeight: (procedureId: string, allProcedures?: Procedure[]): number => {
    const procs = allProcedures ?? mockService.getProcedures();
    const children = procs.filter(p => p.parentId === procedureId);
    if (children.length === 0) {
      const self = procs.find(p => p.id === procedureId);
      return mockService.getProcedureLeafWeight(self);
    }
    return children.reduce((sum, c) => sum + mockService.getProcedureEffectiveWeight(c.id, procs), 0);
  },

  /** Per-procedure progress 0–100. Leaf: 100 if completed else 0. Parent:
   * weighted completion across all descendant leaves. */
  getProcedureProgress: (procedureId: string, allProcedures?: Procedure[]): number => {
    const procs = allProcedures ?? mockService.getProcedures();
    const proc = procs.find(p => p.id === procedureId);
    if (!proc) return 0;
    const children = procs.filter(p => p.parentId === procedureId);
    if (children.length === 0) {
      return proc.status === 'completed' ? 100 : 0;
    }
    let totalWeight = 0;
    let completedWeight = 0;
    const collectLeaves = (pid: string) => {
      const kids = procs.filter(p => p.parentId === pid);
      if (kids.length === 0) {
        const self = procs.find(p => p.id === pid);
        if (!self) return;
        const w = mockService.getProcedureLeafWeight(self);
        totalWeight += w;
        if (self.status === 'completed') completedWeight += w;
        return;
      }
      kids.forEach(k => collectLeaves(k.id));
    };
    collectLeaves(procedureId);
    return totalWeight === 0 ? 0 : Math.round((completedWeight / totalWeight) * 100);
  },

  getStandardProgress: (standardId: string): number => {
    const allProcs = mockService.getProcedures();
    const standardProcs = allProcs.filter(p => p.standardId === standardId);
    if (standardProcs.length === 0) return 0;
    // Only count leaves to avoid double-counting parents (whose weight is the sum of children).
    const leaves = standardProcs.filter(p => !allProcs.some(c => c.parentId === p.id));
    if (leaves.length === 0) return 0;
    let totalWeight = 0;
    let completedWeight = 0;
    leaves.forEach(p => {
      const w = mockService.getProcedureLeafWeight(p);
      totalWeight += w;
      if (p.status === 'completed') completedWeight += w;
    });
    return totalWeight === 0 ? 0 : Math.round((completedWeight / totalWeight) * 100);
  },

  /** Sum of (completed leaf weights, total leaf weights) across an arbitrary
   * set of standards. Used by the propagation upward so weights flow from
   * procedures → standards → items → policies → frameworks without averaging. */
  _aggregateStandardWeights: (standardIds: string[]): { completed: number; total: number } => {
    if (standardIds.length === 0) return { completed: 0, total: 0 };
    const idSet = new Set(standardIds);
    const allProcs = mockService.getProcedures();
    let completed = 0;
    let total = 0;
    allProcs.forEach(p => {
      if (!idSet.has(p.standardId)) return;
      if (allProcs.some(c => c.parentId === p.id)) return; // skip non-leaves
      const w = mockService.getProcedureLeafWeight(p);
      total += w;
      if (p.status === 'completed') completed += w;
    });
    return { completed, total };
  },

  getPolicyItemProgress: (itemId: string): number => {
    const allStandards = mockService.getStandards();
    const allItems = getLocalData<PolicyItem[]>(STORAGE_KEYS.POLICY_ITEMS, []);
    // Collect this item + all descendant items (depth-first) so sub-items roll up too.
    const itemIds: string[] = [];
    const walk = (id: string) => {
      itemIds.push(id);
      allItems.filter(i => i.parentId === id).forEach(child => walk(child.id));
    };
    walk(itemId);
    const standardIds = allStandards
      .filter(s => getStandardItemIds(s).some(linkedId => itemIds.includes(linkedId)))
      .map(s => s.id);
    const { completed, total } = mockService._aggregateStandardWeights(standardIds);
    return total === 0 ? 0 : Math.round((completed / total) * 100);
  },

  /** Returns the IDs of all standards belonging to a policy, via either the
   * direct `standard.policyId` link or via `standard.policyItemIds` pointing at
   * any of the policy's items. Union, deduplicated. */
  _standardsInPolicy: (policyId: string): string[] => {
    const allStandards = mockService.getStandards();
    const itemIds = new Set(
      getLocalData<PolicyItem[]>(STORAGE_KEYS.POLICY_ITEMS, [])
        .filter(i => i.policyId === policyId)
        .map(i => i.id)
    );
    const ids = new Set<string>();
    allStandards.forEach(s => {
      if (s.policyId === policyId) { ids.add(s.id); return; }
      if (getStandardItemIds(s).some(id => itemIds.has(id))) ids.add(s.id);
    });
    return Array.from(ids);
  },

  getPolicyProgress: (policyId: string): number => {
    const standardIds = mockService._standardsInPolicy(policyId);
    const { completed, total } = mockService._aggregateStandardWeights(standardIds);
    return total === 0 ? 0 : Math.round((completed / total) * 100);
  },

  getFrameworkProgress: (frameworkId: string): number => {
    const policies = mockService.getPolicies().filter(p => p.frameworkId === frameworkId);
    const ids = new Set<string>();
    policies.forEach(p => mockService._standardsInPolicy(p.id).forEach(sid => ids.add(sid)));
    const { completed, total } = mockService._aggregateStandardWeights(Array.from(ids));
    return total === 0 ? 0 : Math.round((completed / total) * 100);
  },

  getPolicyStats: (policyId: string) => {
    const standards = mockService.getStandards().filter(s => s.policyId === policyId);
    const standardIds = standards.map(s => s.id);
    const procedures = mockService.getProcedures().filter(p => standardIds.includes(p.standardId));
    
    return {
      standardsCount: standards.length,
      proceduresCount: procedures.length
    };
  },

  // ─── Permission Groups ───────────────────────────────────────────────────
  getPermissionGroups: (): PermissionGroup[] => {
    const groups = getLocalData<PermissionGroup[]>(STORAGE_KEYS.PERMISSION_GROUPS, []);
    // Seed the three built-in groups the first time the storage is empty so the
    // editor and the user form always have something to show.
    if (!Array.isArray(groups) || groups.length === 0) {
      const seed: PermissionGroup[] = DEFAULT_GROUPS.map(g => ({
        id: g.id,
        nameAr: g.nameAr,
        nameEn: g.nameEn,
        isSystem: true,
        permissions: g.permissions,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      setLocalData(STORAGE_KEYS.PERMISSION_GROUPS, seed);
      return seed;
    }
    return groups;
  },

  savePermissionGroup: (group: PermissionGroup) => {
    const groups = mockService.getPermissionGroups();
    const idx = groups.findIndex(g => g.id === group.id);
    const stamped = { ...group, updatedAt: new Date().toISOString(), createdAt: group.createdAt || new Date().toISOString() };
    if (idx >= 0) groups[idx] = { ...groups[idx], ...stamped, isSystem: groups[idx].isSystem }; // never clear isSystem
    else groups.push(stamped);
    setLocalData(STORAGE_KEYS.PERMISSION_GROUPS, groups);
    const cu = mockService.getCurrentUser();
    if (cu) mockService.addAuditLog(cu.uid, cu.displayName, idx >= 0 ? 'update' : 'create', 'user', `group_${group.id}`);
  },

  deletePermissionGroup: (id: string): boolean => {
    const groups = mockService.getPermissionGroups();
    const target = groups.find(g => g.id === id);
    if (!target || target.isSystem) return false; // refuse to delete system groups
    setLocalData(STORAGE_KEYS.PERMISSION_GROUPS, groups.filter(g => g.id !== id));
    const cu = mockService.getCurrentUser();
    if (cu) mockService.addAuditLog(cu.uid, cu.displayName, 'delete', 'user', `group_${id}`);
    return true;
  },

  /** Compute the effective permission set for a user: (group ∪ granted) \ revoked.
   * Falls back to the legacy `role` if `groupId` is unset, so existing seed users
   * keep working until they're explicitly assigned a group. */
  getUserEffectivePermissions: (user: User | null | undefined): Set<string> => {
    if (!user) return new Set();
    const groups = mockService.getPermissionGroups();
    const groupId = user.groupId || user.role; // legacy fallback
    const group = groups.find(g => g.id === groupId);
    const base = new Set(group?.permissions || []);
    const granted = user.permissionOverrides?.granted || [];
    const revoked = new Set(user.permissionOverrides?.revoked || []);
    granted.forEach(k => base.add(k));
    revoked.forEach(k => base.delete(k));
    return base;
  },

  hasPermission: (user: User | null | undefined, key: string): boolean => {
    return mockService.getUserEffectivePermissions(user).has(key);
  },

  getEmailSettings: (): EmailSettings => getLocalData(STORAGE_KEYS.EMAIL_SETTINGS, {
    smtpServer: 'emails.mcci.org.sa',
    smtpPort: 587,
    senderEmail: 'no-reply@mcci.org.sa',
    senderName: 'DER3 Shield System',
    encryption: 'tls'
  }),

  saveEmailSettings: (settings: EmailSettings) => {
    setLocalData(STORAGE_KEYS.EMAIL_SETTINGS, settings);
    mockService.addAuditLogAuto('update', 'user', 'email_settings');
  },

  getNotificationTemplates: (): NotificationTemplate[] => getLocalData(STORAGE_KEYS.NOTIFICATION_TEMPLATES, [
    {
      id: '1',
      name: 'Task Assignment',
      subject: 'New Procedure Assigned: {{procedure_name}}',
      body: 'Hello {{user_name}},\n\nA new procedure has been assigned to you: {{procedure_name}}.\nDue date: {{end_date}}.',
      type: 'assignment'
    },
    {
      id: '2',
      name: 'Expiry Reminder',
      subject: 'Commitment Expiry Reminder: {{commitment_name}}',
      body: 'Hello,\n\nThe following commitment is expiring soon: {{commitment_name}}.\nExpiry date: {{expiry_date}}.',
      type: 'expiry_reminder'
    },
    {
      id: '3',
      name: 'OTP Verification Code',
      subject: 'DER3 — رمز التحقق / Verification Code',
      body: '<div style="font-family:system-ui,sans-serif;max-width:480px"><p>مرحباً <b>{{user_name}}</b>,</p><p>رمز التحقق الخاص بك هو:</p><p style="font-size:28px;letter-spacing:6px;font-weight:bold;background:#f1f5f9;padding:12px 20px;border-radius:8px;display:inline-block;font-family:monospace">{{otp_code}}</p><p style="color:#64748b;font-size:13px">صالح لمدة <b>{{expires_in}}</b>.</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0"><p style="color:#94a3b8;font-size:12px">إذا لم تطلب هذا الرمز، تجاهل الرسالة.</p></div>',
      type: 'otp'
    },
    {
      id: '4',
      name: 'Password Reset Request',
      subject: 'DER3 — طلب إعادة تعيين كلمة المرور / Password Reset Request',
      body: '<div style="font-family:system-ui,sans-serif;max-width:480px"><p>مرحباً <b>{{user_name}}</b>,</p><p>لقد طلبت إعادة تعيين كلمة المرور. استخدم الرابط التالي خلال <b>{{expires_in}}</b>:</p><p><a href="{{reset_link}}" style="display:inline-block;background:#1f3a5f;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">إعادة تعيين كلمة المرور</a></p><p style="color:#64748b;font-size:12px;word-break:break-all">{{reset_link}}</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0"><p style="color:#94a3b8;font-size:12px">إذا لم تطلب هذا، تجاهل الرسالة.</p></div>',
      type: 'password_reset'
    },
    {
      id: '5',
      name: 'Password Changed Confirmation',
      subject: 'DER3 — تم تغيير كلمة المرور / Password Changed',
      body: '<div style="font-family:system-ui,sans-serif;max-width:480px"><p>مرحباً <b>{{user_name}}</b>,</p><p>تم تغيير كلمة المرور الخاصة بحسابك بنجاح بتاريخ <b>{{date}}</b>.</p><p>إذا لم تكن أنت من قام بهذا التغيير، يرجى التواصل مع المسؤول فوراً.</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0"><p style="color:#94a3b8;font-size:12px">DER3 Shield System</p></div>',
      type: 'password_changed'
    },
    {
      id: '6',
      name: 'Security Incident — Notify Owner',
      subject: 'DER3 — بلاغ أمني جديد: {{incident_title}}',
      body: '<div style="font-family:system-ui,sans-serif;max-width:560px"><p>مرحباً <b>{{user_name}}</b>,</p><p>تم استلام بلاغ أمني جديد:</p><table style="border-collapse:collapse;font-size:13px;margin:8px 0"><tr><td style="padding:6px 12px 6px 0;color:#64748b">الرقم المرجعي:</td><td style="font-weight:bold;font-family:monospace">{{incident_id}}</td></tr><tr><td style="padding:6px 12px 6px 0;color:#64748b">العنوان:</td><td style="font-weight:bold">{{incident_title}}</td></tr><tr><td style="padding:6px 12px 6px 0;color:#64748b">الأولوية:</td><td style="font-weight:bold;color:#dc2626;text-transform:uppercase">{{incident_priority}}</td></tr><tr><td style="padding:6px 12px 6px 0;color:#64748b">المُبلِّغ:</td><td>{{reporter_email}}</td></tr><tr><td style="padding:6px 12px 6px 0;color:#64748b">التاريخ:</td><td>{{date}}</td></tr></table><p style="white-space:pre-wrap;background:#f8fafc;border-right:3px solid #1e293b;padding:10px 14px;border-radius:6px">{{incident_description}}</p><p><a href="{{link}}" style="display:inline-block;background:#1e293b;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">عرض البلاغ</a></p><hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0"><p style="color:#94a3b8;font-size:12px">DER3 Shield System</p></div>',
      type: 'incident_new_to_owner'
    },
    {
      id: '7',
      name: 'Security Incident — Reporter Confirmation',
      subject: 'DER3 — تأكيد استلام البلاغ {{incident_id}}',
      body: '<div style="font-family:system-ui,sans-serif;max-width:520px"><p>مرحباً،</p><p>شكراً لتقديمك البلاغ الأمني. تم استلام بلاغك بنجاح وسيتم مراجعته من قبل الفريق المختص في أقرب وقت.</p><div style="background:#f1f5f9;border-radius:10px;padding:16px;margin:14px 0"><p style="margin:0;color:#64748b;font-size:12px;letter-spacing:1px;font-weight:bold">الرقم المرجعي</p><p style="margin:4px 0 0;font-family:monospace;font-size:22px;font-weight:bold;letter-spacing:2px">{{incident_id}}</p></div><p style="font-size:13px;color:#64748b">يمكنك الاحتفاظ بهذا الرقم للرجوع إليه عند الحاجة. سيتم إشعارك عند تغيّر حالة البلاغ.</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0"><p style="color:#94a3b8;font-size:12px">DER3 Shield System</p></div>',
      type: 'incident_received_to_reporter'
    },
    {
      id: '8',
      name: 'Security Incident — Resolved (to Reporter)',
      subject: 'DER3 — تم إغلاق البلاغ {{incident_id}}',
      body: '<div style="font-family:system-ui,sans-serif;max-width:520px"><p>مرحباً،</p><p>نود إعلامك بأن البلاغ الأمني الذي تقدمت به قد تم <b style="color:#059669">{{incident_status_label}}</b>.</p><div style="background:#f1f5f9;border-radius:10px;padding:16px;margin:14px 0"><p style="margin:0;color:#64748b;font-size:12px;letter-spacing:1px;font-weight:bold">الرقم المرجعي</p><p style="margin:4px 0 0;font-family:monospace;font-size:22px;font-weight:bold;letter-spacing:2px">{{incident_id}}</p><p style="margin:8px 0 0;font-size:13px"><b>{{incident_title}}</b></p></div><p style="font-size:13px;color:#64748b">نشكر لكم تعاونكم في تعزيز أمن المنظومة.</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0"><p style="color:#94a3b8;font-size:12px">DER3 Shield System</p></div>',
      type: 'incident_resolved_to_reporter'
    }
  ]),

  saveNotificationTemplate: (template: NotificationTemplate) => {
    const templates = mockService.getNotificationTemplates();
    const index = templates.findIndex(t => t.id === template.id);
    if (index >= 0) templates[index] = template;
    else templates.push(template);
    setLocalData(STORAGE_KEYS.NOTIFICATION_TEMPLATES, templates);
    mockService.addAuditLogAuto('update', 'user', `template_${template.id}`);
  },

  getComplianceSettings: (): ComplianceSettings => getLocalData(STORAGE_KEYS.COMPLIANCE_SETTINGS, {
    thresholds: [
      { id: '1', labelAr: 'التزام ضعيف', labelEn: 'Weak Compliance', min: 0, max: 40, color: '#ef4444' },
      { id: '2', labelAr: 'التزام متوسط', labelEn: 'Fair Compliance', min: 41, max: 70, color: '#f59e0b' },
      { id: '3', labelAr: 'التزام جيد', labelEn: 'Good Compliance', min: 71, max: 90, color: '#3b82f6' },
      { id: '4', labelAr: 'التزام ممتاز', labelEn: 'Excellent Compliance', min: 91, max: 100, color: '#10b981' }
    ],
    systemLogo: '/logo-der3.png'
  }),

  saveComplianceSettings: (settings: ComplianceSettings) => {
    setLocalData(STORAGE_KEYS.COMPLIANCE_SETTINGS, settings);
    mockService.addAuditLogAuto('update', 'user', 'compliance_settings');
  },

  getUserPerformance: () => {
    const users = mockService.getUsers();
    const procedures = mockService.getProcedures();
    
    return users.map(user => {
      const assignedProcedures = procedures.filter(p => p.assignedTo.includes(user.uid));
      if (assignedProcedures.length === 0) return { ...user, progress: 0 };
      
      const completed = assignedProcedures.filter(p => p.status === 'completed').length;
      const progress = Math.round((completed / assignedProcedures.length) * 100);
      return { ...user, progress };
    });
  },

  getDepartmentPerformance: () => {
    const departments = mockService.getDepartments();
    const teams = mockService.getTeams();
    const users = mockService.getUsers();
    const userPerformance = mockService.getUserPerformance();
    
    return departments.map(dept => {
      // Find teams in this department
      // Actually, users have departments and teams.
      // Let's calculate progress based on users belonging to this department
      const deptUsers = userPerformance.filter(u => u.departments.includes(dept.id) || u.departments.includes(dept.nameEn) || u.departments.includes(dept.nameAr));
      
      if (deptUsers.length === 0) return { ...dept, progress: 0 };
      
      const totalProgress = deptUsers.reduce((acc, u) => acc + u.progress, 0);
      const progress = Math.round(totalProgress / deptUsers.length);
      return { ...dept, progress };
    });
  },

  // Auth Methods
  sendOTP: async (email: string, password: string): Promise<{ ok: boolean; reason?: 'invalid_credentials' | 'email_failed'; bypass?: boolean; user?: User }> => {
    const users = mockService.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return { ok: false, reason: 'invalid_credentials' };

    const verify = syncApiRequest<{ ok: boolean }>('POST', '/auth/verify', { email, password });
    const credsOk = verify ? verify.ok === true : password === 'password123';
    if (!credsOk) return { ok: false, reason: 'invalid_credentials' };

    // Users flagged with bypassOtp skip the OTP step entirely.
    if (user.bypassOtp) {
      setLocalData(STORAGE_KEYS.CURRENT_USER, user);
      mockService.addAuditLog(user.uid, user.displayName, 'create' as any, 'auth' as any, 'login');
      return { ok: true, bypass: true, user };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setLocalData(STORAGE_KEYS.PENDING_OTP, { email: user.email, otp, expires: Date.now() + 10 * 60 * 1000 });

    const settings = mockService.getEmailSettings();
    const tpl = getTemplateByType('otp');
    const vars = withCommonVars({
      user_name: user.displayName,
      otp_code: otp,
      expires_in: '10 minutes / 10 دقائق',
      email: user.email
    });
    const subject = tpl ? renderTemplate(tpl.subject, vars) : 'DER3 — Verification Code';
    const html = tpl
      ? renderTemplate(tpl.body, vars)
      : `<p>Hello ${user.displayName},</p><p>Your verification code is: <b>${otp}</b></p>`;
    const text = `Hello ${user.displayName},\n\nYour verification code is: ${otp}\n\nThis code expires in 10 minutes.`;
    try {
      const response = await fetch(`${apiUrl}/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings, to: user.email, subject, text, html })
      });
      const data = await response.json().catch(() => ({} as any));
      if (!response.ok || !data.ok) {
        console.warn('OTP email send failed:', data);
        return { ok: false, reason: 'email_failed' };
      }
      return { ok: true };
    } catch (err) {
      console.warn('OTP email send error:', err);
      return { ok: false, reason: 'email_failed' };
    }
  },

  verifyOTP: (email: string, otp: string): User | null => {
    const pending = getLocalData<any>(STORAGE_KEYS.PENDING_OTP, null);
    if (!pending || pending.email !== email || pending.otp !== otp || pending.expires < Date.now()) {
      return null;
    }

    const users = mockService.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      setLocalData(STORAGE_KEYS.CURRENT_USER, user);
      localStorage.removeItem(STORAGE_KEYS.PENDING_OTP);
      // Audit the sign-in directly (skip auto helper since currentUser may not be
      // available to addAuditLogAuto at this exact moment due to cache timing).
      mockService.addAuditLog(user.uid, user.displayName, 'create' as any, 'auth' as any, 'login');
      return user;
    }
    return null;
  },

  getCurrentUser: (): User | null => {
    return getLocalData<User | null>(STORAGE_KEYS.CURRENT_USER, null);
  },

  logout: () => {
    const cu = mockService.getCurrentUser();
    if (cu) {
      mockService.addAuditLog(cu.uid, cu.displayName, 'delete' as any, 'auth' as any, 'logout');
    }
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  },

  getNotificationLogs: (): NotificationLog[] => getLocalData(STORAGE_KEYS.NOTIFICATION_LOGS, [
    {
      id: '1',
      recipientId: '2',
      recipientEmail: 'ahmed@der3.com',
      recipientName: 'Ahmed Al-Shehri',
      type: 'assignment',
      subject: 'New Procedure Assigned: Backup Verification',
      body: 'Hello Ahmed, A new procedure Backup Verification has been assigned to you.',
      status: 'sent',
      sentAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: '2',
      recipientId: '3',
      recipientEmail: 'mona@der3.com',
      recipientName: 'Mona Al-Qahtani',
      type: 'expiry_reminder',
      subject: 'Commitment Expiry Reminder: System Audit',
      body: 'Hello, the system audit commitment is expiring soon.',
      status: 'sent',
      sentAt: new Date(Date.now() - 2 * 3600000).toISOString()
    },
    {
      id: '3',
      recipientId: '2',
      recipientEmail: 'ahmed@der3.com',
      recipientName: 'Ahmed Al-Shehri',
      type: 'overdue_alert',
      subject: 'Overdue Alert: Access Review',
      body: 'Hello ahmed, the Access Review procedure is overdue.',
      status: 'failed',
      sentAt: new Date(Date.now() - 24 * 3600000).toISOString(),
      errorMessage: 'SMTP Connection Timeout'
    }
  ]),

  getIncidents: (): SecurityIncident[] => getLocalData(STORAGE_KEYS.INCIDENTS, []),
  
  getNotifications: (userId?: string): Notification[] => {
    const all = getLocalData<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    if (userId) {
      return all.filter(n => n.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  saveNotification: (notification: Notification) => {
    const notifications = mockService.getNotifications();
    const index = notifications.findIndex(n => n.id === notification.id);
    const isNew = index < 0;
    if (index >= 0) notifications[index] = notification;
    else notifications.unshift(notification);
    setLocalData(STORAGE_KEYS.NOTIFICATIONS, notifications);
    if (isNew) dispatchNotificationEmail(notification);
  },

  addNotification: (
    notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>,
    options: { skipEmail?: boolean } = {}
  ) => {
    const notifications = mockService.getNotifications();
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      isRead: false,
      createdAt: new Date().toISOString()
    };
    notifications.unshift(newNotification);
    setLocalData(STORAGE_KEYS.NOTIFICATIONS, notifications);
    if (!options.skipEmail) dispatchNotificationEmail(newNotification);
    return newNotification;
  },

  markNotificationAsRead: (id: string) => {
    const notifications = mockService.getNotifications();
    const index = notifications.findIndex(n => n.id === id);
    if (index >= 0) {
      notifications[index].isRead = true;
      setLocalData(STORAGE_KEYS.NOTIFICATIONS, notifications);
    }
  },

  markAllNotificationsAsRead: (userId: string) => {
    const notifications = mockService.getNotifications();
    const updated = notifications.map(n => n.userId === userId ? { ...n, isRead: true } : n);
    setLocalData(STORAGE_KEYS.NOTIFICATIONS, updated);
  },

  saveIncident: (incident: SecurityIncident) => {
    const incidents = mockService.getIncidents();
    const index = incidents.findIndex(i => i.id === incident.id);
    const isNew = index < 0;
    const previous = isNew ? null : incidents[index];
    if (index >= 0) incidents[index] = incident;
    else incidents.push(incident);
    setLocalData(STORAGE_KEYS.INCIDENTS, incidents);

    const currentUser = mockService.getCurrentUser();
    if (currentUser) {
      mockService.addAuditLog(currentUser.uid, currentUser.displayName, isNew ? 'create' : 'update', 'incident', incident.id);
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const incidentLink = `${origin}/incidents/${incident.id}`;

    if (isNew) {
      // 1) In-app + templated email to every user holding the special permission.
      const recipients = mockService.getUsers().filter(u => u.receiveSecurityIncidents);
      const titleAr = `بلاغ أمني جديد: ${incident.title}`;
      const titleEn = `New security report: ${incident.title}`;
      const messageAr = `تم استلام بلاغ أمني جديد رقم ${incident.id} بأولوية ${incident.priority} من ${incident.reporterEmail}.`;
      const messageEn = `New security report ${incident.id} received with ${incident.priority} priority from ${incident.reporterEmail}.`;
      recipients.forEach(u => {
        // Add in-app notification (skip generic email — we send a templated one below)
        mockService.addNotification({
          userId: u.uid,
          titleAr,
          titleEn,
          messageAr,
          messageEn,
          type: 'security',
          link: `/incidents/${incident.id}`,
        }, { skipEmail: true });

        // Templated owner email
        sendTemplatedEmail(
          'incident_new_to_owner',
          u.email,
          {
            user_name: u.displayName || u.email,
            incident_id: incident.id,
            incident_title: incident.title,
            incident_description: incident.description,
            incident_priority: incident.priority,
            incident_type: incident.type,
            reporter_email: incident.reporterEmail,
            link: incidentLink,
          },
          {
            subject: titleAr,
            message: messageAr,
            link: `/incidents/${incident.id}`,
          }
        );
      });

      // 2) Confirmation email to the reporter.
      if (incident.reporterEmail) {
        sendTemplatedEmail(
          'incident_received_to_reporter',
          incident.reporterEmail,
          {
            user_name: incident.reporterEmail,
            incident_id: incident.id,
            incident_title: incident.title,
            incident_priority: incident.priority,
          },
          {
            subject: `تأكيد استلام البلاغ ${incident.id}`,
            message: `تم استلام بلاغك الأمني بنجاح. الرقم المرجعي: ${incident.id}.`,
          }
        );
      }
    } else if (previous && incident.reporterEmail) {
      // 3) Resolved/closed email to reporter on status transition.
      const wasOpen = previous.status !== 'resolved' && previous.status !== 'closed';
      const nowDone = incident.status === 'resolved' || incident.status === 'closed';
      if (wasOpen && nowDone) {
        const statusLabel = incident.status === 'resolved' ? 'حل البلاغ' : 'إغلاق البلاغ';
        sendTemplatedEmail(
          'incident_resolved_to_reporter',
          incident.reporterEmail,
          {
            user_name: incident.reporterEmail,
            incident_id: incident.id,
            incident_title: incident.title,
            incident_status: incident.status,
            incident_status_label: statusLabel,
          },
          {
            subject: `تم ${statusLabel}: ${incident.id}`,
            message: `تم ${statusLabel} رقم ${incident.id} — ${incident.title}.`,
          }
        );
      }
    }
  },

  getIncidentFeedback: (): IncidentFeedback[] => getLocalData(STORAGE_KEYS.INCIDENT_FEEDBACK, []),
  
  saveIncidentFeedback: (feedback: IncidentFeedback) => {
    const allFeedback = mockService.getIncidentFeedback();
    allFeedback.push(feedback);
    setLocalData(STORAGE_KEYS.INCIDENT_FEEDBACK, allFeedback);
  },

  getIncidentNotes: (incidentId?: string): IncidentNote[] => {
    const notes = getLocalData<IncidentNote[]>(STORAGE_KEYS.INCIDENT_NOTES, []);
    if (incidentId) {
      return notes.filter(n => n.incidentId === incidentId);
    }
    return notes;
  },

  saveIncidentNote: (note: IncidentNote) => {
    const notes = getLocalData<IncidentNote[]>(STORAGE_KEYS.INCIDENT_NOTES, []);
    notes.push(note);
    setLocalData(STORAGE_KEYS.INCIDENT_NOTES, notes);
    mockService.addAuditLogAuto('create', 'incident_note', note.id);
  },

  getChangeRequests: (): ChangeRequest[] => getLocalData(STORAGE_KEYS.CHANGE_REQUESTS, []),

  saveChangeRequest: (request: ChangeRequest) => {
    const requests = mockService.getChangeRequests();
    const index = requests.findIndex(r => r.id === request.id);
    if (index >= 0) requests[index] = request;
    else requests.push(request);
    setLocalData(STORAGE_KEYS.CHANGE_REQUESTS, requests);
    mockService.addAuditLogAuto(index >= 0 ? 'update' : 'create', 'change_request', request.id);
  },

  saveAuditLog: (log: AuditLog) => {
    const logs = mockService.getAuditLogs();
    logs.unshift(log);
    setLocalData(STORAGE_KEYS.AUDIT_LOGS, logs);
  },

  getLookupOptions: (category?: string): LookupOption[] => {
    const all = getLocalData<LookupOption[]>(STORAGE_KEYS.LOOKUP_OPTIONS, [
      // Default types for change requests
      { id: 'tr1', category: 'change_request_type', value: 'tool_change', labelAr: 'تغيير أدوات', labelEn: 'Tool Change', isActive: true },
      { id: 'tr2', category: 'change_request_type', value: 'firewall_open', labelAr: 'فتح منفذ بالفير وول', labelEn: 'Firewall Port Opening', isActive: true },
      { id: 'tr3', category: 'change_request_type', value: 'access_request', labelAr: 'طلب وصول', labelEn: 'Access Request', isActive: true },
      { id: 'tr4', category: 'change_request_type', value: 'other', labelAr: 'أخرى', labelEn: 'Other', isActive: true },
      // Default types for incidents
      { id: 'ir1', category: 'incident_type', value: 'phishing', labelAr: 'اصطياد إلكتروني', labelEn: 'Phishing', isActive: true },
      { id: 'ir2', category: 'incident_type', value: 'malware', labelAr: 'برمجيات خبيثة', labelEn: 'Malware', isActive: true },
      { id: 'ir3', category: 'incident_type', value: 'unauthorized_access', labelAr: 'وصول غير مصرح', labelEn: 'Unauthorized Access', isActive: true },
      { id: 'ir4', category: 'incident_type', value: 'data_leak', labelAr: 'تسريب بيانات', labelEn: 'Data Leak', isActive: true },
      // Default statuses
      { id: 'ps1', category: 'procedure_status', value: 'not_started', labelAr: 'لم يبدأ', labelEn: 'Not Started', isActive: true },
      { id: 'ps2', category: 'procedure_status', value: 'in_progress', labelAr: 'قيد التنفيذ', labelEn: 'In Progress', isActive: true },
      { id: 'ps3', category: 'procedure_status', value: 'completed', labelAr: 'مكتمل', labelEn: 'Completed', isActive: true }
    ]);
    if (category) {
      return all.filter(o => o.category === category);
    }
    return all;
  },

  saveLookupOption: (option: LookupOption) => {
    const all = mockService.getLookupOptions();
    const index = all.findIndex(o => o.id === option.id);
    if (index >= 0) all[index] = option;
    else all.push(option);
    setLocalData(STORAGE_KEYS.LOOKUP_OPTIONS, all);
    mockService.addAuditLogAuto(index >= 0 ? 'update' : 'create', 'lookup_option', option.id);
  },

  deleteLookupOption: (id: string) => {
    const all = mockService.getLookupOptions();
    const filtered = all.filter(o => o.id !== id);
    setLocalData(STORAGE_KEYS.LOOKUP_OPTIONS, filtered);
    mockService.addAuditLogAuto('delete', 'lookup_option', id);
  },

  sendPublicOTP: (email: string): string => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setLocalData(`otp_${email}`, { otp, expires: Date.now() + 5 * 60 * 1000 });
    console.log(`Public OTP for ${email}: ${otp}`);
    return otp;
  },

  verifyPublicOTP: (email: string, otp: string): boolean => {
    // Universal bypass code for simulation
    if (otp === '123456') return true;
    
    const pending = getLocalData<any>(`otp_${email}`, null);
    if (pending && pending.otp === otp && pending.expires > Date.now()) {
      localStorage.removeItem(`otp_${email}`);
      return true;
    }
    return false;
  },

  requestPasswordReset: async (email: string): Promise<boolean> => {
    const users = mockService.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) return false;

    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const tokens = getLocalData<any>(STORAGE_KEYS.RESET_TOKENS, {});
    tokens[token] = {
      email: user.email,
      expires: Date.now() + 10 * 60 * 1000 // 10 minutes
    };
    setLocalData(STORAGE_KEYS.RESET_TOKENS, tokens);

    const resetLink = `${window.location.origin}/reset-password?token=${token}`;
    console.log(`Password reset link for ${email}: ${resetLink}`);

    // In-app bell notification only — email is sent below using the templated path
    mockService.addNotification({
      userId: user.uid,
      titleAr: 'طلب إعادة تعيين كلمة المرور',
      titleEn: 'Password Reset Request',
      messageAr: `لقد طلبت إعادة تعيين كلمة المرور. الرابط هو: ${resetLink}`,
      messageEn: `You requested a password reset. The link is: ${resetLink}`,
      type: 'security'
    }, { skipEmail: true });

    const settings = mockService.getEmailSettings();
    const tpl = getTemplateByType('password_reset');
    const vars = withCommonVars({
      user_name: user.displayName,
      reset_link: resetLink,
      expires_in: '10 minutes / 10 دقائق',
      email: user.email
    });
    const subject = tpl ? renderTemplate(tpl.subject, vars) : 'DER3 — Password Reset Request';
    const html = tpl
      ? renderTemplate(tpl.body, vars)
      : `<p>Hello ${user.displayName},</p><p><a href="${resetLink}">${resetLink}</a></p>`;
    const text = `Hello ${user.displayName},\n\nReset link (valid 10 min): ${resetLink}`;
    try {
      const response = await fetch(`${apiUrl}/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings, to: user.email, subject, text, html })
      });
      const data = await response.json().catch(() => ({} as any));
      if (!response.ok || !data.ok) {
        console.warn('Reset email send failed:', data);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Reset email send error:', err);
      return false;
    }
  },

  verifyResetToken: (token: string): string | null => {
    const tokens = getLocalData<any>(STORAGE_KEYS.RESET_TOKENS, {});
    const data = tokens[token];
    
    if (!data || data.expires < Date.now()) {
      return null;
    }
    
    return data.email;
  },

  completePasswordReset: async (token: string, newPassword: string): Promise<boolean> => {
    const tokens = getLocalData<any>(STORAGE_KEYS.RESET_TOKENS, {});
    const data = tokens[token];

    if (!data || data.expires < Date.now()) {
      return false;
    }

    const users = mockService.getUsers();
    const user = users.find(u => u.email.toLowerCase() === data.email.toLowerCase());
    if (!user) return false;

    const result = mockService.setUserPassword(user.uid, newPassword);
    if (!result.success) {
      console.warn('completePasswordReset failed to persist password:', result.error);
      return false;
    }

    delete tokens[token];
    setLocalData(STORAGE_KEYS.RESET_TOKENS, tokens);

    mockService.addAuditLog(user.uid, user.displayName, 'update', 'user', user.uid, 'reset_password');
    return true;
  }
};

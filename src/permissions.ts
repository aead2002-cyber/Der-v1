// Central permission registry.
//
// Each permission has a stable string key (e.g. `policies.create`) that's
// referenced in code via Can/ProtectedRoute and stored in PermissionGroup.permissions.
// The structure below drives the Settings → Groups & Permissions editor and is
// the source of truth for what the system can authorize. Add new keys here, then
// they appear in the editor automatically.

export interface PermissionAction {
  /** Permission key — short, kebab-cased after the dot. */
  key: string;
  /** Action label (Arabic / English). */
  labelAr: string;
  labelEn: string;
}

export interface PermissionScreen {
  /** Screen identifier — also used as the row label in the editor. */
  id: string;
  labelAr: string;
  labelEn: string;
  /** Actions available on this screen. Most screens have view + write actions. */
  actions: PermissionAction[];
}

export interface PermissionService {
  /** Top-level grouping in the editor (collapsible section). */
  id: string;
  labelAr: string;
  labelEn: string;
  screens: PermissionScreen[];
}

const view = (): PermissionAction => ({ key: 'view', labelAr: 'عرض', labelEn: 'View' });
const create = (): PermissionAction => ({ key: 'create', labelAr: 'إضافة', labelEn: 'Create' });
const edit = (): PermissionAction => ({ key: 'edit', labelAr: 'تعديل', labelEn: 'Edit' });
const remove = (): PermissionAction => ({ key: 'delete', labelAr: 'حذف', labelEn: 'Delete' });
const importA = (): PermissionAction => ({ key: 'import', labelAr: 'استيراد', labelEn: 'Import' });
const exportA = (): PermissionAction => ({ key: 'export', labelAr: 'تصدير', labelEn: 'Export' });

export const PERMISSION_SERVICES: PermissionService[] = [
  {
    id: 'dashboard',
    labelAr: 'لوحة المعلومات',
    labelEn: 'Dashboard',
    screens: [
      { id: 'dashboard', labelAr: 'لوحة المعلومات', labelEn: 'Dashboard', actions: [view()] },
    ],
  },
  {
    id: 'frameworks',
    labelAr: 'أطر العمل',
    labelEn: 'Frameworks',
    screens: [
      { id: 'frameworks', labelAr: 'أطر العمل', labelEn: 'Frameworks', actions: [view(), create(), edit(), remove(), importA(), exportA()] },
    ],
  },
  {
    id: 'policies',
    labelAr: 'السياسات',
    labelEn: 'Policies',
    screens: [
      { id: 'policies', labelAr: 'السياسات', labelEn: 'Policies', actions: [view(), create(), edit(), remove(), importA(), exportA()] },
      { id: 'policy_items', labelAr: 'البنود', labelEn: 'Policy Items', actions: [view(), create(), edit(), remove(), importA(), exportA(), { key: 'link_standards', labelAr: 'ربط بمعايير', labelEn: 'Link to standards' }] },
    ],
  },
  {
    id: 'standards',
    labelAr: 'المعايير',
    labelEn: 'Standards',
    screens: [
      { id: 'standards', labelAr: 'المعايير', labelEn: 'Standards', actions: [view(), create(), edit(), remove(), importA(), exportA(), { key: 'link_items', labelAr: 'ربط ببنود', labelEn: 'Link to items' }] },
      { id: 'classifications', labelAr: 'تصنيفات المعايير', labelEn: 'Classifications', actions: [view(), create(), edit(), remove()] },
    ],
  },
  {
    id: 'procedures',
    labelAr: 'الإجراءات',
    labelEn: 'Procedures',
    screens: [
      { id: 'procedures', labelAr: 'الإجراءات', labelEn: 'Procedures', actions: [view(), create(), edit(), remove(), importA(), exportA(), { key: 'add_sub', labelAr: 'إضافة إجراء فرعي', labelEn: 'Add sub-procedure' }, { key: 'manage_weight', labelAr: 'تعديل الوزن', labelEn: 'Manage weight' }] },
      { id: 'evidence', labelAr: 'الأدلة', labelEn: 'Evidence', actions: [view(), create(), { key: 'delete', labelAr: 'حذف أي شاهد (المالك يحذف شاهده دائماً)', labelEn: 'Delete any evidence (owner can always delete own)' }] },
    ],
  },
  {
    id: 'tasks',
    labelAr: 'مهامي',
    labelEn: 'My Tasks',
    screens: [
      { id: 'my_tasks', labelAr: 'مهامي', labelEn: 'My Tasks', actions: [view(), { key: 'update_status', labelAr: 'تحديث الحالة', labelEn: 'Update status' }, { key: 'add_note', labelAr: 'إضافة ملاحظة', labelEn: 'Add note' }] },
    ],
  },
  {
    id: 'commitments',
    labelAr: 'الالتزامات',
    labelEn: 'Commitments',
    screens: [
      { id: 'commitments', labelAr: 'الالتزامات', labelEn: 'Commitments', actions: [view(), create(), edit(), remove(), exportA()] },
    ],
  },
  {
    id: 'risks',
    labelAr: 'المخاطر',
    labelEn: 'Risks',
    screens: [
      { id: 'risks', labelAr: 'المخاطر', labelEn: 'Risks', actions: [view(), create(), edit(), remove(), exportA()] },
    ],
  },
  {
    id: 'incidents',
    labelAr: 'البلاغات الأمنية',
    labelEn: 'Incidents',
    screens: [
      { id: 'incidents', labelAr: 'البلاغات', labelEn: 'Incidents', actions: [view(), create(), edit(), remove(), { key: 'assign', labelAr: 'إسناد', labelEn: 'Assign' }, { key: 'resolve', labelAr: 'حل / إغلاق', labelEn: 'Resolve / Close' }, { key: 'manage_notes', labelAr: 'إدارة الملاحظات', labelEn: 'Manage notes' }, exportA()] },
    ],
  },
  {
    id: 'change_requests',
    labelAr: 'طلبات التغيير',
    labelEn: 'Change Requests',
    screens: [
      { id: 'change_requests', labelAr: 'طلبات التغيير', labelEn: 'Change Requests', actions: [view(), create(), edit(), remove(), { key: 'approve', labelAr: 'موافقة', labelEn: 'Approve' }, { key: 'reject', labelAr: 'رفض', labelEn: 'Reject' }] },
    ],
  },
  {
    id: 'reports',
    labelAr: 'التقارير',
    labelEn: 'Reports',
    screens: [
      { id: 'reports', labelAr: 'التقارير', labelEn: 'Reports', actions: [view(), exportA()] },
      { id: 'audit_trail', labelAr: 'سجل التدقيق', labelEn: 'Audit Trail', actions: [view(), exportA()] },
    ],
  },
  {
    id: 'users',
    labelAr: 'المستخدمون',
    labelEn: 'Users',
    screens: [
      { id: 'users', labelAr: 'المستخدمون', labelEn: 'Users', actions: [view(), create(), edit(), remove()] },
      { id: 'permission_groups', labelAr: 'المجموعات والصلاحيات', labelEn: 'Groups & Permissions', actions: [view(), create(), edit(), remove(), { key: 'assign', labelAr: 'إسناد للمستخدمين', labelEn: 'Assign to users' }] },
    ],
  },
  {
    id: 'settings',
    labelAr: 'الإعدادات',
    labelEn: 'Settings',
    screens: [
      { id: 'general', labelAr: 'الإعدادات العامة', labelEn: 'General', actions: [view(), edit()] },
      { id: 'email', labelAr: 'إعدادات البريد', labelEn: 'Email', actions: [view(), edit(), { key: 'test', labelAr: 'اختبار', labelEn: 'Test send' }] },
      { id: 'templates', labelAr: 'قوالب الإشعارات', labelEn: 'Templates', actions: [view(), create(), edit(), remove()] },
      { id: 'lookups', labelAr: 'القوائم المنسدلة', labelEn: 'Lookups', actions: [view(), create(), edit(), remove()] },
      { id: 'teams_departments', labelAr: 'الفرق والإدارات', labelEn: 'Teams & Departments', actions: [view(), create(), edit(), remove()] },
      { id: 'compliance', labelAr: 'حدود الالتزام', labelEn: 'Compliance', actions: [view(), edit()] },
      { id: 'notification_logs', labelAr: 'سجلات الإشعارات', labelEn: 'Notification Logs', actions: [view()] },
    ],
  },
];

/** Flatten the tree into the full list of `service.screen.action` keys. */
export const ALL_PERMISSION_KEYS: string[] = PERMISSION_SERVICES.flatMap(svc =>
  svc.screens.flatMap(scr => scr.actions.map(a => `${svc.id}.${scr.id === svc.id ? '' : scr.id + '.'}${a.key}`.replace('..', '.')))
);

/** Build the canonical key for a given service / screen / action triple.
 * When screen.id matches service.id we collapse `service.service.action` → `service.action`
 * so common patterns like `policies.view` stay short. */
export const permKey = (serviceId: string, screenId: string, actionKey: string): string =>
  screenId === serviceId ? `${serviceId}.${actionKey}` : `${serviceId}.${screenId}.${actionKey}`;

/** Default group seeds — created on first run if no groups exist yet. */
export const DEFAULT_GROUPS: { id: string; nameAr: string; nameEn: string; permissions: string[] }[] = [
  {
    id: 'admin',
    nameAr: 'مدير',
    nameEn: 'Admin',
    permissions: ALL_PERMISSION_KEYS, // full access
  },
  {
    id: 'auditor',
    nameAr: 'مدقق',
    nameEn: 'Auditor',
    // Read-only: every view + export + audit-trail view
    permissions: ALL_PERMISSION_KEYS.filter(k =>
      k.endsWith('.view') || k.endsWith('.export')
    ),
  },
  {
    id: 'user',
    nameAr: 'مستخدم',
    nameEn: 'User',
    // Operational basics: see everything, work on own tasks, file incidents, view dashboard/reports.
    permissions: [
      ...ALL_PERMISSION_KEYS.filter(k => k.endsWith('.view')),
      'tasks.my_tasks.update_status',
      'tasks.my_tasks.add_note',
      'incidents.create',
      'incidents.manage_notes',
      'procedures.evidence.create',
    ],
  },
];

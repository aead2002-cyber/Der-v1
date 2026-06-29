import type {
  LegalAuditLog,
  LegalCase,
  LegalCaseDocument,
  LegalCaseSession,
  LegalDocumentListItem,
  LegalEmployee,
  LegalInvestigation,
  LegalInvestigationDocument,
  LegalInvestigationSession,
  LegalParty,
  LegalSettings,
  LegalSummons,
} from '../types/legal';

// TEMPORARY mock data until Legal backend integration is available.

export const legalParties: LegalParty[] = [
  { id: 'party-1', name: 'شركة المدى للمقاولات', partyType: 'COMPANY', identityNumber: '7001234567', contactInfo: 'الرياض، 0112345678، legal@almada.sa', notes: 'طرف مدّعٍ في نزاع تجاري', createdAt: '2026-05-12T08:00:00Z', updatedAt: '2026-06-02T10:30:00Z' },
  { id: 'party-2', name: 'مؤسسة الغروب للتوريدات', partyType: 'COMPANY', identityNumber: '7009876543', contactInfo: 'جدة، 0123456789، info@alghroob.sa', notes: 'طرف مدعى عليه في عقد توريد', createdAt: '2026-04-21T09:00:00Z', updatedAt: '2026-06-01T13:15:00Z' },
  { id: 'party-3', name: 'وزارة التجارة', partyType: 'GOVERNMENT', contactInfo: 'الرياض، مركز التواصل الحكومي', notes: 'جهة ذات صلة بإجراء تنظيمي', createdAt: '2026-03-08T10:00:00Z', updatedAt: '2026-06-03T11:00:00Z' },
];

export const legalCases: LegalCase[] = [
  { id: 'case-1', internalCaseNumber: 'LC-2026-001', officialCaseNumber: '1427/ق/2026', caseDate: '2026-04-18', direction: 'AGAINST_US', category: 'COMMERCIAL', courtName: 'المحكمة التجارية بالرياض', plaintiffPartyId: 'party-1', defendantPartyId: 'party-2', subject: 'مطالبة مالية عن توريد متأخر', claimAmount: 1250000, status: 'ACTIVE', supervisorUserIds: ['u-1', 'u-2'], createdAt: '2026-04-18T09:00:00Z', updatedAt: '2026-06-07T12:00:00Z' },
  { id: 'case-2', internalCaseNumber: 'LC-2026-002', officialCaseNumber: '1561/ع/2026', caseDate: '2026-02-02', direction: 'BY_US', category: 'ADMINISTRATIVE', courtName: 'المحكمة الإدارية', plaintiffPartyId: 'party-3', defendantPartyId: 'party-1', subject: 'اعتراض على قرار تنظيمي', status: 'CLOSED', supervisorUserIds: ['u-1'], closedAt: '2026-05-15T10:00:00Z', closureReason: 'FINAL_JUDGMENT', closureNotes: 'تم إغلاق الملف بعد استكمال الاعتراضات', createdAt: '2026-02-02T08:30:00Z', updatedAt: '2026-05-15T10:30:00Z' },
  { id: 'case-3', internalCaseNumber: 'LC-2026-003', officialCaseNumber: '1788/ع/2026', caseDate: '2026-05-20', direction: 'AGAINST_US', category: 'LABOR', courtName: 'المحكمة العمالية', plaintiffPartyId: 'party-2', defendantPartyId: 'party-1', subject: 'مطالبة مستحقات ومكافآت', status: 'ACTIVE', supervisorUserIds: ['u-2'], createdAt: '2026-05-20T07:45:00Z', updatedAt: '2026-06-06T08:15:00Z' },
];

export const legalCaseDocuments: LegalCaseDocument[] = [
  { id: 'case-doc-1', caseId: 'case-1', description: 'عقد التوريد الرئيسي', fileId: 'file-case-1', fileName: 'عقد التوريد.pdf', fileType: 'application/pdf', addedAt: '2026-04-18T11:00:00Z', addedByUserId: 'u-1', documentCategory: 'CONTRACT' },
  { id: 'case-doc-2', caseId: 'case-2', description: 'مذكرة الاعتراض', fileId: 'file-case-2', fileName: 'مذكرة الاعتراض.pdf', fileType: 'application/pdf', addedAt: '2026-05-01T09:20:00Z', addedByUserId: 'u-2', documentCategory: 'MEMO' },
  { id: 'case-doc-3', caseId: 'case-3', description: 'مستندات داعمة للمطالبة', fileId: 'file-case-3', fileName: 'مستندات المطالبة.gif', fileType: 'image/gif', addedAt: '2026-05-24T10:15:00Z', addedByUserId: 'u-1', documentCategory: 'OTHER' },
];

export const legalCaseSessions: LegalCaseSession[] = [
  { id: 'case-session-1', caseId: 'case-1', sessionDateTime: '2026-06-11T09:30:00Z', location: 'المحكمة التجارية بالرياض - القاعة 4', attendees: ['u-1', 'u-2'], attendeeRoles: ['مشرف قانوني', 'مستشار'], attachments: ['file-case-session-1'], judgmentStatus: 'UNDER_REVIEW', notes: 'تم تأجيل النطق وتبادل المذكرات.', nextSessionDate: '2026-07-02', createdAt: '2026-06-11T11:00:00Z', updatedAt: '2026-06-11T11:15:00Z' },
  { id: 'case-session-2', caseId: 'case-2', sessionDateTime: '2026-05-10T10:00:00Z', location: 'المحكمة الإدارية - قاعة 2', attendees: ['u-1'], attendeeRoles: ['ممثل قانوني'], judgmentStatus: 'IN_OUR_FAVOR', judgmentText: 'صدور الحكم النهائي لصالح الغرفة.', notes: 'تم حفظ نسخة من الحكم وإغلاق القضية.', createdAt: '2026-05-10T12:00:00Z', updatedAt: '2026-05-15T10:00:00Z' },
  { id: 'case-session-3', caseId: 'case-3', sessionDateTime: '2026-06-18T13:00:00Z', location: 'المحكمة العمالية - قاعة 1', attendees: ['u-2'], attendeeRoles: ['مشرف قانوني'], judgmentStatus: 'POSTPONED', nextSessionDate: '2026-07-09', notes: 'طلبت المحكمة مهلة إضافية لاستكمال الردود.', createdAt: '2026-06-18T13:30:00Z', updatedAt: '2026-06-18T13:30:00Z' },
];

export const legalEmployees: LegalEmployee[] = [
  { id: 'emp-1', name: 'أحمد العتيبي', employeeNumber: 'E-1001', department: 'الإدارة القانونية', jobTitle: 'محقق قانوني', email: 'ahmed.otaibi@example.sa', mobile: '0550001111', status: 'ACTIVE' },
  { id: 'emp-2', name: 'سارة الزهراني', employeeNumber: 'E-1002', department: 'الإدارة القانونية', jobTitle: 'مستشارة قانونية', email: 'sara.zahrani@example.sa', mobile: '0550002222', status: 'ACTIVE' },
  { id: 'emp-3', name: 'خالد الشهري', employeeNumber: 'E-1003', department: 'الموارد البشرية', jobTitle: 'منسق استدعاءات', email: 'khalid.shahri@example.sa', status: 'ACTIVE' },
];

export const legalInvestigations: LegalInvestigation[] = [
  { id: 'inv-1', investigationNumber: 'INV-2026-001', investigationDate: '2026-05-05', subject: 'مراجعة واقعة تسريب مستندات', employeeIds: ['emp-1', 'emp-2'], status: 'OPEN', result: 'ARCHIVED', createdAt: '2026-05-05T08:00:00Z', updatedAt: '2026-06-05T08:30:00Z' },
  { id: 'inv-2', investigationNumber: 'INV-2026-002', investigationDate: '2026-03-21', subject: 'التحقق من التزام مورد رئيسي', employeeIds: ['emp-1'], status: 'CLOSED', closedAt: '2026-04-14T10:00:00Z', result: 'NOT_PROVEN', finalDecision: 'إغلاق الملف دون جزاءات', finalRecommendations: 'أرشفة المستندات ومتابعة المورد في المراجعة المقبلة', closureNotes: 'أُغلِق بعد اعتماد المذكرة النهائية', createdAt: '2026-03-21T07:30:00Z', updatedAt: '2026-04-14T10:30:00Z' },
  { id: 'inv-3', investigationNumber: 'INV-2026-003', investigationDate: '2026-06-02', subject: 'تحقيق داخلي بشأن تضارب مصالح', employeeIds: ['emp-2', 'emp-3'], status: 'OPEN', result: 'REFERRED', createdAt: '2026-06-02T08:15:00Z', updatedAt: '2026-06-12T09:20:00Z' },
];

export const legalInvestigationDocuments: LegalInvestigationDocument[] = [
  { id: 'inv-doc-1', investigationId: 'inv-1', description: 'تقرير أولي عن الواقعة', fileId: 'file-inv-1', fileName: 'تقرير أولي.pdf', fileType: 'application/pdf', addedAt: '2026-05-05T09:15:00Z', addedByUserId: 'u-1', documentCategory: 'JUDGMENT' },
  { id: 'inv-doc-2', investigationId: 'inv-3', description: 'محضر اجتماع أولي', fileId: 'file-inv-2', fileName: 'محضر اجتماع.gif', fileType: 'image/gif', addedAt: '2026-06-03T11:40:00Z', addedByUserId: 'u-2', documentCategory: 'MINUTES' },
];

export const legalGeneralDocuments: LegalDocumentListItem[] = [
  { id: 'doc-gen-1', source: 'GENERAL', relationId: 'general', description: 'خطة العمل القانونية العامة', fileId: 'file-gen-1', fileName: 'خطة العمل.pdf', fileType: 'application/pdf', addedAt: '2026-06-01T08:30:00Z', addedByUserId: 'u-1', documentCategory: 'OTHER' },
  { id: 'doc-con-1', source: 'CONTRACT', relationId: 'contract-1', description: 'مسودة عقد استشارات', fileId: 'file-con-1', fileName: 'مسودة العقد.gif', fileType: 'image/gif', addedAt: '2026-06-09T14:10:00Z', addedByUserId: 'u-2', documentCategory: 'CONTRACT' },
];

export const legalSummons: LegalSummons[] = [
  { id: 'sum-1', investigationId: 'inv-1', employeeId: 'emp-1', sessionDateTime: '2026-06-14T10:00:00Z', location: 'قاعة التحقيق 1', subject: 'استدعاء للإدلاء بإفادة أولية', notes: 'يرجى إحضار أي مراسلات ذات صلة.', status: 'CONFIRMED', createdAt: '2026-06-05T10:00:00Z', updatedAt: '2026-06-06T12:30:00Z' },
  { id: 'sum-2', investigationId: 'inv-3', employeeId: 'emp-3', sessionDateTime: '2026-06-20T09:00:00Z', location: 'قاعة التحقيق 2', subject: 'استدعاء لسماع أقوال الموظف', status: 'SENT', createdAt: '2026-06-12T08:45:00Z', updatedAt: '2026-06-12T08:45:00Z' },
];

export const legalInvestigationSessions: LegalInvestigationSession[] = [
  { id: 'inv-session-1', investigationId: 'inv-1', summonsId: 'sum-1', attendeeEmployeeIds: ['emp-1', 'emp-2'], sessionDateTime: '2026-06-14T10:15:00Z', location: 'قاعة التحقيق 1', subject: 'جلسة استماع أولى', statementText: 'تمت مناقشة وقائع التسريب وجمع البيانات الأولية.', attachments: ['file-inv-session-1'], investigatorNotes: 'ينتظر استكمال بعض الإفادات.', createdAt: '2026-06-14T12:00:00Z', updatedAt: '2026-06-14T12:10:00Z' },
  { id: 'inv-session-2', investigationId: 'inv-3', summonsId: 'sum-2', attendeeEmployeeIds: ['emp-2', 'emp-3'], sessionDateTime: '2026-06-20T09:30:00Z', location: 'قاعة التحقيق 2', subject: 'جلسة توضيحية', statementText: 'تمت مراجعة العلاقة الوظيفية وسياق تضارب المصالح المبلغ عنه.', investigatorNotes: 'يتطلب الملف مقابلة إضافية مع جهة خارجية.', createdAt: '2026-06-20T11:00:00Z', updatedAt: '2026-06-20T11:00:00Z' },
];

export const legalAuditLogs: LegalAuditLog[] = [
  { id: 'audit-1', userName: 'أحمد العتيبي', actionType: 'CREATE_CASE', serviceName: 'LegalCasesService', dateTime: '2026-06-07T12:00:00Z', afterValue: '{"caseId":"case-3"}', ipAddress: '10.0.0.12' },
  { id: 'audit-2', userName: 'سارة الزهراني', actionType: 'CLOSE_INVESTIGATION', serviceName: 'LegalInvestigationsService', dateTime: '2026-04-14T10:00:00Z', beforeValue: '{"status":"OPEN"}', afterValue: '{"status":"CLOSED"}', ipAddress: '10.0.0.18' },
  { id: 'audit-3', userName: 'خالد الشهري', actionType: 'ADD_DOCUMENT', serviceName: 'LegalDocumentsService', dateTime: '2026-06-12T08:45:00Z', afterValue: '{"documentId":"inv-doc-2"}', ipAddress: '10.0.0.19' },
];

export const legalSettings: LegalSettings = {
  caseReminderHours: 24,
  allowedFileTypes: ['PDF', 'GIF'],
  maxFileSizeMb: 2,
  enableInternalNotifications: true,
  enableEmailNotifications: false,
};

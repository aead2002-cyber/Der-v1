import {
  Commitment,
  ComplianceSettings,
  Department,
  Evidence,
  Framework,
  Policy,
  PolicyItem,
  Procedure,
  Risk,
  SecurityIncident,
  Standard,
  StandardClassification,
  Team,
  User,
  ChangeRequest,
} from '@/types';

export const defaultComplianceSettings: ComplianceSettings = {
  thresholds: [
    { id: '1', labelAr: 'التزام ضعيف', labelEn: 'Weak Compliance', min: 0, max: 40, color: '#ef4444' },
    { id: '2', labelAr: 'التزام متوسط', labelEn: 'Fair Compliance', min: 41, max: 70, color: '#f59e0b' },
    { id: '3', labelAr: 'التزام جيد', labelEn: 'Good Compliance', min: 71, max: 90, color: '#3b82f6' },
    { id: '4', labelAr: 'التزام ممتاز', labelEn: 'Excellent Compliance', min: 91, max: 100, color: '#10b981' },
  ],
  systemLogo: '/logo-der3.png',
};

export const getStandardItemIds = (standard: Standard | null | undefined): string[] => {
  if (!standard) return [];
  const ids = Array.isArray(standard.policyItemIds) ? standard.policyItemIds.filter(Boolean) : [];
  return ids.length > 0 ? ids : standard.policyItemId ? [standard.policyItemId] : [];
};

export const getProcedureLeafWeight = (procedure: Procedure | null | undefined): number => {
  const raw = typeof procedure?.weight === 'number' ? procedure.weight : 1;
  if (!Number.isFinite(raw)) return 1;
  return Math.max(1, Math.min(10, Math.round(raw)));
};

export const getStandardsInPolicy = (
  policyId: string,
  standards: Standard[],
  policyItems: PolicyItem[],
): string[] => {
  const itemIds = new Set(policyItems.filter(item => item.policyId === policyId).map(item => item.id));
  const ids = new Set<string>();
  standards.forEach(standard => {
    if (standard.policyId === policyId || getStandardItemIds(standard).some(id => itemIds.has(id))) {
      ids.add(standard.id);
    }
  });
  return Array.from(ids);
};

export const aggregateStandardWeights = (
  standardIds: string[],
  procedures: Procedure[],
): { completed: number; total: number } => {
  if (standardIds.length === 0) return { completed: 0, total: 0 };
  const idSet = new Set(standardIds);
  let completed = 0;
  let total = 0;

  procedures.forEach(procedure => {
    if (!idSet.has(procedure.standardId)) return;
    if (procedures.some(child => child.parentId === procedure.id)) return;
    const weight = getProcedureLeafWeight(procedure);
    total += weight;
    if (procedure.status === 'completed') completed += weight;
  });

  return { completed, total };
};

export const getStandardProgress = (standardId: string, procedures: Procedure[]): number => {
  const { completed, total } = aggregateStandardWeights([standardId], procedures);
  return total === 0 ? 0 : Math.round((completed / total) * 100);
};

export const getPolicyProgress = (
  policyId: string,
  standards: Standard[],
  policyItems: PolicyItem[],
  procedures: Procedure[],
): number => {
  const standardIds = getStandardsInPolicy(policyId, standards, policyItems);
  const { completed, total } = aggregateStandardWeights(standardIds, procedures);
  return total === 0 ? 0 : Math.round((completed / total) * 100);
};

export const getFrameworkProgress = (
  frameworkId: string,
  policies: Policy[],
  standards: Standard[],
  policyItems: PolicyItem[],
  procedures: Procedure[],
): number => {
  const standardIds = new Set<string>();
  policies
    .filter(policy => policy.frameworkId === frameworkId)
    .forEach(policy => getStandardsInPolicy(policy.id, standards, policyItems).forEach(id => standardIds.add(id)));
  const { completed, total } = aggregateStandardWeights(Array.from(standardIds), procedures);
  return total === 0 ? 0 : Math.round((completed / total) * 100);
};

export const getRiskLikelihood = (risk: Risk, procedures: Procedure[]): number => {
  const ids = risk.procedureIds || [];
  if (ids.length === 0) return clampScore(risk.likelihood || 1);
  const linked = procedures.filter(procedure => ids.includes(procedure.id));
  if (linked.length === 0) return clampScore(risk.likelihood || 1);
  const incomplete = linked.filter(procedure => procedure.status !== 'completed').length;
  if (incomplete === 0) return 1;
  if (incomplete === linked.length) return 5;
  return Math.max(1, Math.round((incomplete / linked.length) * 5));
};

export const getUserPerformance = (users: User[], procedures: Procedure[]) =>
  users.map(user => {
    const assignedProcedures = procedures.filter(procedure => procedure.assignedTo.includes(user.uid));
    if (assignedProcedures.length === 0) return { ...user, progress: 0 };
    const completed = assignedProcedures.filter(procedure => procedure.status === 'completed').length;
    return { ...user, progress: Math.round((completed / assignedProcedures.length) * 100) };
  });

export const getDepartmentPerformance = (
  departments: Department[],
  _teams: Team[],
  users: User[],
  procedures: Procedure[],
) => {
  const userPerformance = getUserPerformance(users, procedures);
  return departments.map(department => {
    const deptUsers = userPerformance.filter(user =>
      user.departments.includes(department.id) ||
      user.departments.includes(department.nameEn) ||
      user.departments.includes(department.nameAr)
    );
    if (deptUsers.length === 0) return { ...department, progress: 0 };
    const totalProgress = deptUsers.reduce((sum, user) => sum + user.progress, 0);
    return { ...department, progress: Math.round(totalProgress / deptUsers.length) };
  });
};

export type EntityLookupData = {
  frameworks?: Framework[];
  policies?: Policy[];
  policyItems?: PolicyItem[];
  standards?: Standard[];
  standardClassifications?: StandardClassification[];
  procedures?: Procedure[];
  evidence?: Evidence[];
  users?: User[];
  commitments?: Commitment[];
  incidents?: SecurityIncident[];
  risks?: Risk[];
  changeRequests?: ChangeRequest[];
};

export const getEntityDisplayName = (
  entityType: string,
  entityId: string,
  isRtl: boolean,
  data: EntityLookupData,
): string | null => {
  if (!entityId) return null;
  if (entityId === 'email_settings') return isRtl ? 'إعدادات البريد الإلكتروني' : 'Email Settings';
  if (entityId === 'compliance_settings') return isRtl ? 'إعدادات الالتزام' : 'Compliance Settings';
  if (entityId === 'change_password') return isRtl ? 'تغيير كلمة المرور' : 'Change Password';
  if (entityId.startsWith('bulk:')) {
    const count = entityId.slice('bulk:'.length);
    return isRtl ? `استيراد دفعي (${count} عنصر)` : `Bulk import (${count} items)`;
  }

  const pickName = (record: any): string | null => {
    if (!record) return null;
    return (isRtl ? record.nameAr : record.nameEn) || record.name || record.title || record.displayName || null;
  };

  switch (entityType) {
    case 'framework': return pickName(data.frameworks?.find(item => item.id === entityId));
    case 'policy': return pickName(data.policies?.find(item => item.id === entityId));
    case 'policy_item': return pickName(data.policyItems?.find(item => item.id === entityId));
    case 'standard': return pickName(data.standards?.find(item => item.id === entityId));
    case 'standard_classification': return pickName(data.standardClassifications?.find(item => item.id === entityId));
    case 'procedure': return pickName(data.procedures?.find(item => item.id === entityId));
    case 'evidence': return data.evidence?.find(item => item.id === entityId)?.name || null;
    case 'user': return pickName(data.users?.find(item => item.uid === entityId));
    case 'commitment': return pickName(data.commitments?.find(item => item.id === entityId));
    case 'incident': return pickName(data.incidents?.find(item => item.id === entityId));
    case 'risk': return pickName(data.risks?.find(item => item.id === entityId));
    case 'change_request': return pickName(data.changeRequests?.find(item => item.id === entityId));
    case 'incident_note': return isRtl ? 'ملاحظة على بلاغ' : 'Incident Note';
    case 'auth':
      return entityId === 'login'
        ? (isRtl ? 'تسجيل دخول' : 'Sign-in')
        : entityId === 'logout'
          ? (isRtl ? 'تسجيل خروج' : 'Sign-out')
          : entityId;
    default:
      return null;
  }
};

const clampScore = (value: number): number =>
  Math.max(1, Math.min(5, Math.round(Number(value) || 1)));

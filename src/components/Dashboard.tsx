import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Shield,
  CheckCircle2,
  Clock,
  Users,
  Building2,
  User as UserIcon,
  Layers,
  FileText,
  ListChecks,
  ClipboardList,
  LayoutDashboard,
  AlertTriangle,
  ShieldAlert,
  Send,
  Search,
  X,
  LayoutGrid,
  List,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CountUp } from './shared/CountUp';
import { resolveFileUrl } from '@/services/filesApi';
import { cn } from '@/lib/utils';
import { AuditLog, ChangeRequest, Commitment, Department, Framework, Policy, PolicyItem, Procedure, Risk, SecurityIncident, Standard, Team, User } from '@/types';
import { auditLogsApi } from '@/services/auditLogsApi';
import { changeRequestsApi } from '@/services/changeRequestsApi';
import { commitmentsApi } from '@/services/commitmentsApi';
import { departmentsApi } from '@/services/departmentsApi';
import { frameworksApi } from '@/services/frameworksApi';
import { incidentsApi } from '@/services/incidentsApi';
import { policiesApi } from '@/services/policiesApi';
import { policyItemsApi } from '@/services/policyItemsApi';
import { proceduresApi } from '@/services/proceduresApi';
import { risksApi } from '@/services/risksApi';
import { standardsApi } from '@/services/standardsApi';
import { teamsApi } from '@/services/teamsApi';
import { usersApi } from '@/services/usersApi';
import {
  aggregateStandardWeights,
  defaultComplianceSettings,
  getDepartmentPerformance,
  getFrameworkProgress,
  getPolicyProgress,
  getRiskLikelihood,
  getStandardsInPolicy,
  getUserPerformance,
} from '@/lib/progressHelpers';
import { formatDistanceToNow } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { motion } from 'motion/react';

interface DashboardData {
  auditLogs: AuditLog[];
  changeRequests: ChangeRequest[];
  commitments: Commitment[];
  departments: Department[];
  frameworks: Framework[];
  incidents: SecurityIncident[];
  policies: Policy[];
  policyItems: PolicyItem[];
  procedures: Procedure[];
  risks: Risk[];
  standards: Standard[];
  teams: Team[];
  users: User[];
}

const emptyDashboardData: DashboardData = {
  auditLogs: [],
  changeRequests: [],
  commitments: [],
  departments: [],
  frameworks: [],
  incidents: [],
  policies: [],
  policyItems: [],
  procedures: [],
  risks: [],
  standards: [],
  teams: [],
  users: [],
};

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const [dashboardData, setDashboardData] = useState<DashboardData>(emptyDashboardData);
  const [counts, setCounts] = useState({ total: 0, completed: 0, inProgress: 0, notStarted: 0, delayed: 0 });
  const [frameworkProgressList, setFrameworkProgressList] = useState<any[]>([]);
  const [globalScore, setGlobalScore] = useState(0);
  const [complianceSettings] = useState(defaultComplianceSettings);
  const [activities, setActivities] = useState<AuditLog[]>([]);
  const [userPerformance, setUserPerformance] = useState<any[]>([]);
  const [deptPerformance, setDeptPerformance] = useState<any[]>([]);
  const [teamSize, setTeamSize] = useState(0);
  const [frameworks, setFrameworks] = useState<any[]>([]);
  const [selectedFrameworkId, setSelectedFrameworkId] = useState('all');
  const [overdueProcedures, setOverdueProcedures] = useState(0);
  const [openProcedures, setOpenProcedures] = useState(0);
  const [openIncidents, setOpenIncidents] = useState(0);
  const [openChangeRequests, setOpenChangeRequests] = useState(0);

  // Tab 1 (policies) state — separate framework selector
  const [policiesFrameworkId, setPoliciesFrameworkId] = useState<string>('all');
  const [policiesSearch, setPoliciesSearch] = useState('');
  const [allPolicies, setAllPolicies] = useState<any[]>([]);
  const [policiesView_mode, setPoliciesViewMode] = useState<'cards' | 'rows'>('cards');
  type SortKey = 'items' | 'standards' | 'procedures' | 'completion';
  const [policiesSortKey, setPoliciesSortKey] = useState<SortKey>('completion');
  const [policiesSortDir, setPoliciesSortDir] = useState<'asc' | 'desc'>('desc');

  const isRtl = i18n.language === 'ar';

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      const [
        auditLogs,
        changeRequests,
        commitments,
        departments,
        loadedFrameworks,
        incidents,
        loadedPolicies,
        policyItems,
        procedures,
        risks,
        standards,
        teams,
        users,
      ] = await Promise.all([
        auditLogsApi.getAuditLogs(),
        changeRequestsApi.getChangeRequests(),
        commitmentsApi.getCommitments(),
        departmentsApi.getDepartments(),
        frameworksApi.getFrameworks(),
        incidentsApi.getIncidents(),
        policiesApi.getPolicies(),
        policyItemsApi.getPolicyItems(),
        proceduresApi.getProcedures(),
        risksApi.getRisks(),
        standardsApi.getStandards(),
        teamsApi.getTeams(),
        usersApi.getUsers(),
      ]);

      if (!isMounted) return;
      setDashboardData({
        auditLogs,
        changeRequests,
        commitments,
        departments,
        frameworks: loadedFrameworks,
        incidents,
        policies: loadedPolicies,
        policyItems,
        procedures,
        risks,
        standards,
        teams,
        users,
      });
      setFrameworks(loadedFrameworks);
      setAllPolicies(loadedPolicies);
    };

    loadData().catch(error => {
      console.error('Failed to load dashboard data', error);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let procedures = dashboardData.procedures;
    let currentFrameworks = frameworks;

    if (selectedFrameworkId !== 'all') {
      const policies = dashboardData.policies.filter(p => p.frameworkId === selectedFrameworkId);
      const policyIds = policies.map(p => p.id);
      procedures = procedures.filter(p => policyIds.includes(p.policyId));
      currentFrameworks = frameworks.filter(f => f.id === selectedFrameworkId);
    }

    const logs = dashboardData.auditLogs.slice(0, 5);
    const users = dashboardData.users;

    setActivities(logs);
    setUserPerformance(getUserPerformance(dashboardData.users, dashboardData.procedures));
    setDeptPerformance(getDepartmentPerformance(dashboardData.departments, dashboardData.teams, dashboardData.users, dashboardData.procedures));
    setTeamSize(users.length);

    setCounts({
      total: procedures.length,
      completed: procedures.filter(p => p.status === 'completed').length,
      inProgress: procedures.filter(p => p.status === 'in_progress').length,
      notStarted: procedures.filter(p => p.status === 'not_started').length,
      delayed: 12
    });

    const todayMs = Date.now();
    setOpenProcedures(procedures.filter(p => p.status !== 'completed').length);
    setOverdueProcedures(procedures.filter(p => {
      if (p.status === 'completed' || !p.endDate) return false;
      const end = new Date(p.endDate).getTime();
      return !isNaN(end) && end < todayMs;
    }).length);

    const incidents = dashboardData.incidents;
    setOpenIncidents(incidents.filter(i => i.status !== 'resolved' && i.status !== 'closed').length);

    const requests = dashboardData.changeRequests;
    setOpenChangeRequests(requests.filter(r => r.status === 'pending' || r.status === 'clarification_needed').length);

    const progressList = currentFrameworks.map(f => {
      const progress = getFrameworkProgress(f.id, dashboardData.policies, dashboardData.standards, dashboardData.policyItems, dashboardData.procedures);
      const policies = dashboardData.policies.filter(p => p.frameworkId === f.id);
      return {
        name: isRtl ? f.nameAr : f.nameEn,
        progress,
        completed: `${policies.length} ${t('policies_count') || 'Policies'}`,
        status: progress === 100 ? (t('certified') || 'Certified') : (progress > 0 ? (t('in_progress') || 'In Progress') : (t('initial') || 'Initial')),
        badge: progress > 50 ? 'success' : 'warning'
      };
    });
    setFrameworkProgressList(progressList);

    if (currentFrameworks.length > 0) {
      // Weighted global compliance: aggregate every leaf procedure across all frameworks
      // in scope. Empty frameworks contribute nothing instead of pulling the average down.
      const stdIdSet = new Set<string>();
      const allPolicies = dashboardData.policies;
      currentFrameworks.forEach(f => {
        allPolicies
          .filter(p => p.frameworkId === f.id)
          .forEach(p => getStandardsInPolicy(p.id, dashboardData.standards, dashboardData.policyItems).forEach(sid => stdIdSet.add(sid)));
      });
      const { completed: cw, total: tw } = aggregateStandardWeights(Array.from(stdIdSet), dashboardData.procedures);
      setGlobalScore(tw === 0 ? 0 : Math.round((cw / tw) * 100));
    } else {
      setGlobalScore(0);
    }
  }, [t, isRtl, frameworks, selectedFrameworkId, dashboardData]);

  const policiesView = useMemo(() => {
    let list = policiesFrameworkId === 'all'
      ? allPolicies
      : allPolicies.filter(p => p.frameworkId === policiesFrameworkId);

    const q = policiesSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(p =>
        (p.nameAr || '').toLowerCase().includes(q) ||
        (p.nameEn || '').toLowerCase().includes(q)
      );
    }

    const allStandards = dashboardData.standards;
    const allProcedures = dashboardData.procedures;
    const allPolicyItems = dashboardData.policyItems;
    const allUsers = dashboardData.users;
    const userById = new Map(allUsers.map(u => [u.uid, u]));

    const enriched = list.map(p => {
      const progress = getPolicyProgress(p.id, allStandards, allPolicyItems, allProcedures);
      // Mirror getPolicyProgress's union (direct s.policyId + standards linked via items) so
      // procedure counts / distribution % shown on this card reconcile with the progress bar.
      const policyStandardIds = getStandardsInPolicy(p.id, allStandards, allPolicyItems);
      const policyProcedures = allProcedures.filter(pr => policyStandardIds.includes(pr.standardId));
      const policyItemsCount = allPolicyItems.filter(it => it.policyId === p.id).length;
      const assigneeIds = new Set<string>();
      policyProcedures.forEach(pr => (pr.assignedTo || []).forEach(uid => assigneeIds.add(uid)));
      const assignees = Array.from(assigneeIds).map(uid => userById.get(uid)).filter(Boolean) as any[];
      const total = policyProcedures.length;
      const doneN = policyProcedures.filter(pr => pr.status === 'completed').length;
      const inprogN = policyProcedures.filter(pr => pr.status === 'in_progress').length;
      const notN = policyProcedures.filter(pr => pr.status === 'not_started').length;
      const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;
      return {
        id: p.id,
        name: isRtl ? p.nameAr : p.nameEn,
        description: isRtl ? p.descriptionAr : p.descriptionEn,
        frameworkId: p.frameworkId,
        progress,
        itemsCount: policyItemsCount,
        assignees,
        standardsCount: policyStandardIds.length,
        proceduresCount: total,
        completedCount: doneN,
        inProgressCount: inprogN,
        notStartedCount: notN,
        completedPct: pct(doneN),
        inProgressPct: pct(inprogN),
        notStartedPct: pct(notN)
      };
    });

    const sortFieldMap: Record<SortKey, (x: typeof enriched[0]) => number> = {
      items: x => x.itemsCount,
      standards: x => x.standardsCount,
      procedures: x => x.proceduresCount,
      completion: x => x.completedPct
    };
    const getter = sortFieldMap[policiesSortKey];
    enriched.sort((a, b) => {
      const diff = getter(a) - getter(b);
      return policiesSortDir === 'asc' ? diff : -diff;
    });

    // Weighted average across all policies in view — aggregates every leaf procedure
    // under every standard belonging to these policies (via the same union path the
    // per-policy helper uses), then divides completed weight by total weight. Policies
    // with no procedures contribute nothing instead of being averaged in as 0%.
    const stdIdSet = new Set<string>();
    enriched.forEach(p => getStandardsInPolicy(p.id, allStandards, allPolicyItems).forEach(sid => stdIdSet.add(sid)));
    const { completed: cw, total: tw } = aggregateStandardWeights(Array.from(stdIdSet), allProcedures);
    const avg = tw === 0 ? 0 : Math.round((cw / tw) * 100);

    const completed = enriched.filter(p => p.progress === 100).length;
    const inProgress = enriched.filter(p => p.progress > 0 && p.progress < 100).length;
    const notStarted = enriched.filter(p => p.progress === 0).length;
    const completedPctOfTotal = enriched.length === 0 ? 0 : Math.round((completed / enriched.length) * 100);

    return { list: enriched, avg, completed, inProgress, notStarted, completedPctOfTotal };
  }, [policiesFrameworkId, policiesSearch, policiesSortKey, policiesSortDir, allPolicies, isRtl, dashboardData]);

  const policyComplianceLabel = (() => {
    if (!complianceSettings) return { label: '', color: '#3b82f6' };
    const t2 = complianceSettings.thresholds.find(t => policiesView.avg >= t.min && policiesView.avg <= t.max);
    return t2 ? { label: isRtl ? t2.labelAr : t2.labelEn, color: t2.color } : { label: '', color: '#3b82f6' };
  })();

  const getCurrentComplianceLabel = () => {
    if (!complianceSettings) return { label: '', color: '#3b82f6' };
    const threshold = complianceSettings.thresholds.find(t => globalScore >= t.min && globalScore <= t.max);
    return threshold ? { label: isRtl ? threshold.labelAr : threshold.labelEn, color: threshold.color } : { label: '', color: '#3b82f6' };
  };

  const getActionLabel = (action: AuditLog['action'], entityType: AuditLog['entityType']) => {
    const actionMap: any = {
      'create': t('action_create') || 'Created new',
      'update': t('action_update') || 'Updated',
      'delete': t('action_delete') || 'Deleted',
      'status_change': t('action_status_change') || 'Changed status of',
      'evidence_add': t('action_evidence_add') || 'Uploaded evidence for',
      'comment_add': t('action_comment_add') || 'Commented on'
    };
    const entityMap: any = {
      'policy': t('policy') || 'Policy',
      'standard': t('standard') || 'Standard',
      'procedure': t('procedure') || 'Procedure',
      'evidence': t('evidence') || 'Evidence',
      'comment': t('comment') || 'Comment',
      'user': t('user') || 'User',
      'framework': t('framework') || 'Framework',
      'commitment': t('commitment') || 'Commitment'
    };
    return `${actionMap[action] || action} ${entityMap[entityType] || entityType}`;
  };

  const complianceInfo = getCurrentComplianceLabel();

  return (
    <Tabs defaultValue="policies" className="w-full">
      <TabsList className="bg-slate-100 h-10 p-1">
        <TabsTrigger value="policies" className="px-5 gap-2 text-[13px] font-bold">
          <ClipboardList className="w-4 h-4" />
          {isRtl ? 'مؤشرات السياسات' : 'Policy Indicators'}
        </TabsTrigger>
        <TabsTrigger value="commitments" className="px-5 gap-2 text-[13px] font-bold">
          <CheckCircle2 className="w-4 h-4" />
          {isRtl ? 'مؤشرات الالتزامات' : 'Commitment Indicators'}
        </TabsTrigger>
        <TabsTrigger value="incidents" className="px-5 gap-2 text-[13px] font-bold">
          <ShieldAlert className="w-4 h-4" />
          {isRtl ? 'مؤشرات البلاغات' : 'Incident Indicators'}
        </TabsTrigger>
        <TabsTrigger value="risks" className="px-5 gap-2 text-[13px] font-bold">
          <AlertTriangle className="w-4 h-4" />
          {isRtl ? 'مؤشرات المخاطر' : 'Risk Indicators'}
        </TabsTrigger>
        <TabsTrigger value="overview" className="px-5 gap-2 text-[13px] font-bold">
          <LayoutDashboard className="w-4 h-4" />
          {isRtl ? 'النظرة العامة' : 'Overview'}
        </TabsTrigger>
      </TabsList>

      {/* TAB 1: Policy-level indicators */}
      <TabsContent value="policies" className="mt-6 space-y-6">
        {/* Framework switcher */}
        <div className="bg-white rounded-2xl border border-border-subtle p-4">
          <div className="flex items-center gap-2 mb-3 text-[11px] font-black uppercase tracking-widest text-slate-500">
            <Layers className="w-3 h-3" />
            {isRtl ? 'تبديل إطار العمل' : 'Switch Framework'}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setPoliciesFrameworkId('all')}
              className={cn(
                'px-4 py-2 rounded-xl text-[12px] font-bold transition-all flex items-center gap-2',
                policiesFrameworkId === 'all'
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              )}
            >
              <span>{isRtl ? 'جميع أطر العمل' : 'All Frameworks'}</span>
              {policiesFrameworkId === 'all' && <CheckCircle2 className="w-3.5 h-3.5" />}
            </button>
            {frameworks.map(f => (
              <button
                key={f.id}
                onClick={() => setPoliciesFrameworkId(f.id)}
                className={cn(
                  'px-4 py-2 rounded-xl text-[12px] font-bold transition-all flex items-center gap-2',
                  policiesFrameworkId === f.id
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                )}
              >
                <span className="truncate max-w-[200px]">{isRtl ? f.nameAr : f.nameEn}</span>
                {policiesFrameworkId === f.id && <CheckCircle2 className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>

          {/* Search by policy name */}
          <div className="mt-4 pt-4 border-t border-border-subtle">
            <div className="relative">
              <Search className={cn('absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none', isRtl ? 'right-3' : 'left-3')} />
              <input
                type="text"
                value={policiesSearch}
                onChange={e => setPoliciesSearch(e.target.value)}
                placeholder={isRtl ? 'ابحث باسم السياسة...' : 'Search by policy name...'}
                className={cn(
                  'w-full h-10 rounded-xl border border-slate-200 bg-slate-50 text-[13px] focus:outline-none focus:border-primary focus:bg-white transition-colors',
                  isRtl ? 'pr-10 pl-10 text-right' : 'pl-10 pr-10 text-left'
                )}
              />
              {policiesSearch && (
                <button
                  type="button"
                  onClick={() => setPoliciesSearch('')}
                  className={cn('absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700', isRtl ? 'left-3' : 'right-3')}
                  title={isRtl ? 'مسح' : 'Clear'}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="flex justify-between items-start">
              <div className="stat-label">{isRtl ? 'متوسط الالتزام' : 'Avg Compliance'}</div>
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${policyComplianceLabel.color}15`, color: policyComplianceLabel.color }}>
                <Shield className="w-4 h-4" />
              </div>
            </div>
            <div className="stat-value mt-1" style={{ color: policyComplianceLabel.color }}><CountUp value={policiesView.avg} suffix="%" /></div>
            <div className="text-[12px] mt-1 font-medium" style={{ color: policyComplianceLabel.color }}>{policyComplianceLabel.label}</div>
          </div>
          <div className="stat-card">
            <div className="flex justify-between items-start">
              <div className="stat-label">{isRtl ? 'إجمالي السياسات' : 'Total Policies'}</div>
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="stat-value mt-1"><CountUp value={policiesView.list.length} /></div>
            <div className="text-[12px] text-text-muted mt-1 font-medium">
              {policiesFrameworkId === 'all'
                ? (isRtl ? 'جميع الأطر' : 'All Frameworks')
                : (isRtl ? 'في الإطار المحدد' : 'In selected framework')}
            </div>
          </div>
          <div className="stat-card">
            <div className="flex justify-between items-start">
              <div className="stat-label">{isRtl ? 'مكتملة' : 'Completed'}</div>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="stat-value mt-1 text-emerald-600"><CountUp value={policiesView.completed} /></div>
            <div className="text-[12px] text-emerald-600 mt-1 font-medium">{policiesView.completedPctOfTotal}%</div>
          </div>
          <div className="stat-card">
            <div className="flex justify-between items-start">
              <div className="stat-label">{isRtl ? 'قيد التنفيذ / لم تبدأ' : 'In Progress / Not Started'}</div>
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="stat-value mt-1"><CountUp value={policiesView.inProgress} /> <span className="text-text-muted text-base">/ <CountUp value={policiesView.notStarted} /></span></div>
            <div className="text-[12px] text-text-muted mt-1 font-medium">{isRtl ? 'بحاجة لمتابعة' : 'Need attention'}</div>
          </div>
        </div>

        {/* Header + view/sort controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-2">
          <h2 className="text-base font-bold text-text-main flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-primary" />
            {isRtl ? 'تفاصيل السياسات' : 'Policies Detail'}
            <span className="text-[12px] text-text-muted font-medium ml-2">
              ({policiesView.list.length} {isRtl ? 'سياسة' : 'policies'})
            </span>
          </h2>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Sort key */}
            <div className="flex items-center gap-1 bg-white border border-border-subtle rounded-xl p-1">
              <span className="text-[11px] text-text-muted font-bold px-2">
                {isRtl ? 'ترتيب:' : 'Sort:'}
              </span>
              {([
                { k: 'items', labelAr: 'البنود', labelEn: 'Items' },
                { k: 'standards', labelAr: 'المعايير', labelEn: 'Standards' },
                { k: 'procedures', labelAr: 'الإجراءات', labelEn: 'Procedures' },
                { k: 'completion', labelAr: 'الإنجاز', labelEn: 'Completion' }
              ] as const).map(opt => (
                <button
                  key={opt.k}
                  onClick={() => setPoliciesSortKey(opt.k)}
                  className={cn(
                    'px-2.5 h-7 rounded-lg text-[11px] font-bold transition-colors',
                    policiesSortKey === opt.k
                      ? 'bg-primary text-white'
                      : 'text-text-muted hover:bg-slate-100'
                  )}
                >
                  {isRtl ? opt.labelAr : opt.labelEn}
                </button>
              ))}
              <button
                onClick={() => setPoliciesSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                className="px-2 h-7 rounded-lg text-text-muted hover:bg-slate-100 transition-colors"
                title={policiesSortDir === 'asc' ? (isRtl ? 'تصاعدي' : 'Ascending') : (isRtl ? 'تنازلي' : 'Descending')}
              >
                {policiesSortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* View mode */}
            <div className="flex items-center bg-white border border-border-subtle rounded-xl p-1">
              <button
                onClick={() => setPoliciesViewMode('cards')}
                className={cn(
                  'h-7 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors',
                  policiesView_mode === 'cards' ? 'bg-primary text-white' : 'text-text-muted hover:bg-slate-100'
                )}
                title={isRtl ? 'بطاقات' : 'Cards'}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                {isRtl ? 'بطاقات' : 'Cards'}
              </button>
              <button
                onClick={() => setPoliciesViewMode('rows')}
                className={cn(
                  'h-7 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors',
                  policiesView_mode === 'rows' ? 'bg-primary text-white' : 'text-text-muted hover:bg-slate-100'
                )}
                title={isRtl ? 'صفوف' : 'Rows'}
              >
                <List className="w-3.5 h-3.5" />
                {isRtl ? 'صفوف' : 'Rows'}
              </button>
            </div>
          </div>
        </div>

        {policiesView.list.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border-subtle p-10 text-center text-text-muted text-[13px]">
            {isRtl ? 'لا توجد سياسات في الإطار المحدد' : 'No policies in selected framework'}
          </div>
        ) : policiesView_mode === 'rows' ? (
          <div className="bg-white rounded-2xl border border-border-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-slate-50 text-text-muted">
                    <th className={cn('py-3 px-4 font-bold text-[11px] uppercase tracking-wider', isRtl ? 'text-right' : 'text-left')}>
                      {isRtl ? 'السياسة' : 'Policy'}
                    </th>
                    <th className={cn('py-3 px-4 font-bold text-[11px] uppercase tracking-wider', isRtl ? 'text-right' : 'text-left')}>
                      {isRtl ? 'إطار العمل' : 'Framework'}
                    </th>
                    <th className="py-3 px-4 font-bold text-[11px] uppercase tracking-wider text-center">
                      {isRtl ? 'البنود' : 'Items'}
                    </th>
                    <th className="py-3 px-4 font-bold text-[11px] uppercase tracking-wider text-center">
                      {isRtl ? 'المعايير' : 'Standards'}
                    </th>
                    <th className="py-3 px-4 font-bold text-[11px] uppercase tracking-wider text-center">
                      {isRtl ? 'الإجراءات' : 'Procedures'}
                    </th>
                    <th className="py-3 px-4 font-bold text-[11px] uppercase tracking-wider text-center">
                      {isRtl ? 'الحالات' : 'Status mix'}
                    </th>
                    <th className={cn('py-3 px-4 font-bold text-[11px] uppercase tracking-wider', isRtl ? 'text-right' : 'text-left')}>
                      {isRtl ? 'نسبة الإنجاز' : 'Completion'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {policiesView.list.map(p => {
                    const fw = frameworks.find(f => f.id === p.frameworkId);
                    const fwName = fw ? (isRtl ? fw.nameAr : fw.nameEn) : '—';
                    const ringColor = p.progress === 100 ? '#10b981' : p.progress >= 50 ? '#3b82f6' : p.progress > 0 ? '#f59e0b' : '#94a3b8';
                    return (
                      <tr key={p.id} className="border-t border-border-subtle hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 font-bold text-text-main max-w-[260px]">
                          <div className="truncate" title={p.name}>{p.name}</div>
                        </td>
                        <td className="py-3 px-4 text-text-muted text-[12px]">{fwName}</td>
                        <td className="py-3 px-4 text-center font-bold text-text-main">{p.itemsCount}</td>
                        <td className="py-3 px-4 text-center font-bold text-text-main">{p.standardsCount}</td>
                        <td className="py-3 px-4 text-center font-bold text-text-main">{p.proceduresCount}</td>
                        <td className="py-3 px-4">
                          <div className="h-2 w-32 mx-auto rounded-full overflow-hidden flex bg-slate-100">
                            {p.proceduresCount > 0 && (
                              <>
                                <div className="bg-emerald-500" style={{ width: `${p.completedPct}%` }} title={`${p.completedPct}%`} />
                                <div className="bg-blue-500" style={{ width: `${p.inProgressPct}%` }} title={`${p.inProgressPct}%`} />
                                <div className="bg-slate-300" style={{ width: `${p.notStartedPct}%` }} title={`${p.notStartedPct}%`} />
                              </>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden min-w-[80px]">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${p.progress}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: ringColor }}
                              />
                            </div>
                            <span className="text-[12px] font-black w-10 text-end" style={{ color: ringColor }}><CountUp value={p.progress} suffix="%" /></span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {policiesView.list.map(p => {
              const fw = frameworks.find(f => f.id === p.frameworkId);
              const fwName = fw ? (isRtl ? fw.nameAr : fw.nameEn) : '—';
              const ringColor = p.progress === 100
                ? '#10b981'
                : p.progress >= 50
                  ? '#3b82f6'
                  : p.progress > 0
                    ? '#f59e0b'
                    : '#94a3b8';
              const circumference = 2 * Math.PI * 36;
              const dash = (p.progress / 100) * circumference;
              const empty = p.proceduresCount === 0;

              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl border border-border-subtle p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="relative w-[88px] h-[88px] shrink-0">
                      <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90">
                        <circle cx="44" cy="44" r="36" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                        <motion.circle
                          cx="44" cy="44" r="36" fill="none"
                          stroke={ringColor} strokeWidth="8" strokeLinecap="round"
                          strokeDasharray={`0 ${circumference}`}
                          initial={{ strokeDasharray: `0 ${circumference}` }}
                          animate={{ strokeDasharray: `${dash} ${circumference}` }}
                          transition={{ duration: 0.9, ease: 'easeOut' }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-[20px] font-black leading-none" style={{ color: ringColor }}>
                          <CountUp value={p.progress} suffix="%" />
                        </span>
                        <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider mt-0.5">
                          {isRtl ? 'مكتمل' : 'Done'}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[14px] font-bold text-text-main leading-snug line-clamp-2" title={p.name}>{p.name}</h3>
                      <p className="text-[11px] text-text-muted mt-1 truncate">{fwName}</p>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-text-muted flex-wrap">
                        <span className="flex items-center gap-1">
                          <span className="font-bold text-text-main">{p.itemsCount}</span>
                          <span>{isRtl ? 'بند' : 'items'}</span>
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="flex items-center gap-1">
                          <span className="font-bold text-text-main">{p.standardsCount}</span>
                          <span>{isRtl ? 'معيار' : 'std.'}</span>
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="flex items-center gap-1">
                          <span className="font-bold text-text-main">{p.proceduresCount}</span>
                          <span>{isRtl ? 'إجراء' : 'proc.'}</span>
                        </span>
                      </div>

                      {/* Assignees */}
                      <div className="mt-2.5 flex items-center gap-2">
                        {p.assignees.length === 0 ? (
                          <span className="text-[10px] text-text-muted italic">
                            {isRtl ? 'لا يوجد مكلّفون' : 'No assignees'}
                          </span>
                        ) : (
                          <>
                            <div className="flex -space-x-1.5 rtl:space-x-reverse">
                              {p.assignees.slice(0, 4).map((u: any) => {
                                const displayName = isRtl
                                  ? (u.displayName || u.displayNameEn || u.email)
                                  : (u.displayNameEn || u.displayName || u.email);
                                return (
                                  <Avatar
                                    key={u.uid}
                                    className="w-6 h-6 border-2 border-white shadow-sm"
                                    title={displayName}
                                  >
                                    <AvatarImage src={resolveFileUrl(u.photoURL || '') || u.photoURL} />
                                    <AvatarFallback className="text-[9px] bg-blue-50 text-blue-700 font-bold">
                                      {(displayName || '?').trim().split(/\s+/).map((s: string) => s[0]).slice(0, 2).join('').toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                );
                              })}
                            </div>
                            {p.assignees.length > 4 && (
                              <span
                                className="text-[10px] font-bold text-text-muted bg-slate-100 rounded-full px-1.5 py-0.5"
                                title={p.assignees.slice(4).map((u: any) =>
                                  isRtl
                                    ? (u.displayName || u.displayNameEn || u.email)
                                    : (u.displayNameEn || u.displayName || u.email)
                                ).join(', ')}
                              >
                                +{p.assignees.length - 4}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stacked status bar */}
                  <div className="mb-3">
                    <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-slate-100">
                      {!empty && (
                        <>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${p.completedPct}%` }}
                            transition={{ duration: 0.8 }}
                            className="bg-emerald-500"
                            title={`${isRtl ? 'مكتمل' : 'Completed'}: ${p.completedPct}%`}
                          />
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${p.inProgressPct}%` }}
                            transition={{ duration: 0.8, delay: 0.1 }}
                            className="bg-blue-500"
                            title={`${isRtl ? 'قيد التنفيذ' : 'In Progress'}: ${p.inProgressPct}%`}
                          />
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${p.notStartedPct}%` }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="bg-slate-300"
                            title={`${isRtl ? 'لم تبدأ' : 'Not Started'}: ${p.notStartedPct}%`}
                          />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Legend with counts */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-emerald-50 px-2.5 py-2 border border-emerald-100">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        {isRtl ? 'مكتمل' : 'Done'}
                      </div>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-base font-black text-emerald-700"><CountUp value={p.completedPct} suffix="%" /></span>
                        <span className="text-[10px] text-emerald-600/70 font-medium">(<CountUp value={p.completedCount} />)</span>
                      </div>
                    </div>
                    <div className="rounded-lg bg-blue-50 px-2.5 py-2 border border-blue-100">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        {isRtl ? 'جاري' : 'WIP'}
                      </div>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-base font-black text-blue-700"><CountUp value={p.inProgressPct} suffix="%" /></span>
                        <span className="text-[10px] text-blue-600/70 font-medium">(<CountUp value={p.inProgressCount} />)</span>
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-2.5 py-2 border border-slate-200">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        {isRtl ? 'لم تبدأ' : 'New'}
                      </div>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-base font-black text-slate-700"><CountUp value={p.notStartedPct} suffix="%" /></span>
                        <span className="text-[10px] text-slate-500 font-medium">(<CountUp value={p.notStartedCount} />)</span>
                      </div>
                    </div>
                  </div>

                  {empty && (
                    <div className="mt-3 text-center text-[11px] text-text-muted">
                      {isRtl ? 'لا توجد إجراءات بعد' : 'No procedures yet'}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </TabsContent>

      {/* TAB 2: Commitments indicators */}
      <TabsContent value="commitments" className="mt-6">
        <CommitmentsIndicators isRtl={isRtl} commitments={dashboardData.commitments} users={dashboardData.users} />
      </TabsContent>

      {/* TAB 3: Incident indicators */}
      <TabsContent value="incidents" className="mt-6">
        <IncidentIndicators isRtl={isRtl} incidents={dashboardData.incidents} />
      </TabsContent>

      {/* TAB 4: Risk indicators */}
      <TabsContent value="risks" className="mt-6">
        <RiskIndicators isRtl={isRtl} risks={dashboardData.risks} procedures={dashboardData.procedures} />
      </TabsContent>

      {/* TAB 5: Existing overview */}
      <TabsContent value="overview" className="mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
              <div className="stat-card group hover:border-primary/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="stat-label">{t('team_size')}</div>
                  <div className="p-2 rounded-lg bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="stat-value mt-1"><CountUp value={teamSize} /></div>
                <div className="text-[12px] text-emerald-500 mt-1 font-medium">{t('active') || 'Active'}</div>
              </div>

              <div className="stat-card group hover:border-rose-500/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="stat-label">{isRtl ? 'الإجراءات المتأخرة' : 'Overdue Procedures'}</div>
                  <div className="p-2 rounded-lg bg-rose-50 text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <div className="stat-value mt-1 text-rose-600"><CountUp value={overdueProcedures} /></div>
                <div className="text-[12px] text-rose-500 mt-1 font-medium">
                  {isRtl ? 'تجاوزت تاريخ الانتهاء' : 'Past due date'}
                </div>
              </div>

              <div className="stat-card group hover:border-amber-500/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="stat-label">{isRtl ? 'الإجراءات المفتوحة' : 'Open Procedures'}</div>
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="stat-value mt-1"><CountUp value={openProcedures} /></div>
                <div className="text-[12px] text-text-muted mt-1 font-medium">
                  {isRtl ? 'لم تكتمل بعد' : 'Not completed'}
                </div>
              </div>

              <div className="stat-card group hover:border-orange-500/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="stat-label">{isRtl ? 'البلاغات المفتوحة' : 'Open Incidents'}</div>
                  <div className="p-2 rounded-lg bg-orange-50 text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                </div>
                <div className="stat-value mt-1 text-orange-600"><CountUp value={openIncidents} /></div>
                <div className="text-[12px] text-orange-500 mt-1 font-medium">
                  {isRtl ? 'تحت المعالجة' : 'Under handling'}
                </div>
              </div>

              <div className="stat-card group hover:border-indigo-500/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="stat-label">{isRtl ? 'طلبات التغيير المفتوحة' : 'Open Change Requests'}</div>
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                    <Send className="w-4 h-4" />
                  </div>
                </div>
                <div className="stat-value mt-1 text-indigo-600"><CountUp value={openChangeRequests} /></div>
                <div className="text-[12px] text-indigo-500 mt-1 font-medium">
                  {isRtl ? 'بانتظار الإجراء' : 'Awaiting action'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="table-container p-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-bold text-text-main">{t('user_performance')}</h2>
                </div>
                <div className="space-y-6">
                  {userPerformance.map(user => (
                    <div key={user.uid} className="group">
                      <div className="flex items-center gap-3 mb-2">
                        <Avatar className="w-8 h-8 border border-white shadow-sm shrink-0">
                          <AvatarImage src={resolveFileUrl(user.photoURL || '') || user.photoURL} />
                          <AvatarFallback className="text-[10px] bg-slate-100 font-bold shrink-0">
                            {user.displayName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center">
                            <span className="text-[12px] font-bold text-text-main truncate">{user.displayName}</span>
                            <span className="text-[11px] text-text-muted font-bold">{user.progress}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${user.progress}%` }}
                          className={cn(
                            'h-full rounded-full transition-all duration-1000',
                            user.progress > 80 ? 'bg-emerald-500' : user.progress > 40 ? 'bg-indigo-500' : 'bg-rose-500'
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="table-container p-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-bold text-text-main">{t('department_performance')}</h2>
                </div>
                <div className="space-y-6">
                  {deptPerformance.map(dept => (
                    <div key={dept.id} className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-text-main">{isRtl ? dept.nameAr : dept.nameEn}</span>
                        <span className="text-text-muted font-medium">{dept.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${dept.progress}%` }}
                          className={cn(
                            'h-full rounded-full',
                            dept.progress > 80 ? 'bg-emerald-500' : dept.progress > 40 ? 'bg-primary' : 'bg-amber-500'
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="table-container">
              <div className="section-header">
                <h2 className="section-title">{t('framework_progress')}</h2>
                <button className="text-[12px] text-primary font-bold hover:underline">{t('view_all_frameworks')}</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className={isRtl ? 'text-right' : 'text-left'}>{t('framework_policy')}</th>
                      <th className={isRtl ? 'text-right' : 'text-left'}>{t('progress')}</th>
                      <th className={isRtl ? 'text-right' : 'text-left'}>{t('completed')}</th>
                      <th className={isRtl ? 'text-right' : 'text-left'}>{t('status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {frameworkProgressList.map((row, idx) => (
                      <tr key={idx}>
                        <td className="font-bold">{row.name}</td>
                        <td>
                          <div className="w-[100px] h-1.5 bg-border-subtle rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${row.progress}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                              className={cn('h-full', row.progress === 100 ? 'bg-emerald-500' : 'bg-primary')}
                            />
                          </div>
                        </td>
                        <td className="text-text-muted">{row.completed}</td>
                        <td>
                          <span className={cn(
                            'badge-minimal',
                            row.badge === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          )}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-[#0f172a] rounded-3xl p-8 text-white text-center shadow-xl shadow-slate-900/20">
              <div
                className="w-[140px] h-[140px] border-[10px] rounded-full mx-auto mb-6 flex items-center justify-center text-4xl font-black transition-all duration-700"
                style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: complianceInfo.color }}
              >
                <CountUp value={globalScore} suffix="%" />
              </div>
              <div className="font-bold text-base">{t('global_compliance_score')}</div>
              <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: complianceInfo.color }} />
                <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">{complianceInfo.label}</span>
              </div>

              <div className="mt-8 pt-8 border-t border-white/10">
                <div className="flex items-center gap-2 mb-4 text-[11px] font-black uppercase tracking-widest text-slate-400">
                  <Layers className="w-3 h-3" />
                  {t('framework_selection') || (isRtl ? 'اختر إطار العمل' : 'Select Framework')}
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setSelectedFrameworkId('all')}
                    className={cn(
                      'w-full px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all text-right flex items-center justify-between',
                      selectedFrameworkId === 'all'
                        ? 'bg-primary text-white shadow-lg shadow-primary/20'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5'
                    )}
                  >
                    <span>{isRtl ? 'جميع أطر العمل' : 'All Frameworks'}</span>
                    {selectedFrameworkId === 'all' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                  {frameworks.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFrameworkId(f.id)}
                      className={cn(
                        'w-full px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all text-right flex items-center justify-between',
                        selectedFrameworkId === f.id
                          ? 'bg-primary text-white shadow-lg shadow-primary/20'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5'
                      )}
                    >
                      <span className="truncate">{isRtl ? f.nameAr : f.nameEn}</span>
                      {selectedFrameworkId === f.id && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-card rounded-3xl border border-border-subtle flex flex-col min-h-[400px] overflow-hidden">
              <div className="p-6 border-b border-border-subtle">
                <h2 className="text-sm font-bold text-text-main flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  {t('recent_activities')}
                </h2>
              </div>
              <div className="flex-1 divide-y divide-border-subtle/50">
                {activities.length > 0 ? activities.map((activity, idx) => (
                  <div key={idx} className="p-5 flex gap-4 hover:bg-slate-50 transition-colors group">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-[11px] font-bold text-slate-500 shrink-0 border border-slate-200 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                      {activity.userName.split(' ').map(n => n[0]).join('').substr(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12px] font-bold text-text-main truncate">{activity.userName}</p>
                        <span className="text-[10px] text-text-muted shrink-0">
                          {formatDistanceToNow(new Date(activity.timestamp), {
                            addSuffix: true,
                            locale: isRtl ? arSA : undefined
                          })}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-muted mt-0.5">
                        {getActionLabel(activity.action, activity.entityType)}
                      </p>
                    </div>
                  </div>
                )) : (
                  <div className="p-10 text-center space-y-3">
                    <p className="text-xs text-text-muted">{t('no_activities')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}

// ----- Commitments indicators tab -----
function CommitmentsIndicators({ isRtl, commitments, users }: { isRtl: boolean; commitments: Commitment[]; users: User[] }) {
  const stats = useMemo(() => {
    const today = new Date();
    const notifyDays = 30;
    const isExpired = (c: any) => c.status === 'expired' || (c.expiryDate && new Date(c.expiryDate) < today && c.status !== 'completed');
    const isExpiringSoon = (c: any) => {
      if (!c.expiryDate) return false;
      const diff = (new Date(c.expiryDate).getTime() - today.getTime()) / 86400000;
      return diff >= 0 && diff <= notifyDays && c.status !== 'completed';
    };
    return {
      total: commitments.length,
      active: commitments.filter(c => c.status === 'active' && !isExpired(c)).length,
      expired: commitments.filter(isExpired).length,
      expiringSoon: commitments.filter(isExpiringSoon).length,
      completed: commitments.filter(c => c.status === 'completed').length,
      withEvidence: commitments.filter(c => c.evidenceLink).length,
    };
  }, [commitments]);

  const upcoming = useMemo(() => {
    const today = new Date();
    return commitments
      .filter(c => c.status !== 'completed' && c.expiryDate && new Date(c.expiryDate) >= today)
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
      .slice(0, 6);
  }, [commitments]);

  const byOwner = useMemo(() => {
    const m = new Map<string, number>();
    commitments.forEach(c => m.set(c.responsibleUser, (m.get(c.responsibleUser) || 0) + 1));
    return Array.from(m.entries())
      .map(([uid, count]) => ({ uid, count, name: users.find(u => u.uid === uid)?.displayName || uid }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [commitments, users]);

  const KpiCard = ({ icon: Icon, label, value, color }: any) => (
    <div className="bg-white rounded-2xl border border-border-subtle p-5 flex items-center gap-4">
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', color)}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted">{label}</div>
        <div className="text-2xl font-black text-text-main"><CountUp value={value} /></div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard icon={ClipboardList} label={isRtl ? 'الإجمالي' : 'Total'} value={stats.total} color="bg-slate-100 text-slate-700" />
        <KpiCard icon={CheckCircle2} label={isRtl ? 'نشطة' : 'Active'} value={stats.active} color="bg-emerald-50 text-emerald-700" />
        <KpiCard icon={Clock} label={isRtl ? 'قاربت على الانتهاء' : 'Expiring Soon'} value={stats.expiringSoon} color="bg-amber-50 text-amber-700" />
        <KpiCard icon={AlertTriangle} label={isRtl ? 'منتهية' : 'Expired'} value={stats.expired} color="bg-rose-50 text-rose-700" />
        <KpiCard icon={CheckCircle2} label={isRtl ? 'مكتملة' : 'Completed'} value={stats.completed} color="bg-blue-50 text-blue-700" />
        <KpiCard icon={FileText} label={isRtl ? 'بأدلة' : 'With Evidence'} value={stats.withEvidence} color="bg-violet-50 text-violet-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-border-subtle p-5">
          <div className="flex items-center gap-2 mb-4 font-bold text-text-main">
            <Clock className="w-4 h-4 text-amber-500" />
            {isRtl ? 'التزامات قادمة الانتهاء' : 'Upcoming Expiries'}
          </div>
          {upcoming.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-sm">{isRtl ? 'لا توجد التزامات قادمة' : 'No upcoming commitments'}</div>
          ) : (
            <div className="space-y-2">
              {upcoming.map((c: any) => {
                const days = Math.ceil((new Date(c.expiryDate).getTime() - Date.now()) / 86400000);
                const urgent = days <= 14;
                return (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-border-subtle hover:bg-slate-50/50">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-text-main truncate">{isRtl ? c.nameAr : c.nameEn}</div>
                      <div className="text-[11px] text-text-muted">{c.expiryDate}</div>
                    </div>
                    <span className={cn('text-[11px] font-bold px-2 py-1 rounded-md', urgent ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-700')}>
                      {days} {isRtl ? 'يوم' : 'days'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-border-subtle p-5">
          <div className="flex items-center gap-2 mb-4 font-bold text-text-main">
            <UserIcon className="w-4 h-4 text-primary" />
            {isRtl ? 'أعلى المسؤولين بعدد التزامات' : 'Top Owners by Commitments'}
          </div>
          {byOwner.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-sm">{isRtl ? 'لا توجد بيانات' : 'No data'}</div>
          ) : (
            <div className="space-y-2">
              {byOwner.map(o => {
                const pct = stats.total > 0 ? Math.round((o.count / stats.total) * 100) : 0;
                return (
                  <div key={o.uid}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-text-main">{o.name}</span>
                      <span className="text-[11px] text-text-muted">{o.count}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ----- Incident indicators tab -----
function IncidentIndicators({ isRtl, incidents }: { isRtl: boolean; incidents: SecurityIncident[] }) {
  const stats = useMemo(() => {
    const today = new Date();
    return {
      total: incidents.length,
      new: incidents.filter(i => i.status === 'new').length,
      open: incidents.filter(i => i.status === 'open' || i.status === 'investigating').length,
      resolved: incidents.filter(i => i.status === 'resolved').length,
      closed: incidents.filter(i => i.status === 'closed').length,
      thisMonth: incidents.filter(i => {
        const d = new Date(i.reportedAt);
        return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
      }).length,
    };
  }, [incidents]);

  const byPriority = useMemo(() => ({
    critical: incidents.filter(i => i.priority === 'critical').length,
    high: incidents.filter(i => i.priority === 'high').length,
    medium: incidents.filter(i => i.priority === 'medium').length,
    low: incidents.filter(i => i.priority === 'low').length,
  }), [incidents]);

  const byType = useMemo(() => {
    const m = new Map<string, number>();
    incidents.forEach(i => m.set(i.type || 'other', (m.get(i.type || 'other') || 0) + 1));
    return Array.from(m.entries()).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [incidents]);

  const recent = useMemo(() => {
    return [...incidents].sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()).slice(0, 5);
  }, [incidents]);

  const KpiCard = ({ icon: Icon, label, value, color }: any) => (
    <div className="bg-white rounded-2xl border border-border-subtle p-5 flex items-center gap-4">
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', color)}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted">{label}</div>
        <div className="text-2xl font-black text-text-main"><CountUp value={value} /></div>
      </div>
    </div>
  );

  const priorityColor: Record<string, string> = {
    critical: 'bg-rose-500',
    high: 'bg-orange-500',
    medium: 'bg-amber-500',
    low: 'bg-slate-400',
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard icon={ShieldAlert} label={isRtl ? 'الإجمالي' : 'Total'} value={stats.total} color="bg-slate-100 text-slate-700" />
        <KpiCard icon={Send} label={isRtl ? 'جديد' : 'New'} value={stats.new} color="bg-blue-50 text-blue-700" />
        <KpiCard icon={Clock} label={isRtl ? 'قيد المعالجة' : 'In Progress'} value={stats.open} color="bg-amber-50 text-amber-700" />
        <KpiCard icon={CheckCircle2} label={isRtl ? 'تم الحلّ' : 'Resolved'} value={stats.resolved} color="bg-emerald-50 text-emerald-700" />
        <KpiCard icon={CheckCircle2} label={isRtl ? 'مغلق' : 'Closed'} value={stats.closed} color="bg-slate-100 text-slate-600" />
        <KpiCard icon={ClipboardList} label={isRtl ? 'هذا الشهر' : 'This Month'} value={stats.thisMonth} color="bg-violet-50 text-violet-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-border-subtle p-5">
          <div className="flex items-center gap-2 mb-4 font-bold text-text-main">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            {isRtl ? 'حسب الأهمية' : 'By Priority'}
          </div>
          <div className="space-y-3">
            {(['critical', 'high', 'medium', 'low'] as const).map(p => {
              const v = byPriority[p];
              const pct = stats.total > 0 ? Math.round((v / stats.total) * 100) : 0;
              return (
                <div key={p}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-text-main">
                      {isRtl ? ({ critical: 'حرج', high: 'عالٍ', medium: 'متوسط', low: 'منخفض' } as any)[p] : p}
                    </span>
                    <span className="text-[11px] text-text-muted">{v} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={cn('h-full transition-all', priorityColor[p])} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border-subtle p-5">
          <div className="flex items-center gap-2 mb-4 font-bold text-text-main">
            <ListChecks className="w-4 h-4 text-primary" />
            {isRtl ? 'حسب النوع' : 'By Type'}
          </div>
          {byType.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-sm">{isRtl ? 'لا توجد بيانات' : 'No data'}</div>
          ) : (
            <div className="space-y-2">
              {byType.map(({ type, count }) => {
                const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-text-main">{type}</span>
                      <span className="text-[11px] text-text-muted">{count}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border-subtle p-5">
        <div className="flex items-center gap-2 mb-4 font-bold text-text-main">
          <Clock className="w-4 h-4 text-primary" />
          {isRtl ? 'أحدث البلاغات' : 'Recent Reports'}
        </div>
        {recent.length === 0 ? (
          <div className="text-center py-8 text-text-muted text-sm">{isRtl ? 'لا توجد بلاغات' : 'No reports'}</div>
        ) : (
          <div className="space-y-2">
            {recent.map((inc: any) => (
              <div key={inc.id} className="flex items-center justify-between p-3 rounded-lg border border-border-subtle hover:bg-slate-50/50">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm text-text-main truncate">{inc.title}</div>
                  <div className="text-[11px] text-text-muted">{new Date(inc.reportedAt).toLocaleString(isRtl ? 'ar-SA' : 'en-US')}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-md text-white', priorityColor[inc.priority] || 'bg-slate-400')}>
                    {isRtl ? ({ critical: 'حرج', high: 'عالٍ', medium: 'متوسط', low: 'منخفض' } as any)[inc.priority] : inc.priority}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">{inc.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ----- Risk indicators tab -----
function RiskIndicators({ isRtl, risks, procedures }: { isRtl: boolean; risks: Risk[]; procedures: Procedure[] }) {
  const enriched = useMemo(() => risks.map(r => {
    const likelihood = getRiskLikelihood(r, procedures);
    const score = likelihood * (r.impact || 1);
    return { ...r, effectiveLikelihood: likelihood, score };
  }), [risks, procedures]);

  const stats = useMemo(() => ({
    total: enriched.length,
    veryHigh: enriched.filter(r => r.score >= 15).length,
    high: enriched.filter(r => r.score >= 9 && r.score < 15).length,
    medium: enriched.filter(r => r.score >= 4 && r.score < 9).length,
    low: enriched.filter(r => r.score < 4).length,
    avg: enriched.length > 0 ? (enriched.reduce((s, r) => s + r.score, 0) / enriched.length).toFixed(1) : '0',
  }), [enriched]);

  const top = useMemo(() => [...enriched].sort((a, b) => b.score - a.score).slice(0, 6), [enriched]);

  const KpiCard = ({ icon: Icon, label, value, color }: any) => (
    <div className="bg-white rounded-2xl border border-border-subtle p-5 flex items-center gap-4">
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', color)}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted">{label}</div>
        <div className="text-2xl font-black text-text-main">{value}</div>
      </div>
    </div>
  );

  const colorForScore = (score: number) => {
    if (score >= 15) return 'bg-rose-500';
    if (score >= 9) return 'bg-orange-500';
    if (score >= 4) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard icon={AlertTriangle} label={isRtl ? 'الإجمالي' : 'Total'} value={stats.total} color="bg-slate-100 text-slate-700" />
        <KpiCard icon={AlertTriangle} label={isRtl ? 'مرتفع جداً' : 'Very High'} value={stats.veryHigh} color="bg-rose-50 text-rose-700" />
        <KpiCard icon={AlertTriangle} label={isRtl ? 'مرتفع' : 'High'} value={stats.high} color="bg-orange-50 text-orange-700" />
        <KpiCard icon={AlertTriangle} label={isRtl ? 'متوسط' : 'Medium'} value={stats.medium} color="bg-amber-50 text-amber-700" />
        <KpiCard icon={CheckCircle2} label={isRtl ? 'منخفض' : 'Low'} value={stats.low} color="bg-emerald-50 text-emerald-700" />
        <KpiCard icon={ClipboardList} label={isRtl ? 'متوسط النقاط' : 'Avg Score'} value={stats.avg} color="bg-violet-50 text-violet-700" />
      </div>

      <div className="bg-white rounded-2xl border border-border-subtle p-5">
        <div className="flex items-center gap-2 mb-4 font-bold text-text-main">
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          {isRtl ? 'أعلى المخاطر' : 'Top Risks'}
        </div>
        {top.length === 0 ? (
          <div className="text-center py-8 text-text-muted text-sm">{isRtl ? 'لا توجد مخاطر' : 'No risks'}</div>
        ) : (
          <div className="space-y-2">
            {top.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border-subtle hover:bg-slate-50/50">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm text-text-main truncate">{isRtl ? r.nameAr : r.nameEn}</div>
                  <div className="text-[11px] text-text-muted">
                    {isRtl ? 'حدوث' : 'L'}: {r.effectiveLikelihood} × {isRtl ? 'أثر' : 'I'}: {r.impact}
                    {(r.procedureIds?.length || 0) > 0 && (
                      <span className="ml-2">• {r.procedureIds.length} {isRtl ? 'إجراء' : 'procedures'}</span>
                    )}
                  </div>
                </div>
                <span className={cn('text-white font-mono font-bold text-sm min-w-[44px] h-8 rounded-md flex items-center justify-center px-3', colorForScore(r.score))}>
                  {r.score}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}



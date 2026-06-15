import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Paperclip,
  MessageSquare,
  Edit2,
  Trash2,
  Shield,
  Layers,
  ClipboardCheck,
  Activity,
  X,
  Rows3,
  LayoutList,
  Scale
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip } from '@/components/ui/tooltip';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { mockService } from '@/services/mockService';
import { ExportMenu } from './shared/ExportMenu';
import { ProceduresImport } from './shared/ProceduresImport';
import { ProcedureFormDialog } from './shared/ProcedureFormDialog';
import { ProceduresAccordion } from './shared/ProceduresAccordion';
import { useTableSort } from './shared/useTableSort';
import { SortableTh } from './shared/SortableTh';
import { Procedure, Policy, Standard, Framework } from '@/types';
import { cn } from '@/lib/utils';

import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/AuthContext';

export default function ProceduresPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { can } = useAuth();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('id');

  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [procDialogOpen, setProcDialogOpen] = useState(false);
  const [editingProcedureId, setEditingProcedureId] = useState<string | null>(null);
  const [procParentId, setProcParentId] = useState<string | undefined>(undefined);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [importanceFilter, setImportanceFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [policyFilter, setPolicyFilter] = useState('all');
  const [standardFilter, setStandardFilter] = useState('all');
  const [frameworkFilter, setFrameworkFilter] = useState('all');
  const [users, setUsers] = useState<any[]>([]);

  const isRtl = i18n.language === 'ar';

  useEffect(() => {
    setUsers(mockService.getUsers());
    setPolicies(mockService.getPolicies());
    setStandards(mockService.getStandards());
    setFrameworks(mockService.getFrameworks());
    
    // Add some mock data if empty
    const existing = mockService.getProcedures();
    if (existing.length === 0) {
      const mockProcedures: Procedure[] = [
        {
          id: '1',
          policyId: 'p1',
          standardId: 's1',
          nameAr: 'تحديث سياسة كلمات المرور',
          nameEn: 'Update Password Policy',
          descriptionAr: 'تحديث متطلبات تعقيد كلمات المرور',
          descriptionEn: 'Update password complexity requirements',
          status: 'in_progress',
          importance: 'high',
          startDate: '2024-01-01',
          endDate: '2024-06-01',
          assignedTo: ['1'],
          assignedTeams: ['Security'],
          isPeriodic: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '2',
          policyId: 'p1',
          standardId: 's2',
          nameAr: 'مراجعة سجلات الدخول',
          nameEn: 'Review Access Logs',
          descriptionAr: 'مراجعة دورية لسجلات الدخول للأنظمة الحساسة',
          descriptionEn: 'Periodic review of access logs for sensitive systems',
          status: 'completed',
          importance: 'medium',
          startDate: '2024-02-01',
          endDate: '2024-03-01',
          assignedTo: ['1'],
          assignedTeams: ['Audit'],
          isPeriodic: true,
          frequency: 'quarterly',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ];
      mockProcedures.forEach(p => mockService.saveProcedure(p));
    }
    setProcedures(mockService.getProcedures());
  }, []);

  const handleDelete = (id: string) => {
    setIdToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (idToDelete) {
      mockService.deleteProcedure(idToDelete);
      setProcedures(mockService.getProcedures());
      setIsDeleteConfirmOpen(false);
      setIdToDelete(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="badge-minimal bg-emerald-50 text-emerald-700 flex items-center gap-1 w-fit">
          <CheckCircle2 className="w-3 h-3" /> {t('completed')}
        </span>;
      case 'in_progress':
        return <span className="badge-minimal bg-blue-50 text-blue-700 flex items-center gap-1 w-fit">
          <Clock className="w-3 h-3" /> {t('in_progress')}
        </span>;
      default:
        return <span className="badge-minimal bg-slate-100 text-slate-700 flex items-center gap-1 w-fit">
          <AlertTriangle className="w-3 h-3" /> {t('not_started')}
        </span>;
    }
  };

  const getImportanceBadge = (importance: string) => {
    switch (importance) {
      case 'high':
        return <span className="badge-minimal bg-rose-50 text-rose-700">{t('high')}</span>;
      case 'medium':
        return <span className="badge-minimal bg-amber-50 text-amber-700">{t('medium')}</span>;
      default:
        return <span className="badge-minimal bg-slate-100 text-slate-700">{t('low')}</span>;
    }
  };

  const getFrameworkIndicator = (policyId: string) => {
    const policy = policies.find(p => p.id === policyId);
    if (!policy) return null;
    const framework = frameworks.find(f => f.id === policy.frameworkId);
    if (!framework) return null;

    const frameworkIndex = frameworks.findIndex(f => f.id === framework.id);
    const colors = [
      'bg-slate-800 text-white',
      'bg-blue-700 text-white',
      'bg-emerald-700 text-white',
      'bg-purple-700 text-white',
      'bg-indigo-700 text-white',
    ];
    const color = colors[frameworkIndex % colors.length];

    return (
      <Tooltip content={isRtl ? framework.nameAr : framework.nameEn}>
        <div className={cn(
          "px-1.5 py-0.5 rounded text-[10px] font-black uppercase whitespace-nowrap",
          color
        )}>
          {isRtl ? framework.nameAr.substring(0, 3) : framework.nameEn.substring(0, 3)}
        </div>
      </Tooltip>
    );
  };

  const filteredProcedures = procedures.filter(p => {
    if (highlightId) return p.id === highlightId;
    
    const matchesSearch = p.nameAr.includes(searchTerm) || p.nameEn.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesImportance = importanceFilter === 'all' || p.importance === importanceFilter;
    const matchesUser = userFilter === 'all' || p.assignedTo.includes(userFilter);
    const matchesPolicy = policyFilter === 'all' || p.policyId === policyFilter;
    const matchesStandard = standardFilter === 'all' || p.standardId === standardFilter;
    
    const policy = policies.find(pol => pol.id === p.policyId);
    const matchesFramework = frameworkFilter === 'all' || policy?.frameworkId === frameworkFilter;

    let matchesDate = true;
    if (dateFilter !== 'all') {
      const today = new Date();
      const dueDate = new Date(p.endDate);
      const isOverdue = dueDate < today && p.status !== 'completed';
      const isThisMonth = dueDate.getMonth() === today.getMonth() && dueDate.getFullYear() === today.getFullYear();
      const isNextMonth = dueDate.getMonth() === (today.getMonth() + 1) % 12 && 
                         (dueDate.getFullYear() === today.getFullYear() || (today.getMonth() === 11 && dueDate.getFullYear() === today.getFullYear() + 1));

      if (dateFilter === 'overdue') matchesDate = isOverdue;
      else if (dateFilter === 'this_month') matchesDate = isThisMonth;
      else if (dateFilter === 'next_month') matchesDate = isNextMonth;
    }

    return matchesSearch && matchesStatus && matchesImportance && matchesUser && matchesDate && matchesPolicy && matchesStandard && matchesFramework;
  });

  // Compute hierarchical codes scoped per standard: roots are 1,2,3...,
  // sub-procedures inherit parent code (e.g. "2-1", "2-2", "2-1-1")
  const procedureCodes = React.useMemo(() => {
    const codes = new Map<string, string>();
    const byStandard = new Map<string, Procedure[]>();
    procedures.forEach((p: Procedure) => {
      if (!byStandard.has(p.standardId)) byStandard.set(p.standardId, []);
      byStandard.get(p.standardId)!.push(p);
    });
    byStandard.forEach(stdProcs => {
      const idSet = new Set(stdProcs.map(p => p.id));
      const byParent = new Map<string, Procedure[]>();
      stdProcs.forEach(p => {
        const key = p.parentId && idSet.has(p.parentId) ? p.parentId : '__root__';
        if (!byParent.has(key)) byParent.set(key, []);
        byParent.get(key)!.push(p);
      });
      byParent.forEach(arr => arr.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')));
      const walk = (parentKey: string, prefix: string) => {
        const children = byParent.get(parentKey) || [];
        children.forEach((child, idx) => {
          const code = prefix ? `${prefix}-${idx + 1}` : `${idx + 1}`;
          codes.set(child.id, code);
          walk(child.id, code);
        });
      };
      walk('__root__', '');
    });
    return codes;
  }, [procedures]);

  const childrenByParent = React.useMemo(() => {
    const map = new Map<string, Procedure[]>();
    procedures.forEach((p: Procedure) => {
      const key = p.parentId || '__root__';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    map.forEach(arr => arr.sort((a, b) => {
      const ca = procedureCodes.get(a.id) || '';
      const cb = procedureCodes.get(b.id) || '';
      return ca.localeCompare(cb, undefined, { numeric: true });
    }));
    return map;
  }, [procedures, procedureCodes]);

  const [viewMode, setViewMode] = useState<'table' | 'accordion'>('table');
  const [expandedProcIds, setExpandedProcIds] = useState<Set<string>>(new Set());
  const toggleProcExpand = (id: string) => {
    setExpandedProcIds((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const orderedFilteredProcedures = React.useMemo(() => {
    return [...filteredProcedures].sort((a, b) => {
      const oa = a.order;
      const ob = b.order;
      if (oa != null && ob != null) return oa - ob;
      if (oa != null) return -1;
      if (ob != null) return 1;
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });
  }, [filteredProcedures]);

  const { sort, toggle, sortedRows } = useTableSort();
  const sortedProcedures = sort
    ? sortedRows(orderedFilteredProcedures, (p: any, key: string) => {
    switch (key) {
      case 'name': return isRtl ? p.nameAr : p.nameEn;
      case 'framework': {
        const pol = policies.find(x => x.id === p.policyId);
        const fw = frameworks.find(f => f.id === pol?.frameworkId);
        return fw ? (isRtl ? fw.nameAr : fw.nameEn) : '';
      }
      case 'policy': return (policies.find(x => x.id === p.policyId)?.[isRtl ? 'nameAr' : 'nameEn']) || '';
      case 'standard': return (standards.find(x => x.id === p.standardId)?.[isRtl ? 'nameAr' : 'nameEn']) || '';
      case 'importance': {
        const order: Record<string, number> = { high: 3, medium: 2, low: 1 };
        return order[p.importance] || 0;
      }
      case 'status': {
        const order: Record<string, number> = { not_started: 1, in_progress: 2, completed: 3 };
        return order[p.status] || 0;
      }
      case 'endDate': return p.endDate || '';
      case 'assigned': return (p.assignedTo || []).length;
      case 'weight': return mockService.getProcedureEffectiveWeight(p.id, procedures);
      default: return '';
    }
  })
    : orderedFilteredProcedures;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-main">{t('procedures')}</h1>
          <p className="text-text-muted mt-1">{t('manage_procedures_desc')}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="inline-flex rounded-lg border border-border-subtle bg-slate-50/50 p-1">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={cn(
                'flex items-center gap-1.5 px-3 h-9 rounded-md text-[12px] font-bold transition-colors',
                viewMode === 'table' ? 'bg-white text-primary shadow-sm' : 'text-text-muted hover:text-text-main'
              )}
              title={isRtl ? 'عرض جدول' : 'Table view'}
            >
              <Rows3 className="w-4 h-4" />
              {isRtl ? 'جدول' : 'Table'}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('accordion')}
              className={cn(
                'flex items-center gap-1.5 px-3 h-9 rounded-md text-[12px] font-bold transition-colors',
                viewMode === 'accordion' ? 'bg-white text-primary shadow-sm' : 'text-text-muted hover:text-text-main'
              )}
              title={isRtl ? 'عرض أكورديون' : 'Accordion view'}
            >
              <LayoutList className="w-4 h-4" />
              {isRtl ? 'أكورديون' : 'Accordion'}
            </button>
          </div>
          {can('procedures.import') && <ProceduresImport onDone={() => setProcedures(mockService.getProcedures())} />}
          <ExportMenu
            title={isRtl ? 'الإجراءات' : 'Procedures'}
            filename="procedures"
            rows={filteredProcedures}
            columns={[
              { header: isRtl ? 'الاسم بالعربي' : 'Name (Arabic)', accessor: (p: any) => p.nameAr },
              { header: isRtl ? 'الاسم بالإنجليزي' : 'Name (English)', accessor: (p: any) => p.nameEn },
              { header: isRtl ? 'السياسة' : 'Policy', accessor: (p: any) => policies.find(x => x.id === p.policyId)?.[isRtl ? 'nameAr' : 'nameEn'] || '' },
              { header: isRtl ? 'المعيار' : 'Standard', accessor: (p: any) => standards.find(x => x.id === p.standardId)?.[isRtl ? 'nameAr' : 'nameEn'] || '' },
              { header: isRtl ? 'الحالة' : 'Status', accessor: (p: any) => t(p.status) },
              { header: isRtl ? 'الأهمية' : 'Importance', accessor: (p: any) => t(p.importance) },
              { header: isRtl ? 'الوزن' : 'Weight', accessor: (p: any) => mockService.getProcedureEffectiveWeight(p.id, procedures) },
              { header: isRtl ? 'تاريخ البداية' : 'Start Date', accessor: (p: any) => p.startDate || '' },
              { header: isRtl ? 'تاريخ الانتهاء' : 'End Date', accessor: (p: any) => p.endDate || '' },
              { header: isRtl ? 'المسند إليهم' : 'Assigned To', accessor: (p: any) => (p.assignedTo || []).map((uid: string) => users.find(u => u.uid === uid)?.displayName || uid).join(', ') },
              { header: isRtl ? 'دوري' : 'Periodic', accessor: (p: any) => p.isPeriodic ? (isRtl ? 'نعم' : 'Yes') : (isRtl ? 'لا' : 'No') }
            ]}
          />
          {can('procedures.create') && (
            <Button
              onClick={() => { setEditingProcedureId(null); setProcParentId(undefined); setProcDialogOpen(true); }}
              className="bg-primary hover:bg-primary/90 text-white font-bold px-6 h-11 rounded-lg shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('add_procedure')}
            </Button>
          )}
        </div>
      </div>

      {highlightId && (
        <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl flex items-center justify-between mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-primary">{t('filtering_by_id')}</p>
              <p className="text-xs text-text-muted">{t('viewing_single_procedure')}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/procedures')}
            className="text-primary hover:bg-primary/10 font-bold flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            {t('clear_filter')}
          </Button>
        </div>
      )}

      <div className="table-container">
        <div className="section-header">
          <div className="flex flex-wrap gap-4 w-full items-end">
            <div className="space-y-1.5 flex-1 min-w-[240px]">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider px-1">{t('search')}</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <Input 
                  className="pl-10 rounded-lg border-border-subtle bg-slate-50/50 h-11" 
                  placeholder={t('search')} 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1.5 flex-1 md:flex-none">
                <label className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider px-1 flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  {t('framework') || (isRtl ? 'إطار العمل' : 'Framework')}
                </label>
                <Select value={frameworkFilter} onValueChange={setFrameworkFilter}>
                  <SelectTrigger className="w-full md:w-[180px] rounded-lg border-2 border-indigo-200 h-11 bg-indigo-50/50 text-indigo-900 font-bold ring-offset-indigo-50 focus:ring-indigo-300 shadow-sm shadow-indigo-100">
                    <div className="flex items-center gap-2 text-indigo-900">
                      <SelectValue placeholder={t('framework')}>
                        {frameworkFilter === 'all' 
                          ? t('all_frameworks')
                          : (frameworks.find(f => f.id === frameworkFilter)?.[isRtl ? 'nameAr' : 'nameEn'])}
                      </SelectValue>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('all_frameworks')}</SelectItem>
                    {frameworks.map(f => (
                      <SelectItem key={f.id} value={f.id}>{isRtl ? f.nameAr : f.nameEn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 flex-1 md:flex-none">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider px-1">{t('policy')}</label>
                <Select value={policyFilter} onValueChange={setPolicyFilter}>
                  <SelectTrigger className="w-full md:w-[180px] rounded-lg border-border-subtle h-11 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-text-muted" />
                      <SelectValue placeholder={t('policy')}>
                        {policyFilter === 'all'
                          ? t('all_policies')
                          : (policies.find(p => p.id === policyFilter)?.[isRtl ? 'nameAr' : 'nameEn'])}
                      </SelectValue>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('all_policies')}</SelectItem>
                    {policies.map(p => (
                      <SelectItem key={p.id} value={p.id}>{isRtl ? p.nameAr : p.nameEn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 flex-1 md:flex-none">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider px-1">{t('standard')}</label>
                <Select value={standardFilter} onValueChange={setStandardFilter}>
                  <SelectTrigger className="w-full md:w-[180px] rounded-lg border-border-subtle h-11 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <ClipboardCheck className="w-4 h-4 text-text-muted" />
                      <SelectValue>
                        {standardFilter === 'all'
                          ? (t('all_standards') || 'All Standards')
                          : (standards.find(s => s.id === standardFilter)?.[isRtl ? 'nameAr' : 'nameEn'])}
                      </SelectValue>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('all_standards') || 'All Standards'}</SelectItem>
                    {standards.map(s => (
                      <SelectItem key={s.id} value={s.id}>{isRtl ? s.nameAr : s.nameEn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 flex-1 md:flex-none">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider px-1">{t('status')}</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[150px] rounded-lg border-border-subtle h-11 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-text-muted" />
                      <SelectValue placeholder={t('status')}>
                        {statusFilter === 'all' ? t('all_statuses') : t(statusFilter)}
                      </SelectValue>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('all_statuses')}</SelectItem>
                    <SelectItem value="not_started">{t('not_started')}</SelectItem>
                    <SelectItem value="in_progress">{t('in_progress')}</SelectItem>
                    <SelectItem value="completed">{t('completed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 flex-1 md:flex-none">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider px-1">{t('importance')}</label>
                <Select value={importanceFilter} onValueChange={setImportanceFilter}>
                  <SelectTrigger className="w-full md:w-[150px] rounded-lg border-border-subtle h-11 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-text-muted" />
                      <SelectValue placeholder={t('importance')}>
                        {importanceFilter === 'all' ? t('all_importance') : t(importanceFilter)}
                      </SelectValue>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('all_importance')}</SelectItem>
                    <SelectItem value="high">{t('high')}</SelectItem>
                    <SelectItem value="medium">{t('medium')}</SelectItem>
                    <SelectItem value="low">{t('low')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 flex-1 md:flex-none">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider px-1">{t('date')}</label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-full md:w-[150px] rounded-lg border-border-subtle h-11 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-text-muted" />
                      <SelectValue placeholder={t('date')}>
                        {dateFilter === 'all' ? t('all_dates') : t(dateFilter)}
                      </SelectValue>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('all_dates')}</SelectItem>
                    <SelectItem value="overdue">{t('overdue')}</SelectItem>
                    <SelectItem value="this_month">{t('due_this_month')}</SelectItem>
                    <SelectItem value="next_month">{t('due_next_month')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 flex-1 md:flex-none">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider px-1">{t('assigned_to')}</label>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger className="w-full md:w-[160px] rounded-lg border-border-subtle h-11 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-text-muted" />
                      <SelectValue>
                        {userFilter === 'all' ? t('all_users') : (users.find(u => u.uid === userFilter)?.displayName || userFilter)}
                      </SelectValue>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('all_users')}</SelectItem>
                    {users.map(u => (
                      <SelectItem key={u.uid} value={u.uid}>{u.displayName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
        {viewMode === 'accordion' ? (
          <ProceduresAccordion
            roots={filteredProcedures.filter(p => !p.parentId || !procedures.find(x => x.id === p.parentId)).sort((a, b) => {
              const ca = procedureCodes.get(a.id) || '';
              const cb = procedureCodes.get(b.id) || '';
              return ca.localeCompare(cb, undefined, { numeric: true });
            })}
            childrenByParent={childrenByParent}
            expandedIds={expandedProcIds}
            toggleExpand={toggleProcExpand}
            procedureCodes={procedureCodes}
            isRtl={isRtl}
            t={t}
            policies={policies}
            standards={standards}
            users={users}
            onAddSub={(parentId) => { setEditingProcedureId(null); setProcParentId(parentId); setProcDialogOpen(true); }}
            onEdit={(id) => { setEditingProcedureId(id); setProcParentId(undefined); setProcDialogOpen(true); }}
            onDelete={handleDelete}
            getStatusBadge={getStatusBadge}
            getImportanceBadge={getImportanceBadge}
            can={can}
          />
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-center w-[80px]">#</th>
                <SortableTh sortKey="name" sort={sort} onToggle={toggle} className={isRtl ? "text-right" : "text-left"}>{t('procedure_name')}</SortableTh>
                <SortableTh sortKey="framework" sort={sort} onToggle={toggle} className={isRtl ? "text-right" : "text-left"}>{t('framework') || (isRtl ? 'إطار العمل' : 'Framework')}</SortableTh>
                <SortableTh sortKey="policy" sort={sort} onToggle={toggle} className={isRtl ? "text-right" : "text-left"}>{t('policy')}</SortableTh>
                <SortableTh sortKey="standard" sort={sort} onToggle={toggle} className={isRtl ? "text-right" : "text-left"}>{t('standard')}</SortableTh>
                <SortableTh sortKey="importance" sort={sort} onToggle={toggle} className={isRtl ? "text-right" : "text-left"}>{t('importance')}</SortableTh>
                <SortableTh sortKey="status" sort={sort} onToggle={toggle} className={isRtl ? "text-right" : "text-left"}>{t('status')}</SortableTh>
                <SortableTh sortKey="weight" sort={sort} onToggle={toggle} className={isRtl ? "text-right" : "text-left"}>{isRtl ? 'الوزن' : 'Weight'}</SortableTh>
                <SortableTh sortKey="endDate" sort={sort} onToggle={toggle} className={isRtl ? "text-right" : "text-left"}>{t('end_date')}</SortableTh>
                <SortableTh sortKey="assigned" sort={sort} onToggle={toggle} className={isRtl ? "text-right" : "text-left"}>{t('assigned_to')}</SortableTh>
                <th className={isRtl ? "text-left" : "text-right"}>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedProcedures.length > 0 ? (
                sortedProcedures.map((proc: any, idx: number) => {
                  const policy = policies.find(p => p.id === proc.policyId);
                  const standard = standards.find(s => s.id === proc.standardId);
                  return (
                    <tr key={proc.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="text-center">
                        <span className="inline-flex items-center justify-center min-w-[36px] h-7 px-2 rounded-md bg-primary/10 text-primary font-mono font-bold text-[12px] whitespace-nowrap">
                          {procedureCodes.get(proc.id) || idx + 1}
                        </span>
                      </td>
                      <td className="max-w-[250px]">
                        <div>
                          <Tooltip content={isRtl ? proc.nameAr : proc.nameEn}>
                            <p className="font-bold text-text-main truncate cursor-help">{isRtl ? proc.nameAr : proc.nameEn}</p>
                          </Tooltip>
                          {(isRtl ? proc.descriptionAr : proc.descriptionEn) && (
                            <Tooltip content={isRtl ? proc.descriptionAr : proc.descriptionEn}>
                              <p className="text-[11px] text-text-muted mt-0.5 tracking-tight line-clamp-1 cursor-help opacity-75">
                                {isRtl ? proc.descriptionAr : proc.descriptionEn}
                              </p>
                            </Tooltip>
                          )}
                        </div>
                      </td>
                      <td>
                        {getFrameworkIndicator(proc.policyId)}
                      </td>
                      <td>
                        <div className="text-[12px] font-medium text-text-muted">
                          {policy ? (isRtl ? policy.nameAr : policy.nameEn) : '---'}
                        </div>
                      </td>
                      <td>
                        <div className="text-[12px] font-medium text-text-muted">
                          {standard ? (isRtl ? standard.nameAr : standard.nameEn) : '---'}
                        </div>
                      </td>
                      <td>{getImportanceBadge(proc.importance)}</td>
                      <td>{getStatusBadge(proc.status)}</td>
                      <td>
                        {(() => {
                          const hasChildren = procedures.some(c => c.parentId === proc.id);
                          const w = mockService.getProcedureEffectiveWeight(proc.id, procedures);
                          return (
                            <div
                              className={cn(
                                'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border',
                                hasChildren
                                  ? 'bg-violet-50 text-violet-700 border-violet-100'
                                  : 'bg-amber-50 text-amber-700 border-amber-100'
                              )}
                              title={hasChildren
                                ? (isRtl ? 'وزن محسوب من الأبناء' : 'Computed from children')
                                : (isRtl ? 'وزن الإجراء' : 'Procedure weight')}
                            >
                              <Scale className="w-3 h-3" />
                              {w}
                              {hasChildren && <span className="opacity-70">∑</span>}
                            </div>
                          );
                        })()}
                      </td>
                    <td>
                      <div className="flex items-center gap-2 text-[13px] text-text-muted font-medium">
                        <Calendar className="w-4 h-4" />
                        {proc.endDate}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {proc.assignedTo.map((uid, idx) => {
                          const u = users.find(x => x.uid === uid);
                          const name = u?.displayName || uid;
                          const initials = (u?.displayName || uid).trim().split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase();
                          return (
                            <div key={idx} className="flex items-center gap-1.5" title={name}>
                              <div className="w-7 h-7 rounded-full bg-blue-50 border-2 border-white flex items-center justify-center text-[10px] font-bold text-blue-700 shadow-sm shrink-0">
                                {initials || '?'}
                              </div>
                              <span className="text-[12px] font-medium text-text-main max-w-[120px] truncate">{name}</span>
                            </div>
                          );
                        })}
                        {proc.assignedTo.length === 0 && (
                          <span className="text-[12px] text-text-muted">—</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className={cn("flex", isRtl ? "justify-start" : "justify-end")}>
                        <div className="inline-flex items-center rounded-lg border border-border-subtle bg-white shadow-sm overflow-hidden divide-x divide-border-subtle rtl:divide-x-reverse">
                          {can('procedures.add_sub') && (
                            <button
                              type="button"
                              title={isRtl ? 'إضافة إجراء فرعي' : 'Add sub-procedure'}
                              onClick={() => { setEditingProcedureId(null); setProcParentId(proc.id); setProcDialogOpen(true); }}
                              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50/60 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          )}
                          {can('procedures.edit') && (
                            <button
                              type="button"
                              title={t('edit')}
                              onClick={() => { setEditingProcedureId(proc.id); setProcParentId(undefined); setProcDialogOpen(true); }}
                              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50/60 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {can('procedures.evidence.view') && (
                            <button
                              type="button"
                              title={t('evidence')}
                              onClick={() => navigate(`/procedures/${proc.id}/evidence`)}
                              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50/60 transition-colors"
                            >
                              <Paperclip className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            title={t('comments')}
                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50/60 transition-colors"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          {can('procedures.delete') && (
                            <button
                              type="button"
                              title={t('delete')}
                              onClick={() => handleDelete(proc.id)}
                              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50/60 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
              ) : (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-text-muted font-medium">
                    {t('no_data')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-rose-600">
              <AlertCircle className="w-5 h-5" />
              {t('confirm_delete') || 'Confirm Delete'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-text-main font-medium">
              {t('confirm_delete_procedure_desc') || 'Are you sure you want to delete this procedure? This action cannot be undone.'}
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsDeleteConfirmOpen(false)} className="font-bold">
              {t('cancel')}
            </Button>
            <Button onClick={handleConfirmDelete} className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-6">
              {t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProcedureFormDialog
        open={procDialogOpen}
        procedureId={editingProcedureId}
        parentId={procParentId}
        onSaved={() => setProcedures(mockService.getProcedures())}
        onClose={() => setProcDialogOpen(false)}
      />
    </div>
  );
}

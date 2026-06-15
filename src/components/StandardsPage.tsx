import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Filter,
  Layers,
  FileText,
  Shield,
  ArrowRight,
  Settings,
  X,
  Tag,
  Briefcase,
  CheckCircle2,
  Clock,
  Calendar,
  Activity,
  ClipboardCheck,
  Zap,
  RefreshCw,
  Info,
  AlertCircle,
  User,
  Save,
  Target,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { mockService, getStandardItemIds } from '@/services/mockService';
import { ExportMenu } from './shared/ExportMenu';
import { useTableSort } from './shared/useTableSort';
import { SortableTh } from './shared/SortableTh';
import { StandardsImport } from './shared/StandardsImport';
import { StandardFormDialog } from './shared/StandardFormDialog';
import { Pagination, usePagination } from './shared/Pagination';
import { Standard, Policy, StandardClassification, PolicyItem, Procedure, Framework } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/tooltip';
import { useAuth } from '@/AuthContext';

export default function StandardsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRtl = i18n.language === 'ar';
  const { can } = useAuth();

  const [standards, setStandards] = useState<Standard[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleteClassConfirmOpen, setIsDeleteClassConfirmOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);
  const [idToConfirmDeleteClass, setIdToConfirmDeleteClass] = useState<string | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [items, setItems] = useState<PolicyItem[]>([]);
  const [classifications, setClassifications] = useState<StandardClassification[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [policyFilter, setPolicyFilter] = useState('all');
  const [frameworkFilter, setFrameworkFilter] = useState('all');
  const [itemFilter, setItemFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [detailDialog, setDetailDialog] = useState<{ type: 'items' | 'procedures'; standard: Standard } | null>(null);

  // Standard form dialog
  const [standardDialogOpen, setStandardDialogOpen] = useState(false);
  const [editingStandardId, setEditingStandardId] = useState<string | null>(null);

  // Classification management state
  const [isClassDialogOpen, setIsClassDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Partial<StandardClassification> | null>(null);

  // Standard detail state
  const [selectedStandard, setSelectedStandard] = useState<Standard | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Quick Add Procedure state
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddData, setQuickAddData] = useState({
    nameAr: '',
    nameEn: '',
    descriptionAr: '',
    descriptionEn: '',
    status: 'not_started',
    importance: 'medium',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    assignedTo: [] as string[],
    isPeriodic: false,
    frequency: 'annual' as any,
  });

  useEffect(() => {
    setStandards(mockService.getStandards());
    setPolicies(mockService.getPolicies());
    setItems(mockService.getPolicyItems());
    setFrameworks(mockService.getFrameworks());
    setClassifications(mockService.getStandardClassifications());
    setUsers(mockService.getUsers());
    setProcedures(mockService.getProcedures());
  }, []);

  const handleDelete = (id: string) => {
    const standardProcedures = procedures.filter(p => p.standardId === id);
    if (standardProcedures.length > 0) {
      toast.error(t('cannot_delete_standard_procedures') || 'Cannot delete standard because it has associated procedures');
      return;
    }
    setIdToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (idToDelete) {
      mockService.deleteStandard(idToDelete);
      setStandards(mockService.getStandards());
      setIsDeleteConfirmOpen(false);
      setIdToDelete(null);
      toast.success(t('standard_deleted_success'));
    }
  };

  const handleQuickSaveProcedure = () => {
    if (!selectedStandard) return;
    if (!quickAddData.nameAr || !quickAddData.nameEn) {
      toast.error(t('fill_required_fields'));
      return;
    }

    const procedure = {
      id: Math.random().toString(36).substr(2, 9),
      ...quickAddData,
      policyId: selectedStandard.policyId,
      standardId: selectedStandard.id,
      assignedTeams: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockService.saveProcedure(procedure as any);
    toast.success(t('procedure_added_success') || 'Procedure added successfully');
    setIsQuickAddOpen(false);
    // Refresh data to show updated progress and counts
    setStandards(mockService.getStandards());
    setProcedures(mockService.getProcedures());
  };

  const handleSaveClass = () => {
    if (!editingClass?.nameAr || !editingClass?.nameEn) {
      toast.error(t('fill_required_fields'));
      return;
    }

    const classification: StandardClassification = {
      id: editingClass.id || Math.random().toString(36).substr(2, 9),
      nameAr: editingClass.nameAr,
      nameEn: editingClass.nameEn,
      createdAt: editingClass.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockService.saveStandardClassification(classification);
    setClassifications(mockService.getStandardClassifications());
    setEditingClass(null);
    toast.success(editingClass.id ? t('classification_updated_success') : t('classification_added_success'));
  };

  const handleDeleteClass = (id: string) => {
    setIdToConfirmDeleteClass(id);
    setIsDeleteClassConfirmOpen(true);
  };

  const handleConfirmDeleteClass = () => {
    if (idToConfirmDeleteClass) {
      mockService.deleteStandardClassification(idToConfirmDeleteClass);
      setClassifications(mockService.getStandardClassifications());
      setIsDeleteClassConfirmOpen(false);
      setIdToConfirmDeleteClass(null);
      toast.success(t('classification_deleted_success'));
    }
  };

  const filteredStandards = standards.filter(s => {
    const matchesSearch = (s.nameAr + s.nameEn).toLowerCase().includes(searchTerm.toLowerCase());
    
    // Logic to find frameworkId from policyId
    const policy = policies.find(p => p.id === s.policyId);
    const frameworkId = policy?.frameworkId;
    
    const matchesFramework = frameworkFilter === 'all' || frameworkId === frameworkFilter;
    const matchesPolicy = policyFilter === 'all' || s.policyId === policyFilter;
    const matchesItem = itemFilter === 'all' || getStandardItemIds(s).includes(itemFilter);
    const matchesClass = classFilter === 'all' || (s.classifications || []).includes(classFilter);
    
    return matchesSearch && matchesFramework && matchesPolicy && matchesItem && matchesClass;
  });

  // Default order: by `order` field (manual sort), fallback to createdAt
  const orderedFilteredStandards = React.useMemo(() => {
    return [...filteredStandards].sort((a, b) => {
      const oa = a.order;
      const ob = b.order;
      if (oa != null && ob != null) return oa - ob;
      if (oa != null) return -1;
      if (ob != null) return 1;
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });
  }, [filteredStandards]);

  const { sort, toggle, sortedRows } = useTableSort();
  const sortedStandards = sort
    ? sortedRows(orderedFilteredStandards, (s: any, key: string) => {
    switch (key) {
      case 'name': return isRtl ? s.nameAr : s.nameEn;
      case 'framework': {
        const pol = policies.find(p => p.id === s.policyId);
        const fw = frameworks.find(f => f.id === pol?.frameworkId);
        return fw ? (isRtl ? fw.nameAr : fw.nameEn) : '';
      }
      case 'policy': return (policies.find(p => p.id === s.policyId)?.[isRtl ? 'nameAr' : 'nameEn']) || '';
      case 'progress': return mockService.getStandardProgress(s.id);
      case 'item': return getStandardItemIds(s).length;
      case 'classifications': return (s.classifications || []).length;
      default: return '';
    }
  })
    : orderedFilteredStandards;

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

  const getPolicyName = (policyId: string) => {
    const policy = policies.find(p => p.id === policyId);
    return policy ? (isRtl ? policy.nameAr : policy.nameEn) : '---';
  };

  const getItemName = (itemId?: string) => {
    if (!itemId) return '---';
    const item = items.find(i => i.id === itemId);
    if (!item) return '---';
    const name = isRtl ? item.nameAr : item.nameEn;
    const code = getItemCode(item, items);
    return `${code} - ${name}`;
  };

  const itemCodes = React.useMemo(() => {
    const codes = new Map<string, string>();
    const byPolicy = new Map<string, PolicyItem[]>();
    items.forEach((it: PolicyItem) => {
      if (!byPolicy.has(it.policyId)) byPolicy.set(it.policyId, []);
      byPolicy.get(it.policyId)!.push(it);
    });

    byPolicy.forEach(policyItems => {
      const idSet = new Set(policyItems.map(i => i.id));
      const byParent = new Map<string, PolicyItem[]>();
      policyItems.forEach(it => {
        const key = it.parentId && idSet.has(it.parentId) ? it.parentId : '__root__';
        if (!byParent.has(key)) byParent.set(key, []);
        byParent.get(key)!.push(it);
      });
      byParent.forEach(arr => arr.sort((a, b) => {
        const oa = a.order ?? 0;
        const ob = b.order ?? 0;
        if (oa !== ob) return oa - ob;
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      }));
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
  }, [items]);

  const getItemCode = (item: PolicyItem, _allItems?: PolicyItem[]): string => {
    return itemCodes.get(item.id) || '';
  };

  const { page, setPage, pageSize, setPageSize, paginate } = usePagination(sortedStandards.length);
  const pagedStandards = paginate(sortedStandards);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-main">{t('standards')}</h1>
          <p className="text-text-muted mt-1">{t('manage_standards_desc')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={isClassDialogOpen} onOpenChange={setIsClassDialogOpen}>
            <DialogTrigger render={<Button variant="outline" className="rounded-lg border-border-subtle h-11 px-6 font-bold flex items-center gap-2" />}>
              <Settings className="w-4 h-4" />
              {t('manage_classifications')}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] rounded-xl border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">{t('manage_classifications')}</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Add/Edit Form */}
                <div className="bg-slate-50 p-4 rounded-xl space-y-4 border border-border-subtle">
                  <h3 className="text-sm font-bold text-text-main">
                    {editingClass?.id ? t('edit_classification') : t('add_classification')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{t('name_ar')} <span className="text-red-500">*</span></label>
                      <Input 
                        value={editingClass?.nameAr || ''} 
                        onChange={e => setEditingClass({...editingClass, nameAr: e.target.value})}
                        placeholder={t('name_ar')}
                        className="rounded-lg border-border-subtle h-10 bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{t('name_en')} <span className="text-red-500">*</span></label>
                      <Input 
                        value={editingClass?.nameEn || ''} 
                        onChange={e => setEditingClass({...editingClass, nameEn: e.target.value})}
                        placeholder={t('name_en')}
                        className="rounded-lg border-border-subtle h-10 bg-white"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    {editingClass && (
                      <Button variant="ghost" size="sm" onClick={() => setEditingClass(null)} className="h-9">
                        {t('cancel')}
                      </Button>
                    )}
                    <Button onClick={handleSaveClass} size="sm" className="bg-primary hover:bg-primary/90 text-white h-9 px-6">
                      {editingClass?.id ? t('save') : t('add')}
                    </Button>
                  </div>
                </div>

                {/* List */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {classifications.length === 0 ? (
                    <p className="text-center py-8 text-text-muted text-sm italic">{t('no_data')}</p>
                  ) : (
                    classifications.map(c => (
                      <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-border-subtle hover:bg-slate-50 transition-colors group">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-text-main">{isRtl ? c.nameAr : c.nameEn}</span>
                          <span className="text-[11px] text-text-muted">{isRtl ? c.nameEn : c.nameAr}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" onClick={() => setEditingClass(c)} className="h-8 w-8 text-blue-600 hover:bg-blue-50">
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteClass(c.id)} className="h-8 w-8 text-rose-600 hover:bg-rose-50">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {can('standards.import') && <StandardsImport onDone={() => setStandards(mockService.getStandards())} />}
          <ExportMenu
            title={isRtl ? 'المعايير' : 'Standards'}
            filename="standards"
            rows={filteredStandards}
            columns={[
              { header: isRtl ? 'الاسم بالعربي' : 'Name (Arabic)', accessor: (s: any) => s.nameAr },
              { header: isRtl ? 'الاسم بالإنجليزي' : 'Name (English)', accessor: (s: any) => s.nameEn },
              { header: isRtl ? 'السياسة' : 'Policy', accessor: (s: any) => getPolicyName(s.policyId) },
              { header: isRtl ? 'البنود المرتبطة' : 'Linked Items', accessor: (s: any) => getStandardItemIds(s).map((id: string) => getItemName(id)).filter(Boolean).join(' • ') },
              { header: isRtl ? 'عدد البنود' : 'Items Count', accessor: (s: any) => getStandardItemIds(s).length },
              { header: isRtl ? 'التصنيفات' : 'Classifications', accessor: (s: any) => (s.classifications || []).map((cid: string) => classifications.find(c => c.id === cid)?.[isRtl ? 'nameAr' : 'nameEn']).filter(Boolean).join(', ') },
              { header: isRtl ? 'الإجراءات' : 'Procedures', accessor: (s: any) => procedures.filter((p: any) => p.standardId === s.id).length },
              { header: isRtl ? 'نسبة الالتزام %' : 'Progress %', accessor: (s: any) => `${mockService.getStandardProgress(s.id)}%` }
            ]}
          />
          {can('standards.create') && (
            <Button
              onClick={() => { setEditingStandardId(null); setStandardDialogOpen(true); }}
              className="bg-primary hover:bg-primary/90 text-white font-bold px-6 h-11 rounded-lg shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('add_standard')}
            </Button>
          )}
        </div>
      </div>

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
                  <SelectTrigger className="w-full md:w-[200px] rounded-lg border-2 border-indigo-200 h-11 bg-indigo-50/50 text-indigo-900 font-bold ring-offset-indigo-50 focus:ring-indigo-300 shadow-sm shadow-indigo-100">
                    <div className="flex items-center gap-2">
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
                  <SelectTrigger className="w-full md:w-[200px] rounded-lg border-border-subtle h-11 bg-slate-50/50">
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
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider px-1">{t('policy_items')}</label>
                <Select value={itemFilter} onValueChange={setItemFilter}>
                  <SelectTrigger className="w-full md:w-[200px] rounded-lg border-border-subtle h-11 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <ClipboardCheck className="w-4 h-4 text-text-muted" />
                      <SelectValue placeholder={t('policy_items')}>
                        {itemFilter === 'all'
                          ? t('all_items')
                          : getItemName(itemFilter)}
                      </SelectValue>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('all_items')}</SelectItem>
                    {items.map(i => (
                      <SelectItem key={i.id} value={i.id}>{isRtl ? i.nameAr : i.nameEn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 flex-1 md:flex-none">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider px-1">{t('classifications')}</label>
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger className="w-full md:w-[200px] rounded-lg border-border-subtle h-11 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-text-muted" />
                      <SelectValue placeholder={t('classifications')}>
                        {classFilter === 'all'
                          ? t('all')
                          : (classifications.find(c => c.id === classFilter)?.[isRtl ? 'nameAr' : 'nameEn'])}
                      </SelectValue>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('all')}</SelectItem>
                    {classifications.map(c => (
                      <SelectItem key={c.id} value={c.id}>{isRtl ? c.nameAr : c.nameEn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-center w-[60px]">#</th>
                <SortableTh sortKey="name" sort={sort} onToggle={toggle} className={cn(isRtl ? "text-right" : "text-left")}>{t('standard_name')}</SortableTh>
                <SortableTh sortKey="framework" sort={sort} onToggle={toggle} className={cn(isRtl ? "text-right" : "text-left")}>{t('framework') || (isRtl ? 'إطار العمل' : 'Framework')}</SortableTh>
                <SortableTh sortKey="policy" sort={sort} onToggle={toggle} className={cn(isRtl ? "text-right" : "text-left")}>{t('policy')}</SortableTh>
                <SortableTh sortKey="progress" sort={sort} onToggle={toggle} className={cn(isRtl ? "text-right" : "text-left")}>{t('progress')}</SortableTh>
                <SortableTh sortKey="item" sort={sort} onToggle={toggle} className={cn(isRtl ? "text-right" : "text-left")}>{t('item')}</SortableTh>
                <SortableTh sortKey="classifications" sort={sort} onToggle={toggle} className={cn(isRtl ? "text-right" : "text-left")}>{t('classifications')}</SortableTh>
                <th className="text-center w-[120px]">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredStandards.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-text-muted">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    {t('no_standards_found')}
                  </td>
                </tr>
              ) : (
                pagedStandards.map((standard: any, idx: number) => (
                  <tr key={standard.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="text-center py-4">
                      <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-md bg-slate-100 text-slate-700 font-mono font-bold text-[12px]">
                        {(page - 1) * pageSize + idx + 1}
                      </span>
                    </td>
                    <td className="py-4 max-w-[300px]">
                        <div className="flex flex-col min-w-0">
                          <Tooltip content={isRtl ? standard.nameAr : standard.nameEn}>
                            <div 
                              className="font-bold text-text-main cursor-pointer hover:text-primary transition-colors flex items-center gap-2 group/name truncate"
                              onClick={() => {
                                setSelectedStandard(standard);
                                setIsDetailDialogOpen(true);
                              }}
                            >
                              <Briefcase className="w-4 h-4 text-text-muted shrink-0 group-hover/name:text-primary transition-colors" />
                              <span className="truncate">{isRtl ? standard.nameAr : standard.nameEn}</span>
                            </div>
                          </Tooltip>
                          
                          {/* Procedure Stats */}
                          <div className="flex items-center gap-1.5 mt-1.5 ml-6 rtl:ml-0 rtl:mr-6 shrink-0 flex-wrap">
                            {(() => {
                              const linkedItemsCount = getStandardItemIds(standard).length;
                              return (
                                <button
                                  type="button"
                                  onClick={() => setDetailDialog({ type: 'items', standard })}
                                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-violet-50 hover:bg-violet-100 text-[9px] font-bold text-violet-600 border border-violet-100 hover:border-violet-300 transition-colors cursor-pointer"
                                  title={isRtl ? 'عرض البنود المرتبطة' : 'View linked items'}
                                >
                                  <FileText className="w-2.5 h-2.5" />
                                  {linkedItemsCount} {isRtl ? 'بند' : 'items'}
                                </button>
                              );
                            })()}
                            {(() => {
                              const standardProcedures = procedures.filter(p => p.standardId === standard.id);
                              const completedCount = standardProcedures.filter(p => p.status === 'completed').length;
                              const pendingCount = standardProcedures.length - completedCount;

                              if (standardProcedures.length === 0) return null;

                              return (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setDetailDialog({ type: 'procedures', standard })}
                                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-[9px] font-bold text-blue-600 border border-blue-100 hover:border-blue-300 transition-colors cursor-pointer"
                                    title={isRtl ? 'عرض الإجراءات' : 'View procedures'}
                                  >
                                    <Activity className="w-2.5 h-2.5" />
                                    {standardProcedures.length}
                                  </button>
                                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-[9px] font-bold text-emerald-600 border border-emerald-100" title={t('completed') || 'Completed'}>
                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                    {completedCount}
                                  </div>
                                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-[9px] font-bold text-amber-600 border border-amber-100" title={t('pending') || 'Pending'}>
                                    <Clock className="w-2.5 h-2.5" />
                                    {pendingCount}
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                    </td>
                    <td>
                      {getFrameworkIndicator(standard.policyId)}
                    </td>
                    <td>
                      <div className="flex items-center gap-2 text-text-muted">
                        <Shield className="w-3.5 h-3.5" />
                        {getPolicyName(standard.policyId)}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-border-subtle rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full transition-all duration-500", mockService.getStandardProgress(standard.id) === 100 ? "bg-emerald-500" : "bg-primary")}
                            style={{ width: `${mockService.getStandardProgress(standard.id)}%` }}
                          ></div>
                        </div>
                        <span className="text-[10px] font-bold text-text-main">{mockService.getStandardProgress(standard.id)}%</span>
                      </div>
                    </td>
                    <td>
                      <div className="text-[12px] font-medium text-text-muted">
                        {(() => {
                          const ids = getStandardItemIds(standard);
                          if (ids.length === 0) return '—';
                          if (ids.length === 1) return getItemName(ids[0]);
                          return `${getItemName(ids[0])} +${ids.length - 1}`;
                        })()}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {(standard.classifications || []).map(classId => {
                          const cls = classifications.find(c => c.id === classId);
                          if (!cls) return null;
                          return (
                            <span key={classId} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                              {isRtl ? cls.nameAr : cls.nameEn}
                            </span>
                          );
                        })}
                        {(!standard.classifications || standard.classifications.length === 0) && (
                          <span className="text-text-muted text-[10px]">---</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center justify-center">
                        <div className="inline-flex items-center rounded-lg border border-border-subtle bg-white shadow-sm overflow-hidden divide-x divide-border-subtle rtl:divide-x-reverse">
                          {can('procedures.create') && (
                            <button
                              type="button"
                              title={t('quick_add_procedure')}
                              onClick={() => {
                                setSelectedStandard(standard);
                                setQuickAddData({
                                  nameAr: '',
                                  nameEn: '',
                                  descriptionAr: '',
                                  descriptionEn: '',
                                  status: 'not_started',
                                  importance: 'medium',
                                  startDate: new Date().toISOString().split('T')[0],
                                  endDate: new Date().toISOString().split('T')[0],
                                  assignedTo: [],
                                  isPeriodic: false,
                                  frequency: 'annual',
                                });
                                setIsQuickAddOpen(true);
                              }}
                              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50/60 transition-colors"
                            >
                              <Zap className="w-4 h-4" />
                            </button>
                          )}
                          {can('standards.edit') && (
                            <button
                              type="button"
                              title={t('edit')}
                              onClick={() => { setEditingStandardId(standard.id); setStandardDialogOpen(true); }}
                              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50/60 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {can('standards.delete') && (
                            <button
                              type="button"
                              title={t('delete')}
                              onClick={() => handleDelete(standard.id)}
                              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50/60 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          total={sortedStandards.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Standard Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto rounded-2xl border-none shadow-2xl p-0">
          {selectedStandard && (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-6 bg-slate-900 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <div className="relative z-10">
                  <h2 className="text-2xl font-bold mb-2">
                    {isRtl ? selectedStandard.nameAr : selectedStandard.nameEn}
                  </h2>
                  <div className="flex flex-wrap gap-4 text-white/70 text-sm">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-primary" />
                      {getPolicyName(selectedStandard.policyId)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Accordion: Objective / Linked Items / Potential Risks */}
              <div className="px-6 pt-6 space-y-2">
                <details className="group bg-white border border-border-subtle rounded-xl overflow-hidden" open>
                  <summary className="cursor-pointer list-none flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                        <Target className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-text-main">{isRtl ? 'الهدف' : 'Objective'}</span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-text-muted transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="p-4 pt-0 space-y-3 text-[13px]">
                    {selectedStandard.descriptionAr && (
                      <div dir="rtl" className="bg-slate-50 rounded-lg p-3 leading-relaxed text-slate-700">
                        {selectedStandard.descriptionAr}
                      </div>
                    )}
                    {selectedStandard.descriptionEn && (
                      <div dir="ltr" className="bg-slate-50 rounded-lg p-3 leading-relaxed text-slate-700">
                        {selectedStandard.descriptionEn}
                      </div>
                    )}
                    {!selectedStandard.descriptionAr && !selectedStandard.descriptionEn && (
                      <p className="text-text-muted text-[12px] italic">{isRtl ? 'لا يوجد هدف محدد' : 'No objective set'}</p>
                    )}
                  </div>
                </details>

                <details className="group bg-white border border-border-subtle rounded-xl overflow-hidden">
                  <summary className="cursor-pointer list-none flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600">
                        <ClipboardCheck className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-text-main">{isRtl ? 'البنود المرتبطة' : 'Linked Items'}</span>
                      {(() => {
                        const c = getStandardItemIds(selectedStandard).length;
                        return (
                          <span className="text-[10px] font-bold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
                            {c}
                          </span>
                        );
                      })()}
                    </div>
                    <ChevronDown className="w-4 h-4 text-text-muted transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="p-4 pt-0 space-y-2 text-[13px]">
                    {(() => {
                      const ids = getStandardItemIds(selectedStandard);
                      if (ids.length === 0) {
                        return <p className="text-text-muted text-[12px] italic">{isRtl ? 'لا توجد بنود مرتبطة' : 'No linked items'}</p>;
                      }
                      return ids.map(id => {
                        const it = items.find((x: any) => x.id === id);
                        if (!it) return null;
                        return (
                          <div key={id} className="bg-violet-50/50 border border-violet-100 rounded-lg px-3 py-2 text-slate-700">
                            {isRtl ? it.nameAr : it.nameEn}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </details>

                <details className="group bg-white border border-border-subtle rounded-xl overflow-hidden">
                  <summary className="cursor-pointer list-none flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                        <AlertCircle className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-text-main">{isRtl ? 'المخاطر المحتملة' : 'Potential Risks'}</span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-text-muted transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="p-4 pt-0 space-y-3 text-[13px]">
                    {(selectedStandard as any).potentialRisksAr && (
                      <div dir="rtl" className="bg-rose-50/50 border border-rose-100 rounded-lg p-3 leading-relaxed text-slate-700">
                        {(selectedStandard as any).potentialRisksAr}
                      </div>
                    )}
                    {(selectedStandard as any).potentialRisksEn && (
                      <div dir="ltr" className="bg-rose-50/50 border border-rose-100 rounded-lg p-3 leading-relaxed text-slate-700">
                        {(selectedStandard as any).potentialRisksEn}
                      </div>
                    )}
                    {!(selectedStandard as any).potentialRisksAr && !(selectedStandard as any).potentialRisksEn && (
                      <p className="text-text-muted text-[12px] italic">{isRtl ? 'لم يتم تحديد مخاطر' : 'No risks specified'}</p>
                    )}
                  </div>
                </details>
              </div>

              {/* Procedures List */}
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-text-main flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-primary" />
                    {t('associated_procedures')}
                  </h3>
                  
                  <div className="space-y-4">
                    {mockService.getProcedures().filter(p => p.standardId === selectedStandard.id).length === 0 ? (
                      <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-border-subtle">
                        <FileText className="w-10 h-10 mx-auto mb-2 text-text-muted opacity-20" />
                        <p className="text-text-muted font-medium">{t('no_procedures_found')}</p>
                      </div>
                    ) : (
                      mockService.getProcedures()
                        .filter(p => p.standardId === selectedStandard.id)
                        .map((proc, idx) => (
                          <div key={proc.id} className="bg-white rounded-xl border border-border-subtle p-4 hover:shadow-md transition-shadow relative group">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="space-y-1">
                                <h4 className="font-bold text-text-main text-md">
                                  {isRtl ? proc.nameAr : proc.nameEn}
                                </h4>
                                <div className="flex flex-wrap gap-3">
                                  <div className="flex items-center gap-1 text-[11px] text-text-muted">
                                    <Clock className="w-3 h-3" />
                                    {t(proc.frequency)}
                                  </div>
                                  <div className="flex items-center gap-1 text-[11px] text-text-muted">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(proc.endDate).toLocaleDateString(isRtl ? 'ar-SA' : 'en-US')}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 self-start md:self-center">
                                <span className={cn(
                                  "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                  proc.status === 'completed' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                                  proc.status === 'in_progress' ? "bg-amber-50 text-amber-600 border border-amber-100" :
                                  "bg-slate-50 text-slate-500 border border-slate-100"
                                )}>
                                  {t(proc.status)}
                                </span>
                              </div>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 overflow-hidden">
                                  {proc.assignedTo && proc.assignedTo.length > 0 ? (
                                    users.find(u => u.uid === proc.assignedTo[0])?.displayName?.charAt(0) || proc.assignedTo[0].charAt(0)
                                  ) : 'U'}
                                </div>
                                <span className="text-xs text-text-muted font-medium">
                                  {proc.assignedTo && proc.assignedTo.length > 0 ? (
                                    proc.assignedTo.map(uid => users.find(u => u.uid === uid)?.displayName || uid).join(', ')
                                  ) : '---'}
                                </span>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => navigate(`/procedures?id=${proc.id}`)}
                                className="h-8 text-primary hover:bg-primary/5 text-xs font-bold"
                              >
                                {t('view_details')}
                                <ArrowRight className={cn("w-3 h-3 mx-1", isRtl ? "rotate-180" : "")} />
                              </Button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border-subtle bg-slate-50 flex justify-end">
                <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)} className="rounded-lg font-bold">
                  {t('close')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Quick Add Procedure Dialog */}
      <Dialog open={isQuickAddOpen} onOpenChange={setIsQuickAddOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto rounded-2xl border-none shadow-2xl p-0">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-6 bg-emerald-600 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{t('quick_add_procedure')}</h2>
                    <p className="text-white/70 text-xs mt-0.5">
                      {isRtl ? `إضافة إجراء جديد للمعيار: ${selectedStandard?.nameAr}` : `Quick procedure for: ${selectedStandard?.nameEn}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Body */}
            <div className="p-6 space-y-6 bg-slate-50/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Names */}
                <div className="space-y-4 md:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-text-muted uppercase tracking-wider">{t('name_ar')} <span className="text-red-500">*</span></label>
                      <Input 
                        value={quickAddData.nameAr}
                        onChange={e => setQuickAddData({...quickAddData, nameAr: e.target.value})}
                        className="rounded-xl border-border-subtle h-11 bg-white"
                        placeholder={t('name_ar')}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-text-muted uppercase tracking-wider">{t('name_en')} <span className="text-red-500">*</span></label>
                      <Input 
                        value={quickAddData.nameEn}
                        onChange={e => setQuickAddData({...quickAddData, nameEn: e.target.value})}
                        className="rounded-xl border-border-subtle h-11 bg-white"
                        placeholder={t('name_en')}
                      />
                    </div>
                  </div>
                </div>

                {/* Descriptions */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">{t('desc_ar')}</label>
                  <textarea 
                    value={quickAddData.descriptionAr}
                    onChange={e => setQuickAddData({...quickAddData, descriptionAr: e.target.value})}
                    className="w-full min-h-[80px] rounded-xl border border-border-subtle p-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white resize-none"
                    placeholder={t('desc_ar')}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">{t('desc_en')}</label>
                  <textarea 
                    value={quickAddData.descriptionEn}
                    onChange={e => setQuickAddData({...quickAddData, descriptionEn: e.target.value})}
                    className="w-full min-h-[80px] rounded-xl border border-border-subtle p-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white resize-none"
                    placeholder={t('desc_en')}
                  />
                </div>

                {/* Status & Importance */}
                <div className="bg-white p-4 rounded-xl border border-border-subtle space-y-4">
                  <div className="flex items-center gap-2 text-text-main font-bold text-sm mb-1">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    {t('status_and_importance')}
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-text-muted font-bold">{t('status')}</label>
                      <Select value={quickAddData.status} onValueChange={val => setQuickAddData({...quickAddData, status: val as any})}>
                        <SelectTrigger className="h-10 rounded-lg">
                          <SelectValue>
                            {quickAddData.status ? t(quickAddData.status) : t('status')}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_started">{t('not_started')}</SelectItem>
                          <SelectItem value="in_progress">{t('in_progress')}</SelectItem>
                          <SelectItem value="completed">{t('completed')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-text-muted font-bold">{t('importance')}</label>
                      <Select value={quickAddData.importance} onValueChange={val => setQuickAddData({...quickAddData, importance: val as any})}>
                        <SelectTrigger className="h-10 rounded-lg">
                          <SelectValue>
                            {quickAddData.importance ? t(quickAddData.importance) : t('importance')}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">{t('high')}</SelectItem>
                          <SelectItem value="medium">{t('medium')}</SelectItem>
                          <SelectItem value="low">{t('low')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="bg-white p-4 rounded-xl border border-border-subtle space-y-4">
                  <div className="flex items-center gap-2 text-text-main font-bold text-sm mb-1">
                    <Calendar className="w-4 h-4 text-emerald-500" />
                    {t('timeline')}
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-text-muted font-bold">{t('start_date')}</label>
                      <Input 
                        type="date"
                        value={quickAddData.startDate}
                        onChange={e => setQuickAddData({...quickAddData, startDate: e.target.value})}
                        className="h-10 rounded-lg"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-text-muted font-bold">{t('end_date')}</label>
                      <Input 
                        type="date"
                        value={quickAddData.endDate}
                        onChange={e => setQuickAddData({...quickAddData, endDate: e.target.value})}
                        className="h-10 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Periodicity */}
                <div className="md:col-span-2 bg-white p-4 rounded-xl border border-border-subtle">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-text-main font-bold text-sm">
                      <RefreshCw className={cn("w-4 h-4 text-blue-500", quickAddData.isPeriodic && "animate-spin-slow")} />
                      {t('is_periodic')}
                    </div>
                    <input 
                      type="checkbox"
                      checked={quickAddData.isPeriodic}
                      onChange={e => setQuickAddData({...quickAddData, isPeriodic: e.target.checked})}
                      className="w-5 h-5 rounded border-border-subtle text-emerald-600 focus:ring-emerald-500"
                    />
                  </div>
                  {quickAddData.isPeriodic && (
                    <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <Select value={quickAddData.frequency} onValueChange={val => setQuickAddData({...quickAddData, frequency: val as any})}>
                        <SelectTrigger className="h-10 rounded-lg bg-slate-50/50">
                          <SelectValue>{quickAddData.frequency ? t(quickAddData.frequency) : t('frequency')}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="annual">{t('annual')}</SelectItem>
                          <SelectItem value="semi_annual">{t('semi_annual')}</SelectItem>
                          <SelectItem value="quarterly">{t('quarterly')}</SelectItem>
                          <SelectItem value="specific_date">{t('specific_date')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Assignment */}
                <div className="md:col-span-2 bg-white p-4 rounded-xl border border-border-subtle space-y-3">
                  <div className="flex items-center gap-2 text-text-main font-bold text-sm">
                    <User className="w-4 h-4 text-primary" />
                    {t('assigned_to')}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar p-1">
                    {users.map(user => (
                      <label key={user.uid} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors border border-transparent hover:border-border-subtle">
                        <input 
                          type="checkbox"
                          checked={quickAddData.assignedTo.includes(user.uid)}
                          onChange={e => {
                            const newAssigned = e.target.checked 
                              ? [...quickAddData.assignedTo, user.uid]
                              : quickAddData.assignedTo.filter(id => id !== user.uid);
                            setQuickAddData({...quickAddData, assignedTo: newAssigned});
                          }}
                          className="w-4 h-4 rounded border-border-subtle text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className="w-5 h-5 flex-shrink-0 rounded-full bg-blue-50 flex items-center justify-center text-[10px] font-bold text-blue-600">
                            {user.displayName.charAt(0)}
                          </div>
                          <span className="text-xs font-medium text-text-main truncate">{user.displayName}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border-subtle bg-slate-50 flex justify-end gap-3 sticky bottom-0">
              <Button variant="ghost" onClick={() => setIsQuickAddOpen(false)} className="rounded-xl font-bold h-11 px-6">
                {t('cancel')}
              </Button>
              <Button 
                onClick={handleQuickSaveProcedure}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-10 rounded-xl shadow-lg shadow-emerald-600/20 transition-all hover:-translate-y-0.5"
              >
                <Save className="w-4 h-4 mr-2" />
                {t('save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
              {t('confirm_delete_standard_desc') || 'Are you sure you want to delete this standard? This action cannot be undone.'}
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

      {/* Classification Delete Confirmation Dialog */}
      <Dialog open={isDeleteClassConfirmOpen} onOpenChange={setIsDeleteClassConfirmOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-rose-600">
              <AlertCircle className="w-5 h-5" />
              {t('confirm_delete') || 'Confirm Delete'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-text-main font-medium">
              {t('confirm_delete_classification_desc') || 'Are you sure you want to delete this classification?'}
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsDeleteClassConfirmOpen(false)} className="font-bold">
              {t('cancel')}
            </Button>
            <Button onClick={handleConfirmDeleteClass} className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-6">
              {t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StandardFormDialog
        open={standardDialogOpen}
        standardId={editingStandardId}
        onSaved={() => setStandards(mockService.getStandards())}
        onClose={() => setStandardDialogOpen(false)}
      />

      {/* Standard detail popup — lists linked items / procedures for the selected standard. */}
      <Dialog open={!!detailDialog} onOpenChange={(v) => { if (!v) setDetailDialog(null); }}>
        <DialogContent className="sm:max-w-[640px] max-h-[80vh] overflow-hidden flex flex-col rounded-2xl border-none shadow-2xl" dir={isRtl ? 'rtl' : 'ltr'}>
          {detailDialog && (() => {
            const { type, standard } = detailDialog;
            const standardName = isRtl ? standard.nameAr : standard.nameEn;
            const linkedItemIds = getStandardItemIds(standard);
            const itemsList = type === 'items' ? items.filter(i => linkedItemIds.includes(i.id)) : [];
            const procsList = type === 'procedures' ? procedures.filter(p => p.standardId === standard.id) : [];
            const config = {
              items: { title: isRtl ? 'البنود المرتبطة' : 'Linked Items', color: 'violet', count: itemsList.length },
              procedures: { title: isRtl ? 'الإجراءات' : 'Procedures', color: 'blue', count: procsList.length },
            }[type];

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold flex items-center gap-2">
                    <span className={cn(
                      'inline-flex items-center justify-center w-8 h-8 rounded-lg',
                      config.color === 'violet' && 'bg-violet-50 text-violet-600',
                      config.color === 'blue' && 'bg-blue-50 text-blue-600',
                    )}>
                      {type === 'procedures' ? <Activity className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    </span>
                    {config.title}
                    <span className="text-[12px] font-normal text-text-muted">({config.count})</span>
                  </DialogTitle>
                  <p className="text-[12px] text-text-muted font-medium truncate mt-1">{standardName}</p>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto -mx-2 px-2 mt-2">
                  {config.count === 0 ? (
                    <div className="text-center py-12 text-text-muted text-[13px] font-medium">
                      {isRtl ? 'لا توجد عناصر' : 'No items'}
                    </div>
                  ) : type === 'items' ? (
                    <ul className="divide-y divide-border-subtle">
                      {itemsList.map(it => (
                        <li key={it.id} className="py-3 px-2 hover:bg-slate-50/60 rounded-lg">
                          <p className="font-bold text-[13px] text-text-main">{isRtl ? it.nameAr : it.nameEn}</p>
                          {(isRtl ? it.descriptionAr : it.descriptionEn) && (
                            <p className="text-[11px] text-text-muted mt-0.5 line-clamp-2">{isRtl ? it.descriptionAr : it.descriptionEn}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <ul className="divide-y divide-border-subtle">
                      {procsList.map(p => {
                        const statusColor = p.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : p.status === 'in_progress' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600';
                        const weight = mockService.getProcedureEffectiveWeight(p.id, procedures);
                        return (
                          <li key={p.id} className="py-3 px-2 hover:bg-slate-50/60 rounded-lg">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-bold text-[13px] text-text-main flex-1 min-w-0 truncate">{isRtl ? p.nameAr : p.nameEn}</p>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700" title={isRtl ? 'الوزن' : 'Weight'}>
                                  {isRtl ? 'وزن' : 'W'}: {weight}
                                </span>
                                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-md', statusColor)}>{t(p.status)}</span>
                              </div>
                            </div>
                            {p.endDate && (
                              <p className="text-[11px] text-text-muted mt-0.5">
                                {isRtl ? 'تاريخ الانتهاء:' : 'Due:'} {p.endDate}
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

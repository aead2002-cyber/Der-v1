import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  FileText,
  Shield,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  Layers,
  AlertCircle,
  Link2,
  Check,
  LayoutList,
  Rows3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { mockService, getStandardItemIds } from '@/services/mockService';
import { ExportMenu } from './shared/ExportMenu';
import { useTableSort } from './shared/useTableSort';
import { SortableTh } from './shared/SortableTh';
import { PolicyItemsImport } from './shared/PolicyItemsImport';
import { Pagination, usePagination } from './shared/Pagination';
import { AccordionView } from './shared/PolicyItemsAccordion';
import { PolicyItemFormDialog } from './shared/PolicyItemFormDialog';
import { PolicyItem, Policy, Standard, Framework } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/AuthContext';

export default function PolicyItemsPage() {
  const { t, i18n } = useTranslation();
  const { can } = useAuth();
  const navigate = useNavigate();
  const [isRtl, setIsRtl] = useState(i18n.language === 'ar');
  
  useEffect(() => {
    setIsRtl(i18n.language === 'ar');
  }, [i18n.language]);

  const [items, setItems] = useState<PolicyItem[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemParentId, setItemParentId] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [policyFilter, setPolicyFilter] = useState('all');
  const [policyComboQuery, setPolicyComboQuery] = useState('');
  const [policyComboOpen, setPolicyComboOpen] = useState(false);
  const policyComboRef = React.useRef<HTMLDivElement>(null);
  const [frameworkFilter, setFrameworkFilter] = useState('all');

  useEffect(() => {
    if (!policyComboOpen) return;
    const handler = (e: MouseEvent) => {
      if (policyComboRef.current && !policyComboRef.current.contains(e.target as Node)) {
        setPolicyComboOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [policyComboOpen]);
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);

  // Link standards state
  const [linkDialogItem, setLinkDialogItem] = useState<PolicyItem | null>(null);
  const [linkSelected, setLinkSelected] = useState<Set<string>>(new Set());

  // Quick Add Sub-item state
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [quickAddData, setQuickAddData] = useState({
    nameAr: '',
    nameEn: '',
    descriptionAr: '',
    descriptionEn: '',
    order: 0,
    policyId: ''
  });

  useEffect(() => {
    let items = mockService.getPolicyItems();
    const policies = mockService.getPolicies();
    
    if (items.length === 0 && policies.length > 0) {
      const mockItems: PolicyItem[] = [
        {
          id: 'item1',
          policyId: 'p1',
          order: 1,
          nameAr: 'البند الأول: إدارة الأصول',
          nameEn: 'Item 1: Asset Management',
          descriptionAr: 'وصف إدارة الأصول',
          descriptionEn: 'Description of asset management',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'item2',
          policyId: 'p1',
          order: 2,
          nameAr: 'البند الثاني: إدارة الهوية',
          nameEn: 'Item 2: Identity Management',
          descriptionAr: 'وصف إدارة الهوية',
          descriptionEn: 'Description of identity management',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'item2-1',
          policyId: 'p1',
          parentId: 'item2',
          order: 1,
          nameAr: 'البند الفرعي: التحقق الثنائي',
          nameEn: 'Sub-item: Multi-factor Authentication',
          descriptionAr: 'وصف التحقق الثنائي',
          descriptionEn: 'Description of MFA',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ];
      mockItems.forEach(item => mockService.savePolicyItem(item));
      items = mockService.getPolicyItems();
    }
    
    setItems(items);
    setPolicies(policies);
    setFrameworks(mockService.getFrameworks());
    setStandards(mockService.getStandards());
  }, []);

  const handleDelete = (id: string) => {
    const itemStandards = standards.filter(s => getStandardItemIds(s).includes(id));
    if (itemStandards.length > 0) {
      toast.error(t('cannot_delete_item_standards') || 'Cannot delete item because it has associated standards');
      return;
    }
    setIdToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (idToDelete) {
      mockService.deletePolicyItem(idToDelete);
      setItems(mockService.getPolicyItems());
      setIsDeleteConfirmOpen(false);
      setIdToDelete(null);
      toast.success(t('policy_item_deleted_success'));
    }
  };

  const filteredItems = items.filter(i => {
    const matchesSearch = (i.nameAr + i.nameEn).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPolicy = policyFilter === 'all' || i.policyId === policyFilter;
    
    const policy = policies.find(p => p.id === i.policyId);
    const frameworkId = policy?.frameworkId;
    const matchesFramework = frameworkFilter === 'all' || frameworkId === frameworkFilter;

    return matchesSearch && matchesPolicy && matchesFramework;
  });

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
      <DialogContent className="max-w-fit p-0 border-none bg-transparent">
        <div className={cn(
          "px-1.5 py-0.5 rounded text-[10px] font-black uppercase whitespace-nowrap",
          color
        )}>
          {isRtl ? framework.nameAr.substring(0, 3) : framework.nameEn.substring(0, 3)}
        </div>
      </DialogContent>
    );
  };

  const getPolicyName = (policyId: string) => {
    const policy = policies.find(p => p.id === policyId);
    return policy ? (isRtl ? policy.nameAr : policy.nameEn) : '---';
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

  const defaultSortedItems = [...filteredItems].sort((a, b) => {
    const codeA = getItemCode(a, items);
    const codeB = getItemCode(b, items);
    return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
  });

  const { sort, toggle, sortedRows } = useTableSort();
  const sortedItems = sort
    ? sortedRows(filteredItems, (it: any, key: string) => {
        switch (key) {
          case 'code': return getItemCode(it, items);
          case 'name': return isRtl ? it.nameAr : it.nameEn;
          case 'framework': {
            const pol = policies.find(p => p.id === it.policyId);
            const fw = frameworks.find(f => f.id === pol?.frameworkId);
            return fw ? (isRtl ? fw.nameAr : fw.nameEn) : '';
          }
          case 'policy': return getPolicyName(it.policyId);
          case 'progress': return mockService.getPolicyItemProgress(it.id);
          case 'description': return isRtl ? (it.descriptionAr || '') : (it.descriptionEn || '');
          default: return '';
        }
      })
    : defaultSortedItems;

  const [viewMode, setViewMode] = useState<'table' | 'accordion'>('table');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const toggleExpand = (id: string) => {
    setExpandedIds((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Children grouped by parent id (used by accordion view)
  const childrenByParent = React.useMemo(() => {
    const map = new Map<string, PolicyItem[]>();
    items.forEach((it: PolicyItem) => {
      const key = it.parentId || '__root__';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    });
    map.forEach(arr => arr.sort((a, b) => {
      const ca = itemCodes.get(a.id) || '';
      const cb = itemCodes.get(b.id) || '';
      return ca.localeCompare(cb, undefined, { numeric: true });
    }));
    return map;
  }, [items, itemCodes]);

  // Accordion shows only root-level filtered items as headers; paginate those
  const rootFilteredItems = filteredItems.filter((it: PolicyItem) => !it.parentId || !items.find((p: PolicyItem) => p.id === it.parentId));
  const sortedRootItems = [...rootFilteredItems].sort((a, b) => {
    const ca = itemCodes.get(a.id) || '';
    const cb = itemCodes.get(b.id) || '';
    return ca.localeCompare(cb, undefined, { numeric: true });
  });

  const totalForPagination = viewMode === 'accordion' ? sortedRootItems.length : sortedItems.length;
  const { page, setPage, pageSize, setPageSize, paginate } = usePagination(totalForPagination);
  const pagedItems = viewMode === 'accordion' ? paginate(sortedRootItems) : paginate(sortedItems);

  const handleQuickSave = () => {
    if (!quickAddData.nameAr || !quickAddData.nameEn) {
      toast.error(t('fill_required_fields'));
      return;
    }

    const newItem: PolicyItem = {
      id: Math.random().toString(36).substr(2, 9),
      parentId: selectedParentId || undefined,
      nameAr: quickAddData.nameAr,
      nameEn: quickAddData.nameEn,
      descriptionAr: quickAddData.descriptionAr,
      descriptionEn: quickAddData.descriptionEn,
      order: 0,
      policyId: quickAddData.policyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockService.savePolicyItem(newItem);
    setItems(mockService.getPolicyItems());
    setIsQuickAddOpen(false);
    toast.success(t('policy_item_added_success'));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-main">{t('policy_items')}</h1>
          <p className="text-text-muted mt-1">{t('manage_policy_items_desc')}</p>
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
          <PolicyItemsImport onDone={() => { setItems(mockService.getPolicyItems()); setStandards(mockService.getStandards()); }} />
          <ExportMenu
            title={isRtl ? 'البنود' : 'Policy Items'}
            filename="policy_items"
            rows={filteredItems}
            columns={[
              { header: isRtl ? 'الاسم بالعربي' : 'Name (Arabic)', accessor: (i: any) => i.nameAr },
              { header: isRtl ? 'الاسم بالإنجليزي' : 'Name (English)', accessor: (i: any) => i.nameEn },
              { header: isRtl ? 'السياسة' : 'Policy', accessor: (i: any) => getPolicyName(i.policyId) },
              { header: isRtl ? 'البند الأب' : 'Parent', accessor: (i: any) => i.parentId ? (items.find(x => x.id === i.parentId)?.[isRtl ? 'nameAr' : 'nameEn'] || '') : '' },
              { header: isRtl ? 'الترتيب' : 'Order', accessor: (i: any) => i.order ?? 0 },
              { header: isRtl ? 'المعايير المرتبطة' : 'Linked Standards', accessor: (i: any) => standards.filter((s: any) => getStandardItemIds(s).includes(i.id)).length },
              { header: isRtl ? 'نسبة الالتزام %' : 'Progress %', accessor: (i: any) => `${mockService.getPolicyItemProgress(i.id)}%` },
              { header: isRtl ? 'الوصف بالعربي' : 'Description (AR)', accessor: (i: any) => i.descriptionAr || '' },
              { header: isRtl ? 'الوصف بالإنجليزي' : 'Description (EN)', accessor: (i: any) => i.descriptionEn || '' }
            ]}
          />
          {can('policies.policy_items.create') && (
            <Button
              onClick={() => { setEditingItemId(null); setItemParentId(undefined); setItemDialogOpen(true); }}
              className="bg-primary hover:bg-primary/90 text-white font-bold px-6 h-11 rounded-lg shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('add_policy_item')}
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
                  <SelectTrigger className="w-full md:w-[240px] rounded-lg border-2 border-indigo-200 h-11 bg-indigo-50/50 text-indigo-900 font-bold ring-offset-indigo-50 focus:ring-indigo-300 shadow-sm shadow-indigo-100">
                    <div className="flex items-center gap-2">
                       <SelectValue placeholder={t('framework')}>
                         {frameworkFilter === 'all'
                           ? t('all_frameworks')
                           : (frameworks.find(f => f.id === frameworkFilter)?.[isRtl ? 'nameAr' : 'nameEn'] || t('framework'))}
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
                <div ref={policyComboRef} className="relative w-full md:w-[280px]">
                  <div
                    className="flex items-center gap-2 px-3 rounded-lg border border-border-subtle h-11 bg-slate-50/50 cursor-text focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary"
                    onClick={() => setPolicyComboOpen(true)}
                  >
                    <Shield className="w-4 h-4 text-text-muted shrink-0" />
                    <input
                      type="text"
                      value={policyComboOpen
                        ? policyComboQuery
                        : policyFilter === 'all'
                          ? t('all_policies') as string
                          : (policies.find(p => p.id === policyFilter)?.[isRtl ? 'nameAr' : 'nameEn'] || '')
                      }
                      onChange={e => { setPolicyComboQuery(e.target.value); setPolicyComboOpen(true); }}
                      onFocus={() => { setPolicyComboQuery(''); setPolicyComboOpen(true); }}
                      placeholder={t('policy') as string}
                      className="flex-1 bg-transparent outline-none text-[13px] min-w-0"
                    />
                    <ChevronDown className={cn('w-4 h-4 text-text-muted shrink-0 transition-transform', policyComboOpen && 'rotate-180')} />
                  </div>
                  {policyComboOpen && (() => {
                    const q = policyComboQuery.trim().toLowerCase();
                    const filtered = policies.filter(p =>
                      !q ||
                      (p.nameAr || '').toLowerCase().includes(q) ||
                      (p.nameEn || '').toLowerCase().includes(q)
                    );
                    return (
                      <div className="absolute z-50 mt-1 w-full bg-white border border-border-subtle rounded-lg shadow-lg max-h-[300px] overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => { setPolicyFilter('all'); setPolicyComboOpen(false); setPolicyComboQuery(''); }}
                          className={cn(
                            'w-full text-start px-3 py-2 text-[13px] hover:bg-slate-50 border-b border-border-subtle',
                            policyFilter === 'all' && 'bg-primary/5 text-primary font-bold'
                          )}
                        >
                          {t('all_policies')}
                        </button>
                        {filtered.length === 0 ? (
                          <div className="px-3 py-3 text-[12px] text-text-muted text-center italic">
                            {isRtl ? 'لا توجد نتائج' : 'No results'}
                          </div>
                        ) : filtered.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => { setPolicyFilter(p.id); setPolicyComboOpen(false); setPolicyComboQuery(''); }}
                            className={cn(
                              'w-full text-start px-3 py-2 text-[13px] hover:bg-slate-50',
                              policyFilter === p.id && 'bg-primary/5 text-primary font-bold'
                            )}
                          >
                            {isRtl ? p.nameAr : p.nameEn}
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {viewMode === 'accordion' ? (
          <AccordionView
            roots={pagedItems as PolicyItem[]}
            childrenByParent={childrenByParent}
            expandedIds={expandedIds}
            toggleExpand={toggleExpand}
            itemCodes={itemCodes}
            isRtl={isRtl}
            t={t}
            policies={policies}
            frameworks={frameworks}
            standards={standards}
            getPolicyName={getPolicyName}
            navigate={navigate}
            handleDelete={handleDelete}
            setSelectedParentId={setSelectedParentId}
            setQuickAddData={setQuickAddData}
            setIsQuickAddOpen={setIsQuickAddOpen}
            setLinkSelected={setLinkSelected}
            setLinkDialogItem={setLinkDialogItem}
          />
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <SortableTh sortKey="code" sort={sort} onToggle={toggle} className={cn(isRtl ? "text-right w-[100px]" : "text-left w-[100px]")}>{t('item_number')}</SortableTh>
                <SortableTh sortKey="name" sort={sort} onToggle={toggle} className={cn(isRtl ? "text-right" : "text-left")}>{t('policy_item_name')}</SortableTh>
                <SortableTh sortKey="framework" sort={sort} onToggle={toggle} className={cn(isRtl ? "text-right" : "text-left")}>{t('framework') || (isRtl ? 'إطار العمل' : 'Framework')}</SortableTh>
                <SortableTh sortKey="policy" sort={sort} onToggle={toggle} className={cn(isRtl ? "text-right" : "text-left")}>{t('policy')}</SortableTh>
                <SortableTh sortKey="progress" sort={sort} onToggle={toggle} className={cn(isRtl ? "text-right" : "text-left")}>{t('progress')}</SortableTh>
                <SortableTh sortKey="description" sort={sort} onToggle={toggle} className={cn(isRtl ? "text-right" : "text-left")}>{t('description')}</SortableTh>
                <th className="text-center w-[120px]">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-text-muted">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    {t('no_policy_items_found')}
                  </td>
                </tr>
              ) : (
                pagedItems.map((item) => {
                  const level = (getItemCode(item, items).match(/-/g) || []).length;
                  const isParent = !item.parentId;
                  const progress = mockService.getPolicyItemProgress(item.id);
                  const stdCount = standards.filter(s => getStandardItemIds(s).includes(item.id)).length;

                  return (
                    <tr 
                      key={item.id} 
                      className={cn(
                        "group transition-colors",
                        isParent ? "bg-white" : "bg-slate-50/30"
                      )}
                    >
                      <td>
                        <div className={cn(
                          "font-mono text-xs font-bold px-2 py-1 rounded w-fit whitespace-nowrap",
                          isParent 
                            ? "text-primary bg-primary/10" 
                            : "text-text-muted bg-slate-200/50"
                        )}>
                          {getItemCode(item, items)}
                        </div>
                      </td>
                      <td>
                        <div 
                          className="flex items-center"
                          style={{ [isRtl ? 'paddingRight' : 'paddingLeft']: `${level * 24}px` }}
                        >
                          {level > 0 && (
                            <div className={cn(
                              "relative flex items-center justify-center w-6 h-6",
                              isRtl ? "ml-1" : "mr-1"
                            )}>
                              <div className={cn(
                                "absolute top-0 bottom-1/2 w-px bg-slate-300",
                                isRtl ? "right-1/2" : "left-1/2"
                              )} />
                              <div className={cn(
                                "absolute top-1/2 w-3 h-px bg-slate-300",
                                isRtl ? "right-1/2" : "left-1/2"
                              )} />
                            </div>
                          )}
                          <div className={cn(
                            "flex items-center gap-2",
                            isParent ? "font-bold text-text-main text-sm" : "text-sm text-text-main font-medium"
                          )}>
                            {!isParent && <Layers className="w-3 h-3 text-text-muted opacity-40" />}
                            {isRtl ? item.nameAr : item.nameEn}
                          </div>
                          <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50/60 border border-blue-100 rounded-md w-fit">
                            <Shield className="w-3 h-3 text-blue-500" />
                            <span className="text-[10px] font-bold text-blue-700">
                              {stdCount} {isRtl ? 'معيار مرتبط' : 'linked standards'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        {(() => {
                           const policy = policies.find(p => p.id === item.policyId);
                           if (!policy) return null;
                           const framework = frameworks.find(f => f.id === policy.frameworkId);
                           if (!framework) return null;
                           const frameworkIndex = frameworks.findIndex(f => f.id === framework.id);
                           const colors = ['bg-slate-800 text-white', 'bg-blue-700 text-white', 'bg-emerald-700 text-white', 'bg-purple-700 text-white', 'bg-indigo-700 text-white'];
                           const color = colors[frameworkIndex % colors.length];
                           return (
                             <div className={cn("px-1.5 py-0.5 rounded text-[10px] font-black uppercase whitespace-nowrap w-fit", color)} title={isRtl ? framework.nameAr : framework.nameEn}>
                               {isRtl ? framework.nameAr.substring(0, 3) : framework.nameEn.substring(0, 3)}
                             </div>
                           );
                        })()}
                      </td>
                      <td>
                        <div className="flex items-center gap-2 text-text-muted text-xs">
                          <Shield className="w-3.5 h-3.5" />
                          {getPolicyName(item.policyId)}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full transition-all duration-500", progress === 100 ? "bg-emerald-500" : "bg-primary")}
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                          <span className="text-[11px] font-bold text-text-main">{progress}%</span>
                        </div>
                      </td>
                      <td>
                        <p className="text-text-muted line-clamp-1 max-w-[300px] text-xs">
                          {isRtl ? item.descriptionAr : item.descriptionEn}
                        </p>
                      </td>
                      <td>
                        <div className="flex items-center justify-center">
                          <div className="inline-flex items-center rounded-lg border border-border-subtle bg-white shadow-sm overflow-hidden divide-x divide-border-subtle rtl:divide-x-reverse">
                            {can('policies.policy_items.create') && (
                              <button
                                type="button"
                                title={isRtl ? 'إضافة بند فرعي' : 'Add sub-item'}
                                onClick={() => {
                                  setSelectedParentId(item.id);
                                  setQuickAddData({
                                    nameAr: '',
                                    nameEn: '',
                                    descriptionAr: '',
                                    descriptionEn: '',
                                    order: 0,
                                    policyId: item.policyId
                                  });
                                  setIsQuickAddOpen(true);
                                }}
                                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50/60 transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {can('policies.policy_items.link_standards') && (
                              <button
                                type="button"
                                title={isRtl ? 'ربط معايير' : 'Link standards'}
                                onClick={() => {
                                  const linked = standards.filter(s => getStandardItemIds(s).includes(item.id)).map(s => s.id);
                                  setLinkSelected(new Set(linked));
                                  setLinkDialogItem(item);
                                }}
                                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-violet-600 hover:bg-violet-50/60 transition-colors"
                              >
                                <Link2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {can('policies.policy_items.edit') && (
                              <button
                                type="button"
                                title={t('edit')}
                                onClick={() => { setEditingItemId(item.id); setItemParentId(undefined); setItemDialogOpen(true); }}
                                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50/60 transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {can('policies.policy_items.delete') && (
                              <button
                                type="button"
                                title={t('delete')}
                                onClick={() => handleDelete(item.id)}
                                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50/60 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        )}
        <Pagination
          total={totalForPagination}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Link Standards Dialog */}
      <Dialog open={!!linkDialogItem} onOpenChange={(open) => { if (!open) setLinkDialogItem(null); }}>
        <DialogContent className="sm:max-w-[560px] rounded-xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Link2 className="w-5 h-5 text-violet-600" />
              {isRtl ? 'ربط معايير بالبند' : 'Link Standards to Item'}
            </DialogTitle>
          </DialogHeader>
          {linkDialogItem && (() => {
            const policyStandards = standards.filter(s => s.policyId === linkDialogItem.policyId);
            const toggle = (id: string) => {
              const next = new Set(linkSelected);
              if (next.has(id)) next.delete(id); else next.add(id);
              setLinkSelected(next);
            };
            return (
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-lg p-3 text-sm">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {isRtl ? 'البند' : 'Item'}
                  </div>
                  <div className="font-bold text-slate-800">{isRtl ? linkDialogItem.nameAr : linkDialogItem.nameEn}</div>
                </div>

                <div className="text-[12px] text-text-muted">
                  {isRtl
                    ? `اختر المعايير التي ترغب بربطها بهذا البند ضمن السياسة (${policyStandards.length} معيار متاح)`
                    : `Select the standards under this policy to link with this item (${policyStandards.length} available)`}
                </div>

                <div className="max-h-[340px] overflow-y-auto space-y-1 border border-border-subtle rounded-lg p-1.5">
                  {policyStandards.length === 0 ? (
                    <div className="text-center text-[12px] text-text-muted py-8">
                      {isRtl ? 'لا توجد معايير في هذه السياسة' : 'No standards in this policy'}
                    </div>
                  ) : policyStandards.map(s => {
                    const checked = linkSelected.has(s.id);
                    const otherLinks = getStandardItemIds(s).filter(id => id !== linkDialogItem.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggle(s.id)}
                        className={cn(
                          'w-full flex items-center justify-between gap-3 p-2.5 rounded-md text-start transition-colors',
                          checked ? 'bg-violet-50 border border-violet-200' : 'hover:bg-slate-50 border border-transparent'
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-bold text-text-main truncate">
                            {isRtl ? s.nameAr : s.nameEn}
                          </div>
                          {otherLinks.length > 0 && (
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {isRtl ? `مرتبط أيضاً بـ ${otherLinks.length} بند آخر` : `Also linked to ${otherLinks.length} other item(s)`}
                            </div>
                          )}
                        </div>
                        <div className={cn(
                          'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0',
                          checked ? 'bg-violet-600 border-violet-600 text-white' : 'border-slate-300'
                        )}>
                          {checked && <Check className="w-3 h-3" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setLinkDialogItem(null)}>{t('cancel')}</Button>
            <Button
              className="bg-violet-600 hover:bg-violet-700 text-white font-bold"
              onClick={() => {
                if (!linkDialogItem) return;
                const item = linkDialogItem;
                const policyStandards = standards.filter(s => s.policyId === item.policyId);
                let updated = 0;
                policyStandards.forEach(s => {
                  const shouldBeLinked = linkSelected.has(s.id);
                  const currentIds = getStandardItemIds(s);
                  const isCurrentlyLinkedHere = currentIds.includes(item.id);
                  if (shouldBeLinked && !isCurrentlyLinkedHere) {
                    const nextIds = [...currentIds, item.id];
                    mockService.saveStandard({ ...s, policyItemId: undefined, policyItemIds: nextIds, updatedAt: new Date().toISOString() });
                    updated++;
                  } else if (!shouldBeLinked && isCurrentlyLinkedHere) {
                    const nextIds = currentIds.filter(id => id !== item.id);
                    mockService.saveStandard({ ...s, policyItemId: undefined, policyItemIds: nextIds, updatedAt: new Date().toISOString() });
                    updated++;
                  }
                });
                setStandards(mockService.getStandards());
                toast.success(isRtl ? `تم تحديث ${updated} معيار` : `${updated} standard(s) updated`);
                setLinkDialogItem(null);
              }}
            >
              <Check className="w-4 h-4 mr-2" />
              {isRtl ? 'حفظ الربط' : 'Save Links'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Add Sub-item Dialog */}
      <Dialog open={isQuickAddOpen} onOpenChange={setIsQuickAddOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {isRtl ? 'إضافة بند فرعي سريع' : 'Quick Add Sub-item'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="grid gap-2">
              <label className="text-[13px] font-bold text-text-main">{t('name_ar')} <span className="text-red-500">*</span></label>
              <Input 
                value={quickAddData.nameAr} 
                onChange={e => setQuickAddData({...quickAddData, nameAr: e.target.value})}
                className="rounded-lg border-border-subtle h-11"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-[13px] font-bold text-text-main">{t('name_en')} <span className="text-red-500">*</span></label>
              <Input 
                value={quickAddData.nameEn} 
                onChange={e => setQuickAddData({...quickAddData, nameEn: e.target.value})}
                className="rounded-lg border-border-subtle h-11"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsQuickAddOpen(false)} className="font-bold">
              {t('cancel')}
            </Button>
            <Button onClick={handleQuickSave} className="bg-primary hover:bg-primary/90 text-white font-bold px-8">
              {t('save')}
            </Button>
          </DialogFooter>
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
              {t('confirm_delete_policy_item_desc') || 'Are you sure you want to delete this policy item? All related standards will also be affected.'}
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

      <PolicyItemFormDialog
        open={itemDialogOpen}
        itemId={editingItemId}
        parentId={itemParentId}
        onSaved={() => { setItems(mockService.getPolicyItems()); setStandards(mockService.getStandards()); }}
        onClose={() => setItemDialogOpen(false)}
      />
    </div>
  );
}

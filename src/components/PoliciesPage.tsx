import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, MoreVertical, Edit2, Trash2, Shield, Upload, FileText, Activity, PlusCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { Input } from '@/components/ui/input';
import Papa from 'papaparse';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
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
import { useTableSort } from './shared/useTableSort';
import { SortableTh } from './shared/SortableTh';
import { Pagination, usePagination } from './shared/Pagination';
import { Policy, Framework, Standard, Procedure } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Tooltip } from '@/components/ui/tooltip';
import { useAuth } from '@/AuthContext';

export default function PoliciesPage() {
  const { t, i18n } = useTranslation();
  const { can } = useAuth();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [frameworkFilter, setFrameworkFilter] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({
    nameAr: '',
    nameEn: '',
    descriptionAr: '',
    descriptionEn: '',
    order: 0
  });
  const [newPolicy, setNewPolicy] = useState<Partial<Policy>>({
    frameworkId: 'nca'
  });
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [detailDialog, setDetailDialog] = useState<{ type: 'items' | 'standards' | 'procedures'; policy: Policy } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isRtl = i18n.language === 'ar';

  useEffect(() => {
    setPolicies(mockService.getPolicies());
    setFrameworks(mockService.getFrameworks());
    setStandards(mockService.getStandards());
    setProcedures(mockService.getProcedures());
  }, []);

  const openEditPolicy = (policy: Policy) => {
    setEditingPolicyId(policy.id);
    setNewPolicy({
      nameAr: policy.nameAr,
      nameEn: policy.nameEn,
      descriptionAr: policy.descriptionAr,
      descriptionEn: policy.descriptionEn,
      frameworkId: policy.frameworkId
    });
    setIsAddDialogOpen(true);
  };

  const closePolicyDialog = () => {
    setIsAddDialogOpen(false);
    setEditingPolicyId(null);
    setNewPolicy({ frameworkId: 'nca' });
  };

  const handleAddPolicy = () => {
    if (!newPolicy.nameAr || !newPolicy.nameEn) {
      toast.error(t('fill_required_fields'));
      return;
    }

    const existing = editingPolicyId ? policies.find(p => p.id === editingPolicyId) : null;
    const policy: Policy = {
      id: existing?.id || Math.random().toString(36).substr(2, 9),
      nameAr: newPolicy.nameAr || '',
      nameEn: newPolicy.nameEn || '',
      descriptionAr: newPolicy.descriptionAr || '',
      descriptionEn: newPolicy.descriptionEn || '',
      frameworkId: newPolicy.frameworkId || 'nca',
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockService.savePolicy(policy);
    setPolicies(mockService.getPolicies());
    closePolicyDialog();
    toast.success(existing ? t('policy_updated_success') || t('policy_added_success') : t('policy_added_success'));
  };

  const handleAddItem = () => {
    if (!newItem.nameAr || !newItem.nameEn) {
      toast.error(t('fill_required_fields'));
      return;
    }

    if (!selectedPolicyId) return;

    const item = {
      id: Math.random().toString(36).substr(2, 9),
      policyId: selectedPolicyId,
      nameAr: newItem.nameAr,
      nameEn: newItem.nameEn,
      descriptionAr: newItem.descriptionAr,
      descriptionEn: newItem.descriptionEn,
      order: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockService.savePolicyItem(item);
    setIsAddItemDialogOpen(false);
    setNewItem({
      nameAr: '',
      nameEn: '',
      descriptionAr: '',
      descriptionEn: '',
      order: 0
    });
    toast.success(t('policy_item_added_success'));
  };

  const handleDelete = (id: string) => {
    const policyStandards = standards.filter(s => s.policyId === id);
    const policyProcedures = procedures.filter(p => p.policyId === id);
    
    if (policyStandards.length > 0 || policyProcedures.length > 0) {
      toast.error(t('cannot_delete_policy_dependencies') || 'Cannot delete policy because it has associated standards or procedures');
      return;
    }
    
    setIdToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (idToDelete) {
      mockService.deletePolicy(idToDelete);
      setPolicies(mockService.getPolicies());
      setIsDeleteConfirmOpen(false);
      setIdToDelete(null);
      toast.success(t('policy_deleted_success'));
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const importedData = results.data as any[];
        const newPolicies: Policy[] = [];

        importedData.forEach(row => {
          const frameworkName = row['Framework'] || row['إطار العمل'] || row['framework'];
          const matchedFramework = frameworks.find(f =>
            f.id === frameworkName ||
            f.nameAr === frameworkName ||
            f.nameEn === frameworkName
          );

          const policy: Policy = {
            id: Math.random().toString(36).substr(2, 9),
            nameAr: row['Name (Arabic)'] || row['الاسم (عربي)'] || row['nameAr'] || '',
            nameEn: row['Name (English)'] || row['الاسم (إنجليزي)'] || row['nameEn'] || '',
            descriptionAr: row['Description (Arabic)'] || row['الوصف (عربي)'] || row['descriptionAr'] || '',
            descriptionEn: row['Description (English)'] || row['الوصف (إنجليزي)'] || row['descriptionEn'] || '',
            frameworkId: matchedFramework?.id || 'nca',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          if (policy.nameAr && policy.nameEn) {
            newPolicies.push(policy);
          }
        });

        if (newPolicies.length > 0) {
          mockService.bulkSavePolicies(newPolicies);
        }
        setPolicies(mockService.getPolicies());
        toast.success(`${t('import_success')}: ${newPolicies.length}`);
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
      error: (error) => {
        console.error('CSV Parse Error:', error);
        toast.error(t('import_error'));
      }
    });
  };

  const filteredPolicies = policies.filter(p => {
    const matchesSearch = p.nameAr.includes(searchTerm) || p.nameEn.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFramework = frameworkFilter === 'all' || p.frameworkId === frameworkFilter;
    return matchesSearch && matchesFramework;
  });

  const { sort, toggle, sortedRows } = useTableSort();
  const sortedPolicies = sortedRows(filteredPolicies, (p: any, key: string) => {
    switch (key) {
      case 'name': return isRtl ? p.nameAr : p.nameEn;
      case 'framework': return (frameworks.find(f => f.id === p.frameworkId)?.[isRtl ? 'nameAr' : 'nameEn']) || '';
      case 'progress': return mockService.getPolicyProgress(p.id);
      case 'status': return mockService.getPolicyProgress(p.id);
      default: return '';
    }
  });

  const { page, setPage, pageSize, setPageSize, paginate } = usePagination(sortedPolicies.length);
  const pagedPolicies = paginate(sortedPolicies);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-main">{t('policies')}</h1>
          <p className="text-text-muted mt-1">{t('manage_policies_desc')}</p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            className="hidden"
          />
          <ExportMenu
            title={isRtl ? 'السياسات' : 'Policies'}
            filename="policies"
            rows={filteredPolicies}
            columns={[
              { header: isRtl ? 'الاسم بالعربي' : 'Name (Arabic)', accessor: (p: any) => p.nameAr },
              { header: isRtl ? 'الاسم بالإنجليزي' : 'Name (English)', accessor: (p: any) => p.nameEn },
              { header: isRtl ? 'إطار العمل' : 'Framework', accessor: (p: any) => frameworks.find(f => f.id === p.frameworkId)?.[isRtl ? 'nameAr' : 'nameEn'] || '' },
              { header: isRtl ? 'البنود' : 'Items', accessor: (p: any) => mockService.getPolicyItems(p.id).length },
              { header: isRtl ? 'المعايير' : 'Standards', accessor: (p: any) => mockService.getPolicyStats(p.id).standardsCount },
              { header: isRtl ? 'الإجراءات' : 'Procedures', accessor: (p: any) => mockService.getPolicyStats(p.id).proceduresCount },
              { header: isRtl ? 'نسبة الالتزام %' : 'Progress %', accessor: (p: any) => `${mockService.getPolicyProgress(p.id)}%` }
            ]}
          />
          {can('policies.import') && (
            <Button
              variant="outline"
              onClick={handleImportClick}
              className="rounded-lg border-border-subtle h-11 px-6 font-bold flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {t('import')}
            </Button>
          )}

          <Dialog open={isAddDialogOpen} onOpenChange={(open) => { if (!open) closePolicyDialog(); else setIsAddDialogOpen(true); }}>
            {can('policies.create') && (
              <DialogTrigger render={<Button className="bg-primary hover:bg-primary/90 text-white font-bold px-6 h-11 rounded-lg shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5" onClick={() => { setEditingPolicyId(null); setNewPolicy({ frameworkId: 'nca' }); }} />}>
                <Plus className="w-4 h-4 mr-2" />
                {t('add_policy')}
              </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[500px] rounded-xl border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">{editingPolicyId ? (t('edit_policy') || t('add_policy')) : t('add_policy')}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-5 py-4">
                <div className="grid gap-2">
                  <label className="text-[13px] font-bold text-text-main">{t('name_ar')} <span className="text-red-500">*</span></label>
                  <Input 
                    value={newPolicy.nameAr || ''} 
                    onChange={e => setNewPolicy({...newPolicy, nameAr: e.target.value})}
                    placeholder="مثال: سياسة الأمن السيبراني"
                    className="rounded-lg border-border-subtle h-11"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-[13px] font-bold text-text-main">{t('name_en')} <span className="text-red-500">*</span></label>
                  <Input 
                    value={newPolicy.nameEn || ''} 
                    onChange={e => setNewPolicy({...newPolicy, nameEn: e.target.value})}
                    placeholder="Example: Cybersecurity Policy"
                    className="rounded-lg border-border-subtle h-11"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-[13px] font-bold text-text-main">{t('framework')} <span className="text-red-500">*</span></label>
                  <Select 
                    value={newPolicy.frameworkId || ''} 
                    onValueChange={v => setNewPolicy({...newPolicy, frameworkId: v})}
                  >
                    <SelectTrigger className="rounded-lg border-border-subtle h-11">
                      <SelectValue placeholder={t('select_framework')}>
                        {newPolicy.frameworkId
                          ? (frameworks.find(f => f.id === newPolicy.frameworkId)?.[isRtl ? 'nameAr' : 'nameEn'] || t('select_framework'))
                          : t('select_framework')}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {frameworks.map(f => (
                        <SelectItem key={f.id} value={f.id}>
                          {isRtl ? f.nameAr : f.nameEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="gap-3">
                <Button variant="outline" onClick={closePolicyDialog} className="rounded-lg h-11 px-6 font-bold">{t('cancel')}</Button>
                <Button onClick={handleAddPolicy} className="bg-primary hover:bg-primary/90 text-white rounded-lg h-11 px-8 font-bold">{t('save')}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="table-container">
        <div className="section-header">
          <div className="flex flex-col md:flex-row gap-4 w-full">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                className="pl-10 rounded-lg border-border-subtle bg-slate-50/50 h-11" 
                placeholder={t('search')} 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={frameworkFilter} onValueChange={setFrameworkFilter}>
              <SelectTrigger className="w-full md:w-[240px] rounded-lg border-border-subtle h-11 bg-slate-50/50">
                <SelectValue placeholder={t('filter_by_framework')}>
                  {frameworkFilter === 'all'
                    ? t('all_frameworks')
                    : (frameworks.find(f => f.id === frameworkFilter)?.[isRtl ? 'nameAr' : 'nameEn'] || t('filter_by_framework'))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_frameworks')}</SelectItem>
                {frameworks.map(f => (
                  <SelectItem key={f.id} value={f.id}>
                    {isRtl ? f.nameAr : f.nameEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <SortableTh sortKey="name" sort={sort} onToggle={toggle} className={isRtl ? "text-right" : "text-left"}>{t('name')}</SortableTh>
                <SortableTh sortKey="framework" sort={sort} onToggle={toggle} className={isRtl ? "text-right" : "text-left"}>{t('framework')}</SortableTh>
                <SortableTh sortKey="status" sort={sort} onToggle={toggle} className={isRtl ? "text-right" : "text-left"}>{t('status')}</SortableTh>
                <th className={isRtl ? "text-left" : "text-right"}>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedPolicies.length > 0 ? (
                pagedPolicies.map((policy: any) => {
                  const progress = mockService.getPolicyProgress(policy.id);
                  const stats = mockService.getPolicyStats(policy.id);
                  const itemsCount = mockService.getPolicyItems(policy.id).length;
                  return (
                    <motion.tr 
                      key={policy.id} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="max-w-[300px]">
                        <div className="flex flex-col gap-1.5 overflow-hidden">
                          <Tooltip content={isRtl ? policy.nameAr : policy.nameEn}>
                            <span className="font-bold text-text-main group-hover:text-primary transition-colors truncate cursor-help">
                              {isRtl ? policy.nameAr : policy.nameEn}
                            </span>
                          </Tooltip>
                          <div className="flex items-center gap-3 shrink-0 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setDetailDialog({ type: 'items', policy })}
                              className="flex items-center gap-1.5 px-2 py-0.5 bg-violet-50/50 hover:bg-violet-100 rounded-md border border-violet-100/50 hover:border-violet-300 transition-colors cursor-pointer"
                              title={isRtl ? 'عرض البنود' : 'View items'}
                            >
                              <FileText className="w-3 h-3 text-violet-500" />
                              <span className="text-[10px] font-mono font-bold text-violet-600 uppercase tracking-tighter">
                                {itemsCount} {t('policy_items') || (isRtl ? 'البنود' : 'Items')}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDetailDialog({ type: 'standards', policy })}
                              className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50/50 hover:bg-blue-100 rounded-md border border-blue-100/50 hover:border-blue-300 transition-colors cursor-pointer"
                              title={isRtl ? 'عرض المعايير' : 'View standards'}
                            >
                              <FileText className="w-3 h-3 text-blue-500" />
                              <span className="text-[10px] font-mono font-bold text-blue-600 uppercase tracking-tighter">
                                {stats.standardsCount} {t('standards')}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDetailDialog({ type: 'procedures', policy })}
                              className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50/50 hover:bg-emerald-100 rounded-md border border-emerald-100/50 hover:border-emerald-300 transition-colors cursor-pointer"
                              title={isRtl ? 'عرض الإجراءات' : 'View procedures'}
                            >
                              <Activity className="w-3 h-3 text-emerald-500" />
                              <span className="text-[10px] font-mono font-bold text-emerald-600 uppercase tracking-tighter">
                                {stats.proceduresCount} {t('procedures')}
                              </span>
                            </button>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge-minimal bg-blue-50 text-blue-700">
                          {frameworks.find(f => f.id === policy.frameworkId)?.nameAr || policy.frameworkId}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-1.5 bg-border-subtle rounded-full overflow-hidden">
                            <div 
                              className={cn("h-full transition-all duration-500", progress === 100 ? "bg-emerald-500" : "bg-primary")}
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                          <span className="text-[12px] font-bold text-text-main">{progress}%</span>
                        </div>
                      </td>
                      <td>
                        <div className={cn("flex", isRtl ? "justify-start" : "justify-end")}>
                          <div className="inline-flex items-center rounded-lg border border-border-subtle bg-white shadow-sm overflow-hidden divide-x divide-border-subtle rtl:divide-x-reverse">
                            {can('policies.policy_items.create') && (
                              <button
                                type="button"
                                title={isRtl ? 'إضافة بند' : 'Add Item'}
                                onClick={() => {
                                  setSelectedPolicyId(policy.id);
                                  setIsAddItemDialogOpen(true);
                                }}
                                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50/60 transition-colors"
                              >
                                <PlusCircle className="w-4 h-4" />
                              </button>
                            )}
                            {can('policies.edit') && (
                              <button
                                type="button"
                                title={t('edit_policy') || (isRtl ? 'تعديل السياسة' : 'Edit Policy')}
                                onClick={() => openEditPolicy(policy)}
                                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50/60 transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                            {can('policies.delete') && (
                              <button
                                type="button"
                                title={t('delete')}
                                onClick={() => handleDelete(policy.id)}
                                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50/60 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
            ) : (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-text-muted font-medium">
                    {t('no_data')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          total={sortedPolicies.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Quick Add Policy Item Dialog */}
      <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{isRtl ? 'إضافة بند رئيسي للسياسة' : 'Add Main Policy Item'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="grid gap-2">
              <label className="text-[13px] font-bold text-text-main">{t('name_ar')} <span className="text-red-500">*</span></label>
              <Input 
                value={newItem.nameAr} 
                onChange={e => setNewItem({...newItem, nameAr: e.target.value})}
                placeholder="مثال: البند الأول: إدارة الأصول"
                className="rounded-lg border-border-subtle h-11"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-[13px] font-bold text-text-main">{t('name_en')} <span className="text-red-500">*</span></label>
              <Input 
                value={newItem.nameEn} 
                onChange={e => setNewItem({...newItem, nameEn: e.target.value})}
                placeholder="Example: Item 1: Asset Management"
                className="rounded-lg border-border-subtle h-11"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-[13px] font-bold text-text-main">{t('description_ar')}</label>
              <Input 
                value={newItem.descriptionAr} 
                onChange={e => setNewItem({...newItem, descriptionAr: e.target.value})}
                className="rounded-lg border-border-subtle h-11"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-[13px] font-bold text-text-main">{t('description_en')}</label>
              <Input 
                value={newItem.descriptionEn} 
                onChange={e => setNewItem({...newItem, descriptionEn: e.target.value})}
                className="rounded-lg border-border-subtle h-11"
              />
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setIsAddItemDialogOpen(false)} className="rounded-lg h-11 px-6 font-bold">{t('cancel')}</Button>
            <Button onClick={handleAddItem} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg h-11 px-8 font-bold">{t('save')}</Button>
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
              {t('confirm_delete_policy_desc') || 'Are you sure you want to delete this policy? This action will remove all related standards and procedures.'}
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

      {/* Policy detail popup — lists items / standards / procedures for the selected policy. */}
      <Dialog open={!!detailDialog} onOpenChange={(v) => { if (!v) setDetailDialog(null); }}>
        <DialogContent className="sm:max-w-[640px] max-h-[80vh] overflow-hidden flex flex-col rounded-2xl border-none shadow-2xl" dir={isRtl ? 'rtl' : 'ltr'}>
          {detailDialog && (() => {
            const { type, policy } = detailDialog;
            const policyName = isRtl ? policy.nameAr : policy.nameEn;
            const items = type === 'items' ? mockService.getPolicyItems(policy.id) : [];
            const polStandardIds = mockService._standardsInPolicy(policy.id);
            const stdsList = type === 'standards' ? standards.filter(s => polStandardIds.includes(s.id)) : [];
            const procsList = type === 'procedures' ? procedures.filter(p => polStandardIds.includes(p.standardId)) : [];
            const config = {
              items: { title: isRtl ? 'البنود' : 'Items', color: 'violet', count: items.length },
              standards: { title: isRtl ? 'المعايير' : 'Standards', color: 'blue', count: stdsList.length },
              procedures: { title: isRtl ? 'الإجراءات' : 'Procedures', color: 'emerald', count: procsList.length },
            }[type];

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold flex items-center gap-2">
                    <span className={cn(
                      'inline-flex items-center justify-center w-8 h-8 rounded-lg',
                      config.color === 'violet' && 'bg-violet-50 text-violet-600',
                      config.color === 'blue' && 'bg-blue-50 text-blue-600',
                      config.color === 'emerald' && 'bg-emerald-50 text-emerald-600',
                    )}>
                      {type === 'procedures' ? <Activity className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    </span>
                    {config.title}
                    <span className="text-[12px] font-normal text-text-muted">({config.count})</span>
                  </DialogTitle>
                  <p className="text-[12px] text-text-muted font-medium truncate mt-1">{policyName}</p>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto -mx-2 px-2 mt-2">
                  {config.count === 0 ? (
                    <div className="text-center py-12 text-text-muted text-[13px] font-medium">
                      {isRtl ? 'لا توجد عناصر' : 'No items'}
                    </div>
                  ) : type === 'items' ? (
                    <ul className="divide-y divide-border-subtle">
                      {items.map((it: any) => (
                        <li key={it.id} className="py-3 px-2 hover:bg-slate-50/60 rounded-lg">
                          <p className="font-bold text-[13px] text-text-main">{isRtl ? it.nameAr : it.nameEn}</p>
                          {(isRtl ? it.descriptionAr : it.descriptionEn) && (
                            <p className="text-[11px] text-text-muted mt-0.5 line-clamp-2">{isRtl ? it.descriptionAr : it.descriptionEn}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : type === 'standards' ? (
                    <ul className="divide-y divide-border-subtle">
                      {stdsList.map(s => {
                        const sProgress = mockService.getStandardProgress(s.id);
                        return (
                          <li key={s.id} className="py-3 px-2 hover:bg-slate-50/60 rounded-lg">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-bold text-[13px] text-text-main flex-1 min-w-0 truncate">{isRtl ? s.nameAr : s.nameEn}</p>
                              <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md shrink-0">{sProgress}%</span>
                            </div>
                            {(isRtl ? s.descriptionAr : s.descriptionEn) && (
                              <p className="text-[11px] text-text-muted mt-0.5 line-clamp-2">{isRtl ? s.descriptionAr : s.descriptionEn}</p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <ul className="divide-y divide-border-subtle">
                      {procsList.map(p => {
                        const std = standards.find(s => s.id === p.standardId);
                        const statusColor = p.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : p.status === 'in_progress' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600';
                        return (
                          <li key={p.id} className="py-3 px-2 hover:bg-slate-50/60 rounded-lg">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-bold text-[13px] text-text-main flex-1 min-w-0 truncate">{isRtl ? p.nameAr : p.nameEn}</p>
                              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0', statusColor)}>{t(p.status)}</span>
                            </div>
                            <p className="text-[11px] text-text-muted mt-0.5 truncate">
                              {std ? (isRtl ? std.nameAr : std.nameEn) : '—'}
                            </p>
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

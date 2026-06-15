import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Edit2, Trash2, Shield, Zap, Info, Save, FileText, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { mockService } from '@/services/mockService';
import { Framework, Policy } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Tooltip } from '@/components/ui/tooltip';
import { useAuth } from '@/AuthContext';

export default function FrameworksPage() {
  const { t, i18n } = useTranslation();
  const { can } = useAuth();
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);
  const [editingFramework, setEditingFramework] = useState<Framework | null>(null);
  const [formData, setFormData] = useState<Partial<Framework>>({});

  // Framework Details state
  const [selectedFrameworkDetails, setSelectedFrameworkDetails] = useState<Framework | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Quick Add Policy state
  const [isQuickPolicyOpen, setIsQuickPolicyOpen] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState<Framework | null>(null);
  const [policyFormData, setPolicyFormData] = useState({
    nameAr: '',
    nameEn: '',
    descriptionAr: '',
    descriptionEn: '',
  });

  const isRtl = i18n.language === 'ar';

  useEffect(() => {
    setFrameworks(mockService.getFrameworks());
    setPolicies(mockService.getPolicies());
  }, []);

  const handleOpenDialog = (framework?: Framework) => {
    if (framework) {
      setEditingFramework(framework);
      setFormData(framework);
    } else {
      setEditingFramework(null);
      setFormData({});
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.nameAr || !formData.nameEn) {
      toast.error(t('fill_required_fields'));
      return;
    }

    const framework: Framework = {
      id: editingFramework?.id || Math.random().toString(36).substr(2, 9),
      nameAr: formData.nameAr || '',
      nameEn: formData.nameEn || '',
      descriptionAr: formData.descriptionAr || '',
      descriptionEn: formData.descriptionEn || '',
      createdAt: editingFramework?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockService.saveFramework(framework);
    setFrameworks(mockService.getFrameworks());
    setIsDialogOpen(false);
    toast.success(editingFramework ? t('framework_updated_success') : t('framework_added_success'));
  };

  const handleQuickSavePolicy = () => {
    if (!selectedFramework) return;
    if (!policyFormData.nameAr || !policyFormData.nameEn) {
      toast.error(t('fill_required_fields'));
      return;
    }

    const policy = {
      id: Math.random().toString(36).substr(2, 9),
      nameAr: policyFormData.nameAr,
      nameEn: policyFormData.nameEn,
      descriptionAr: policyFormData.descriptionAr,
      descriptionEn: policyFormData.descriptionEn,
      frameworkId: selectedFramework.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockService.savePolicy(policy);
    setPolicies(mockService.getPolicies());
    setIsQuickPolicyOpen(false);
    toast.success(t('policy_added_success') || 'Policy added successfully');
  };

  const handleDelete = (id: string) => {
    const frameworkPolicies = policies.filter(p => p.frameworkId === id);
    if (frameworkPolicies.length > 0) {
      toast.error(t('cannot_delete_framework_policies') || 'Cannot delete framework because it has associated policies');
      return;
    }
    setIdToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (idToDelete) {
      mockService.deleteFramework(idToDelete);
      setFrameworks(mockService.getFrameworks());
      setIsDeleteConfirmOpen(false);
      setIdToDelete(null);
      toast.success(t('framework_deleted_success'));
    }
  };

  const filteredFrameworks = frameworks.filter(f => 
    f.nameAr.includes(searchTerm) || f.nameEn.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-main">{t('frameworks')}</h1>
          <p className="text-text-muted mt-1">{t('manage_frameworks_desc')}</p>
        </div>

        {can('frameworks.create') && (
          <Button
            onClick={() => handleOpenDialog()}
            className="bg-primary hover:bg-primary/90 text-white font-bold px-6 h-11 rounded-lg shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('add_framework')}
          </Button>
        )}
      </div>

      <div className="table-container">
        <div className="section-header">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input 
              className="pl-10 rounded-lg border-border-subtle bg-slate-50/50 h-11" 
              placeholder={t('search')} 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className={isRtl ? "text-right" : "text-left"}>{t('framework_name')}</th>
                <th className={isRtl ? "text-right" : "text-left"}>{t('description')}</th>
                <th className={isRtl ? "text-right" : "text-left"}>{t('updated_at')}</th>
                <th className={isRtl ? "text-left" : "text-right"}>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredFrameworks.map((framework) => (
                <tr key={framework.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="max-w-[250px]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <Tooltip content={isRtl ? framework.nameAr : framework.nameEn}>
                          <span 
                            className="font-bold text-text-main cursor-pointer hover:text-primary transition-colors truncate"
                            onClick={() => {
                              setSelectedFrameworkDetails(framework);
                              setIsDetailsOpen(true);
                            }}
                          >
                            {isRtl ? framework.nameAr : framework.nameEn}
                          </span>
                        </Tooltip>
                        <div className="flex items-center gap-1 mt-0.5">
                          <FileText className="w-3 h-3 text-text-muted" />
                          <span className="text-[10px] font-bold text-text-muted">
                            {policies.filter(p => p.frameworkId === framework.id).length} {t('policies')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="max-w-xs text-text-muted">
                    <Tooltip content={isRtl ? framework.descriptionAr : framework.descriptionEn}>
                      <p className="truncate cursor-help">
                        {isRtl ? framework.descriptionAr : framework.descriptionEn}
                      </p>
                    </Tooltip>
                  </td>
                  <td className="text-text-muted text-[13px]">
                    {new Date(framework.updatedAt).toLocaleDateString(isRtl ? 'ar-SA' : 'en-US')}
                  </td>
                  <td>
                    <div className={cn("flex", isRtl ? "justify-start" : "justify-end")}>
                      <div className="inline-flex items-center rounded-lg border border-border-subtle bg-white shadow-sm overflow-hidden divide-x divide-border-subtle rtl:divide-x-reverse">
                        {can('policies.create') && (
                          <button
                            type="button"
                            title={t('quick_add_policy')}
                            onClick={() => {
                              setSelectedFramework(framework);
                              setPolicyFormData({
                                nameAr: '',
                                nameEn: '',
                                descriptionAr: '',
                                descriptionEn: '',
                              });
                              setIsQuickPolicyOpen(true);
                            }}
                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50/60 transition-colors"
                          >
                            <Zap className="w-4 h-4" />
                          </button>
                        )}
                        {can('frameworks.edit') && (
                          <button
                            type="button"
                            title={t('edit')}
                            onClick={() => handleOpenDialog(framework)}
                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50/60 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {can('frameworks.delete') && (
                          <button
                            type="button"
                            title={t('delete')}
                            onClick={() => handleDelete(framework.id)}
                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50/60 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingFramework ? t('edit_framework') : t('add_framework')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="grid gap-2">
              <label className="text-[13px] font-bold text-text-main">{t('name_ar')} <span className="text-red-500">*</span></label>
              <Input 
                value={formData.nameAr || ''} 
                onChange={e => setFormData({...formData, nameAr: e.target.value})}
                placeholder="مثال: ضوابط الأمن السيبراني"
                className="rounded-lg border-border-subtle h-11"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-[13px] font-bold text-text-main">{t('name_en')} <span className="text-red-500">*</span></label>
              <Input 
                value={formData.nameEn || ''} 
                onChange={e => setFormData({...formData, nameEn: e.target.value})}
                placeholder="Example: Cybersecurity Framework"
                className="rounded-lg border-border-subtle h-11"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-[13px] font-bold text-text-main">{t('desc_ar')}</label>
              <Input 
                value={formData.descriptionAr || ''} 
                onChange={e => setFormData({...formData, descriptionAr: e.target.value})}
                className="rounded-lg border-border-subtle h-11"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-[13px] font-bold text-text-main">{t('desc_en')}</label>
              <Input 
                value={formData.descriptionEn || ''} 
                onChange={e => setFormData({...formData, descriptionEn: e.target.value})}
                className="rounded-lg border-border-subtle h-11"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="font-bold">
              {t('cancel')}
            </Button>
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-white font-bold px-8">
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Add Policy Dialog */}
      <Dialog open={isQuickPolicyOpen} onOpenChange={setIsQuickPolicyOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-2xl border-none shadow-2xl p-0 overflow-hidden">
          <div className="flex flex-col">
            {/* Header */}
            <div className="p-6 bg-emerald-600 text-white relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{t('quick_add_policy')}</h2>
                    <p className="text-white/70 text-xs mt-0.5">
                      {isRtl ? `إضافة سياسة جديدة لإطار العمل: ${selectedFramework?.nameAr}` : `Adding policy to: ${selectedFramework?.nameEn}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="p-6 space-y-5 bg-white">
              <div className="flex items-center gap-2 text-primary font-bold text-sm mb-1 px-1">
                <Info className="w-4 h-4 text-emerald-500" />
                {t('basic_info')}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider px-1">{t('name_ar')} <span className="text-red-500">*</span></label>
                  <Input 
                    value={policyFormData.nameAr}
                    onChange={e => setPolicyFormData({...policyFormData, nameAr: e.target.value})}
                    placeholder="مثال: سياسة أمن الحسابات"
                    className="rounded-xl border-border-subtle h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider px-1">{t('name_en')} <span className="text-red-500">*</span></label>
                  <Input 
                    value={policyFormData.nameEn}
                    onChange={e => setPolicyFormData({...policyFormData, nameEn: e.target.value})}
                    placeholder="Example: Account Security Policy"
                    className="rounded-xl border-border-subtle h-11"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider px-1">{t('desc_ar')}</label>
                <textarea 
                  value={policyFormData.descriptionAr}
                  onChange={e => setPolicyFormData({...policyFormData, descriptionAr: e.target.value})}
                  className="w-full min-h-[100px] rounded-xl border border-border-subtle p-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none transition-all"
                  placeholder={t('desc_ar')}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider px-1">{t('desc_en')}</label>
                <textarea 
                  value={policyFormData.descriptionEn}
                  onChange={e => setPolicyFormData({...policyFormData, descriptionEn: e.target.value})}
                  className="w-full min-h-[100px] rounded-xl border border-border-subtle p-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none transition-all"
                  placeholder={t('desc_en')}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border-subtle bg-slate-50 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsQuickPolicyOpen(false)} className="rounded-xl font-bold h-11 px-6">
                {t('cancel')}
              </Button>
              <Button 
                onClick={handleQuickSavePolicy}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-10 rounded-xl shadow-lg shadow-emerald-600/20 transition-all hover:-translate-y-0.5"
              >
                <Save className="w-4 h-4 mr-2" />
                {t('save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Framework Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-2xl border-none shadow-2xl p-0 overflow-hidden">
          <div className="flex flex-col">
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10 shadow-inner">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">
                      {isRtl ? selectedFrameworkDetails?.nameAr : selectedFrameworkDetails?.nameEn}
                    </h2>
                    <p className="text-white/50 text-[11px] font-medium tracking-wide uppercase mt-0.5 flex items-center gap-1.5">
                      <FileText className="w-3 h-3" />
                      {policies.filter(p => p.frameworkId === selectedFrameworkDetails?.id).length} {t('policies')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* List Body */}
            <div className="p-6 bg-white space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 px-1">
                {t('associated_policies')}
              </h3>
              
              <div className="space-y-2.5">
                {policies.filter(p => p.frameworkId === selectedFrameworkDetails?.id).map((policy) => {
                  const progress = mockService.getPolicyProgress(policy.id);
                  return (
                    <div 
                      key={policy.id} 
                      className="group flex flex-col p-3.5 rounded-xl border border-border-subtle bg-slate-50/30 hover:bg-white hover:shadow-md hover:border-primary/20 transition-all cursor-default"
                    >
                      <div className="flex items-center justify-between gap-4 mb-2.5">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                            progress === 100 ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"
                          )}>
                            <Shield className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-text-main group-hover:text-primary transition-colors">
                              {isRtl ? policy.nameAr : policy.nameEn}
                            </p>
                            <p className="text-[10px] text-text-muted font-medium mt-0.5 opacity-70">
                              {isRtl ? policy.descriptionAr : policy.descriptionEn}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className="text-text-muted">{t('progress')}</span>
                          <span className={cn(progress === 100 ? "text-emerald-600" : "text-primary")}>{progress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200/50 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              progress === 100 ? "bg-emerald-500" : "bg-primary"
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {policies.filter(p => p.frameworkId === selectedFrameworkDetails?.id).length === 0 && (
                <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-200">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-sm font-medium text-text-muted">{t('no_policies_found') || 'No policies found'}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border-subtle bg-slate-50/50 flex justify-end">
              <Button 
                variant="ghost" 
                onClick={() => setIsDetailsOpen(false)}
                className="rounded-xl font-bold text-sm h-11 px-6 hover:bg-slate-200/50 transition-colors"
              >
                {t('close')}
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
              {t('confirm_delete_framework_desc') || 'Are you sure you want to delete this framework? This action will remove all related policies and standards.'}
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
    </div>
  );
}

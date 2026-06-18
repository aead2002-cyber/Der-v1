import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Info, Shield, Check, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Standard, Policy, StandardClassification, PolicyItem } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AttachmentsField } from './AttachmentsField';
import { policiesApi } from '@/services/policiesApi';
import { policyItemsApi } from '@/services/policyItemsApi';
import { standardsApi } from '@/services/standardsApi';
import { standardClassificationsApi } from '@/services/standardClassificationsApi';

interface Props {
  open: boolean;
  standardId: string | null; // null = new
  onSaved: () => void | Promise<void>;
  onClose: () => void;
}

const emptyForm = {
  nameAr: '',
  nameEn: '',
  descriptionAr: '',
  descriptionEn: '',
  policyId: '',
  policyItemId: '',
  classifications: [] as string[],
  attachments: [] as string[],
  potentialRisksAr: '',
  potentialRisksEn: '',
};

export function StandardFormDialog({ open, standardId, onSaved, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [classifications, setClassifications] = useState<StandardClassification[]>([]);
  const [items, setItems] = useState<PolicyItem[]>([]);
  const [formData, setFormData] = useState(emptyForm);
  const [existingCreatedAt, setExistingCreatedAt] = useState<any>(null);

  useEffect(() => {
    if (!open) return;
    const loadData = async () => {
      try {
        const [policyRows, classificationRows, standardRows] = await Promise.all([
          policiesApi.getPolicies(),
          standardClassificationsApi.getStandardClassifications(),
          standardsApi.getStandards(),
        ]);
        setPolicies(policyRows);
        setClassifications(classificationRows);

        if (standardId) {
          const existing = standardRows.find(s => s.id === standardId);
          if (existing) {
            const linkedItemIds = existing.policyItemIds?.length ? existing.policyItemIds : existing.policyItemId ? [existing.policyItemId] : [];
            setExistingCreatedAt(existing.createdAt);
            setFormData({
              nameAr: existing.nameAr,
              nameEn: existing.nameEn,
              descriptionAr: existing.descriptionAr,
              descriptionEn: existing.descriptionEn,
              policyId: existing.policyId,
              policyItemId: linkedItemIds[0] || '',
              classifications: existing.classifications || [],
              attachments: existing.attachments || [],
              potentialRisksAr: (existing as any).potentialRisksAr || '',
              potentialRisksEn: (existing as any).potentialRisksEn || '',
            });
          }
        } else {
          setExistingCreatedAt(null);
          setFormData(emptyForm);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load standard');
      }
    };
    loadData();
  }, [open, standardId]);

  useEffect(() => {
    const loadItems = async () => {
      if (formData.policyId) {
        try {
          setItems(await policyItemsApi.getPolicyItems(formData.policyId));
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to load policy items');
        }
      } else {
        setItems([]);
      }
    };
    loadItems();
  }, [formData.policyId]);

  const toggleClassification = (classId: string) => {
    setFormData(prev => ({
      ...prev,
      classifications: prev.classifications.includes(classId)
        ? prev.classifications.filter(id => id !== classId)
        : [...prev.classifications, classId],
    }));
  };

  const handleSave = async () => {
    if (!formData.nameAr || !formData.nameEn || !formData.policyId) {
      toast.error(t('fill_required_fields'));
      return;
    }
    const standard: Standard = {
      id: standardId || Math.random().toString(36).substr(2, 9),
      ...formData,
      policyItemId: formData.policyItemId || undefined,
      policyItemIds: formData.policyItemId ? [formData.policyItemId] : [],
      createdAt: existingCreatedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      if (standardId) {
        await standardsApi.updateStandard(standardId, standard);
      } else {
        await standardsApi.createStandard(standard);
      }
      toast.success(standardId ? t('standard_updated_success') : t('standard_added_success'));
      await onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Standard could not be saved');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto rounded-xl border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {standardId ? (t('edit_standard') || 'Edit Standard') : t('add_standard')}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-border-subtle p-5 space-y-4">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Info className="w-5 h-5" />
                {t('basic_info')}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-text-main">{t('name_ar')} <span className="text-red-500">*</span></label>
                  <Input
                    value={formData.nameAr || ''}
                    onChange={e => setFormData({ ...formData, nameAr: e.target.value })}
                    className="rounded-lg border-border-subtle h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-text-main">{t('name_en')} <span className="text-red-500">*</span></label>
                  <Input
                    value={formData.nameEn || ''}
                    onChange={e => setFormData({ ...formData, nameEn: e.target.value })}
                    className="rounded-lg border-border-subtle h-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-text-main">{isRtl ? 'الهدف (عربي)' : 'Objective (Arabic)'}</label>
                  <textarea
                    value={formData.descriptionAr || ''}
                    onChange={e => setFormData({ ...formData, descriptionAr: e.target.value })}
                    className="w-full min-h-[90px] rounded-lg border border-border-subtle p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-transparent"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-text-main">{isRtl ? 'الهدف (إنجليزي)' : 'Objective (English)'}</label>
                  <textarea
                    value={formData.descriptionEn || ''}
                    onChange={e => setFormData({ ...formData, descriptionEn: e.target.value })}
                    className="w-full min-h-[90px] rounded-lg border border-border-subtle p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-transparent"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-border-subtle">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-rose-700">{isRtl ? 'المخاطر المحتملة (عربي)' : 'Potential Risks (Arabic)'}</label>
                  <textarea
                    value={formData.potentialRisksAr || ''}
                    onChange={e => setFormData({ ...formData, potentialRisksAr: e.target.value })}
                    className="w-full min-h-[80px] rounded-lg border border-rose-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-rose-50/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-rose-700">{isRtl ? 'المخاطر المحتملة (إنجليزي)' : 'Potential Risks (English)'}</label>
                  <textarea
                    value={formData.potentialRisksEn || ''}
                    onChange={e => setFormData({ ...formData, potentialRisksEn: e.target.value })}
                    className="w-full min-h-[80px] rounded-lg border border-rose-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-rose-50/30"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-border-subtle">
                <AttachmentsField
                  value={formData.attachments}
                  onChange={(next) => setFormData({ ...formData, attachments: next })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-border-subtle p-5 space-y-4">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Shield className="w-5 h-5" />
                {t('classification')}
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-text-main">{t('policy')} <span className="text-red-500">*</span></label>
                <Select
                  value={formData.policyId || ''}
                  onValueChange={val => setFormData({ ...formData, policyId: val, policyItemId: '' })}
                >
                  <SelectTrigger className="rounded-lg border-border-subtle h-10">
                    <SelectValue placeholder={t('select_policy')}>
                      {formData.policyId
                        ? (policies.find(p => p.id === formData.policyId)?.[isRtl ? 'nameAr' : 'nameEn'] || t('select_policy'))
                        : t('select_policy')}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {policies.map(p => (
                      <SelectItem key={p.id} value={p.id}>{isRtl ? p.nameAr : p.nameEn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-text-main">{t('policy_items')}</label>
                <Select
                  value={formData.policyItemId || ''}
                  onValueChange={val => setFormData({ ...formData, policyItemId: val })}
                  disabled={!formData.policyId}
                >
                  <SelectTrigger className="rounded-lg border-border-subtle h-10">
                    <SelectValue placeholder={t('select_item')}>
                      {formData.policyItemId
                        ? (items.find(i => i.id === formData.policyItemId)?.[isRtl ? 'nameAr' : 'nameEn'] || t('select_item'))
                        : t('select_item')}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {items.map(item => (
                      <SelectItem key={item.id} value={item.id}>{isRtl ? item.nameAr : item.nameEn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-[12px] font-bold text-text-main flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-text-muted" />
                  {t('classifications')}
                </label>
                <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
                  {classifications.length === 0 ? (
                    <p className="text-xs text-text-muted italic">{t('no_data')}</p>
                  ) : (
                    classifications.map(c => (
                      <div
                        key={c.id}
                        onClick={() => toggleClassification(c.id)}
                        className={cn(
                          'flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all',
                          formData.classifications.includes(c.id)
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border-subtle hover:border-primary/50'
                        )}
                      >
                        <span className="text-sm font-medium">{isRtl ? c.nameAr : c.nameEn}</span>
                        {formData.classifications.includes(c.id) && <Check className="w-4 h-4" />}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
          <Button variant="outline" onClick={onClose} className="rounded-lg h-10 px-5 font-bold">
            <X className="w-4 h-4 mr-1" />
            {t('cancel')}
          </Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-white rounded-lg h-10 px-6 font-bold">
            <Save className="w-4 h-4 mr-1" />
            {t('save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, X, Shield, Layers } from 'lucide-react';
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
import { mockService } from '@/services/mockService';
import { PolicyItem, Policy } from '@/types';
import { toast } from 'sonner';
import { AttachmentsField } from './AttachmentsField';

interface Props {
  open: boolean;
  itemId: string | null;
  parentId?: string;
  defaultPolicyId?: string;
  onSaved: () => void;
  onClose: () => void;
}

const empty: Partial<PolicyItem> = {
  nameAr: '',
  nameEn: '',
  descriptionAr: '',
  descriptionEn: '',
  policyId: '',
  parentId: '',
  order: 0,
  attachments: [],
};

export function PolicyItemFormDialog({ open, itemId, parentId, defaultPolicyId, onSaved, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [allItems, setAllItems] = useState<PolicyItem[]>([]);
  const [formData, setFormData] = useState<Partial<PolicyItem>>(empty);

  useEffect(() => {
    if (!open) return;
    setPolicies(mockService.getPolicies());
    const items = mockService.getPolicyItems();
    setAllItems(items);

    if (itemId) {
      const existing = items.find(i => i.id === itemId);
      if (existing) setFormData(existing);
    } else if (parentId) {
      const parent = items.find(i => i.id === parentId);
      setFormData({ ...empty, parentId, policyId: parent?.policyId || defaultPolicyId || '' });
    } else {
      setFormData({ ...empty, policyId: defaultPolicyId || '' });
    }
  }, [open, itemId, parentId, defaultPolicyId]);

  const isDescendant = (checkId: string, ancestorId: string, items: PolicyItem[]): boolean => {
    const item = items.find(i => i.id === checkId);
    if (!item || !item.parentId) return false;
    if (item.parentId === ancestorId) return true;
    return isDescendant(item.parentId, ancestorId, items);
  };

  const availableParents = allItems.filter(i =>
    i.policyId === formData.policyId &&
    i.id !== itemId &&
    (!itemId || !isDescendant(i.id, itemId, allItems))
  );

  const handleSave = () => {
    if (!formData.nameAr || !formData.nameEn || !formData.policyId) {
      toast.error(t('please_fill_all_fields') || t('fill_required_fields'));
      return;
    }

    const itemData: PolicyItem = {
      id: itemId || Math.random().toString(36).substr(2, 9),
      nameAr: formData.nameAr!,
      nameEn: formData.nameEn!,
      descriptionAr: formData.descriptionAr || '',
      descriptionEn: formData.descriptionEn || '',
      policyId: formData.policyId!,
      parentId: formData.parentId || undefined,
      order: formData.order || 0,
      attachments: formData.attachments || [],
      createdAt: formData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockService.savePolicyItem(itemData);
    toast.success(itemId ? t('policy_item_updated_success') : t('policy_item_added_success'));
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto rounded-xl border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {itemId ? t('edit_policy_item') : t('add_policy_item')}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-3">
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-text-main flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-primary" />
              {t('policy')} <span className="text-red-500">*</span>
            </label>
            <Select
              value={formData.policyId || ''}
              onValueChange={(val) => setFormData({ ...formData, policyId: val, parentId: '' })}
            >
              <SelectTrigger className="h-10 rounded-lg bg-slate-50 border-border-subtle">
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
            <label className="text-[12px] font-bold text-text-main flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary" />
              {t('parent_item')}
            </label>
            <Select
              value={formData.parentId || 'none'}
              onValueChange={(val) => setFormData({ ...formData, parentId: val === 'none' ? '' : val })}
              disabled={!formData.policyId}
            >
              <SelectTrigger className="h-10 rounded-lg bg-slate-50 border-border-subtle disabled:opacity-50">
                <SelectValue placeholder={t('select_item')}>
                  {!formData.parentId || formData.parentId === 'none'
                    ? t('main_item')
                    : (availableParents.find(i => i.id === formData.parentId)?.[isRtl ? 'nameAr' : 'nameEn'] || t('select_item'))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('main_item')}</SelectItem>
                {availableParents.map(i => (
                  <SelectItem key={i.id} value={i.id}>{isRtl ? i.nameAr : i.nameEn}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-text-main">{t('name_ar')} <span className="text-red-500">*</span></label>
            <Input
              value={formData.nameAr || ''}
              onChange={e => setFormData({ ...formData, nameAr: e.target.value })}
              className="h-10 rounded-lg bg-slate-50 border-border-subtle"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-text-main">{t('name_en')} <span className="text-red-500">*</span></label>
            <Input
              value={formData.nameEn || ''}
              onChange={e => setFormData({ ...formData, nameEn: e.target.value })}
              className="h-10 rounded-lg bg-slate-50 border-border-subtle"
              dir="ltr"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-text-main">{t('description_ar')}</label>
            <textarea
              value={formData.descriptionAr || ''}
              onChange={e => setFormData({ ...formData, descriptionAr: e.target.value })}
              className="w-full min-h-[90px] rounded-lg border border-border-subtle p-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-text-main">{t('description_en')}</label>
            <textarea
              value={formData.descriptionEn || ''}
              onChange={e => setFormData({ ...formData, descriptionEn: e.target.value })}
              className="w-full min-h-[90px] rounded-lg border border-border-subtle p-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              dir="ltr"
            />
          </div>

          <div className="md:col-span-2 pt-3 border-t border-border-subtle">
            <AttachmentsField
              value={formData.attachments || []}
              onChange={(next) => setFormData({ ...formData, attachments: next })}
            />
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

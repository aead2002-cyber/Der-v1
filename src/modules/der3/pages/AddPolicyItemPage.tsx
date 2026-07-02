import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  X,
  Shield,
  FileText,
  Layers
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
import { PolicyItem, Policy } from '@/types';
import { toast } from 'sonner';
import { AttachmentsField } from '@/modules/der3/components/AttachmentsField';
import { policiesApi } from '@/modules/der3/services/policiesApi';
import { policyItemsApi } from '@/modules/der3/services/policyItemsApi';

export default function AddPolicyItemPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isRtl = i18n.language === 'ar';

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [allItems, setAllItems] = useState<PolicyItem[]>([]);
  const [formData, setFormData] = useState<Partial<PolicyItem>>({
    nameAr: '',
    nameEn: '',
    descriptionAr: '',
    descriptionEn: '',
    policyId: '',
    parentId: '',
    order: 0,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [policyRows, itemRows] = await Promise.all([
          policiesApi.getPolicies(),
          policyItemsApi.getPolicyItems(),
        ]);
        setPolicies(policyRows);
        setAllItems(itemRows);
        
        if (id) {
          const item = itemRows.find(i => i.id === id);
          if (item) {
            setFormData(item);
          }
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load policy item');
      }
    };
    loadData();
  }, [id]);

  const availableParents = allItems.filter(i => 
    i.policyId === formData.policyId && 
    i.id !== id && 
    (!id || !isDescendant(i.id, id, allItems))
  );

  function isDescendant(checkId: string, potentialAncestorId: string, items: PolicyItem[]): boolean {
    const item = items.find(i => i.id === checkId);
    if (!item || !item.parentId) return false;
    if (item.parentId === potentialAncestorId) return true;
    return isDescendant(item.parentId, potentialAncestorId, items);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nameAr || !formData.nameEn || !formData.policyId) {
      toast.error(t('please_fill_all_fields'));
      return;
    }

    const itemData: PolicyItem = {
      id: id || Math.random().toString(36).substr(2, 9),
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

    try {
      if (id) {
        await policyItemsApi.updatePolicyItem(id, itemData);
      } else {
        await policyItemsApi.createPolicyItem(itemData);
      }
      toast.success(id ? t('policy_item_updated_success') : t('policy_item_added_success'));
      navigate('/policy-items');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Policy item could not be saved');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/policy-items')}
          className="rounded-full hover:bg-slate-100"
        >
          {isRtl ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-text-main">
            {id ? t('edit_policy_item') : t('add_policy_item')}
          </h1>
          <p className="text-text-muted">{t('fill_details_standard')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-border-subtle space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-sm font-bold text-text-main flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                {t('policy')}
                <span className="text-red-500">*</span>
              </label>
              <Select 
                value={formData.policyId || ''} 
                onValueChange={(val) => {
                  setFormData({ ...formData, policyId: val, parentId: '' });
                }}
              >
                <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-border-subtle">
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
            <div className="space-y-2">
              <label className="text-sm font-bold text-text-main flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                {t('parent_item')}
              </label>
              <Select 
                value={formData.parentId || 'none'} 
                onValueChange={(val) => {
                  const actualParentId = val === 'none' ? '' : val;
                  setFormData({ ...formData, parentId: actualParentId });
                }}
                disabled={!formData.policyId}
              >
                <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-border-subtle disabled:opacity-50">
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-sm font-bold text-text-main">{t('name_ar')} <span className="text-red-500">*</span></label>
              <Input 
                value={formData.nameAr || ''}
                onChange={e => setFormData({ ...formData, nameAr: e.target.value })}
                className="h-12 rounded-xl bg-slate-50 border-border-subtle" 
                placeholder="مثلاً: إدارة الوصول"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-text-main">{t('name_en')} <span className="text-red-500">*</span></label>
              <Input 
                value={formData.nameEn || ''}
                onChange={e => setFormData({ ...formData, nameEn: e.target.value })}
                className="h-12 rounded-xl bg-slate-50 border-border-subtle" 
                placeholder="E.g., Access Management"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-sm font-bold text-text-main">{t('description_ar')}</label>
              <textarea 
                value={formData.descriptionAr || ''}
                onChange={e => setFormData({ ...formData, descriptionAr: e.target.value })}
                className="w-full min-h-[120px] rounded-xl border border-border-subtle p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-slate-50 transition-all resize-none" 
                placeholder="وصف البند بالعربية..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-text-main">{t('description_en')}</label>
              <textarea 
                value={formData.descriptionEn || ''}
                onChange={e => setFormData({ ...formData, descriptionEn: e.target.value })}
                className="w-full min-h-[120px] rounded-xl border border-border-subtle p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-slate-50 transition-all resize-none" 
                placeholder="Item description in English..."
              />
            </div>
          </div>

          <div className="pt-2 border-t border-border-subtle">
            <AttachmentsField
              value={formData.attachments || []}
              onChange={(next) => setFormData({ ...formData, attachments: next })}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={() => navigate('/policy-items')}
            className="h-12 px-6 rounded-xl font-bold text-text-muted hover:bg-slate-100"
          >
            <X className="w-4 h-4 mr-2" />
            {t('cancel')}
          </Button>
          <Button 
            type="submit"
            className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-blue-600/20"
          >
            <Save className="w-4 h-4 mr-2" />
            {t('save')}
          </Button>
        </div>
      </form>
    </div>
  );
}

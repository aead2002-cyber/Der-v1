import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Info, 
  Shield, 
  FileText,
  Check,
  Tag
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
import { mockService } from '@/services/mockService';
import { Standard, Policy, StandardClassification, PolicyItem } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AttachmentsField } from './shared/AttachmentsField';

export default function AddStandardPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isRtl = i18n.language === 'ar';

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [classifications, setClassifications] = useState<StandardClassification[]>([]);
  const [items, setItems] = useState<PolicyItem[]>([]);
  const [formData, setFormData] = useState({
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
  });

  useEffect(() => {
    setPolicies(mockService.getPolicies());
    setClassifications(mockService.getStandardClassifications());

    if (id) {
      const existing = mockService.getStandards().find(s => s.id === id);
      if (existing) {
        setFormData({
          nameAr: existing.nameAr,
          nameEn: existing.nameEn,
          descriptionAr: existing.descriptionAr,
          descriptionEn: existing.descriptionEn,
          policyId: existing.policyId,
          policyItemId: existing.policyItemId || '',
          classifications: existing.classifications || [],
          attachments: existing.attachments || [],
          potentialRisksAr: (existing as any).potentialRisksAr || '',
          potentialRisksEn: (existing as any).potentialRisksEn || '',
        });
      }
    }
  }, [id]);

  useEffect(() => {
    if (formData.policyId) {
      setItems(mockService.getPolicyItems(formData.policyId));
    } else {
      setItems([]);
    }
  }, [formData.policyId]);

  const toggleClassification = (classId: string) => {
    setFormData(prev => ({
      ...prev,
      classifications: prev.classifications.includes(classId)
        ? prev.classifications.filter(id => id !== classId)
        : [...prev.classifications, classId]
    }));
  };

  const handleSave = () => {
    if (!formData.nameAr || !formData.nameEn || !formData.policyId) {
      toast.error(t('fill_required_fields'));
      return;
    }

    const standard: Standard = {
      id: id || Math.random().toString(36).substr(2, 9),
      ...formData,
      createdAt: id ? (mockService.getStandards().find(s => s.id === id)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockService.saveStandard(standard);
    toast.success(id ? t('standard_updated_success') : t('standard_added_success'));
    navigate('/standards');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/standards')}
            className="rounded-full hover:bg-slate-100"
          >
            <ArrowLeft className={cn("w-5 h-5", isRtl && "rotate-180")} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-main">
              {id ? t('edit_standard') || 'Edit Standard' : t('add_standard')}
            </h1>
            <p className="text-text-muted mt-1">{t('manage_standards_desc')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => navigate('/standards')}
            className="rounded-lg px-6 border-border-subtle"
          >
            {t('cancel')}
          </Button>
          <Button 
            onClick={handleSave}
            className="bg-primary hover:bg-primary/90 text-white font-bold px-8 rounded-lg shadow-lg shadow-blue-600/20"
          >
            <Save className="w-4 h-4 mr-2" />
            {t('save')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-border-subtle p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 text-primary font-bold mb-2">
              <Info className="w-5 h-5" />
              {t('basic_info')}
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-text-main">{t('name_ar')} <span className="text-red-500">*</span></label>
                <Input 
                  value={formData.nameAr || ''}
                  onChange={e => setFormData({...formData, nameAr: e.target.value})}
                  placeholder={t('name_ar')}
                  className="rounded-lg border-border-subtle h-11 focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-text-main">{t('name_en')} <span className="text-red-500">*</span></label>
                <Input 
                  value={formData.nameEn || ''}
                  onChange={e => setFormData({...formData, nameEn: e.target.value})}
                  placeholder={t('name_en')}
                  className="rounded-lg border-border-subtle h-11 focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-text-main">
                  {isRtl ? 'الهدف (عربي)' : 'Objective (Arabic)'}
                </label>
                <textarea
                  value={formData.descriptionAr || ''}
                  onChange={e => setFormData({...formData, descriptionAr: e.target.value})}
                  placeholder={isRtl ? 'الهدف من المعيار...' : 'Objective of the standard...'}
                  className="w-full min-h-[100px] rounded-lg border border-border-subtle p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-transparent"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-text-main">
                  {isRtl ? 'الهدف (إنجليزي)' : 'Objective (English)'}
                </label>
                <textarea
                  value={formData.descriptionEn || ''}
                  onChange={e => setFormData({...formData, descriptionEn: e.target.value})}
                  placeholder={isRtl ? 'الهدف بالإنجليزي...' : 'Objective in English...'}
                  className="w-full min-h-[100px] rounded-lg border border-border-subtle p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-transparent"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2 pt-4 border-t border-border-subtle">
                <label className="text-sm font-bold text-rose-700 flex items-center gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500" />
                  {isRtl ? 'المخاطر المحتملة (عربي)' : 'Potential Risks (Arabic)'}
                </label>
                <textarea
                  value={formData.potentialRisksAr || ''}
                  onChange={e => setFormData({...formData, potentialRisksAr: e.target.value})}
                  placeholder={isRtl ? 'مثال: تسرب البيانات، الوصول غير المصرح به، انقطاع الخدمة...' : 'e.g., data leakage, unauthorized access, service disruption...'}
                  className="w-full min-h-[100px] rounded-lg border border-rose-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-rose-50/30"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-rose-700 flex items-center gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500" />
                  {isRtl ? 'المخاطر المحتملة (إنجليزي)' : 'Potential Risks (English)'}
                </label>
                <textarea
                  value={formData.potentialRisksEn || ''}
                  onChange={e => setFormData({...formData, potentialRisksEn: e.target.value})}
                  placeholder={isRtl ? 'المخاطر بالإنجليزي...' : 'e.g., data leakage, unauthorized access...'}
                  className="w-full min-h-[100px] rounded-lg border border-rose-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-rose-50/30"
                  dir="ltr"
                />
              </div>

              <div className="pt-4 border-t border-border-subtle">
                <AttachmentsField
                  value={formData.attachments}
                  onChange={(next) => setFormData({ ...formData, attachments: next })}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-border-subtle p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 text-primary font-bold mb-2">
              <Shield className="w-5 h-5" />
              {t('classification')}
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-text-main">{t('policy')} <span className="text-red-500">*</span></label>
                <Select 
                  value={formData.policyId || ''} 
                  onValueChange={val => setFormData({...formData, policyId: val, policyItemId: ''})}
                >
                  <SelectTrigger className="rounded-lg border-border-subtle h-11">
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
                <label className="text-sm font-bold text-text-main">{t('policy_items')}</label>
                <Select
                  value={formData.policyItemId || ''}
                  onValueChange={val => setFormData({...formData, policyItemId: val})}
                  disabled={!formData.policyId}
                >
                  <SelectTrigger className="rounded-lg border-border-subtle h-11">
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

              <div className="space-y-3 pt-2">
                <label className="text-sm font-bold text-text-main flex items-center gap-2">
                  <Tag className="w-4 h-4 text-text-muted" />
                  {t('classifications')}
                </label>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                  {classifications.length === 0 ? (
                    <p className="text-xs text-text-muted italic">{t('no_data')}</p>
                  ) : (
                    classifications.map(c => (
                      <div 
                        key={c.id}
                        onClick={() => toggleClassification(c.id)}
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all",
                          formData.classifications.includes(c.id)
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border-subtle hover:border-primary/50"
                        )}
                      >
                        <span className="text-sm font-medium">{isRtl ? c.nameAr : c.nameEn}</span>
                        {formData.classifications.includes(c.id) && (
                          <Check className="w-4 h-4" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

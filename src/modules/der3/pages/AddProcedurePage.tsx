import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  X, 
  Info, 
  Calendar, 
  User, 
  Shield, 
  FileText,
  AlertCircle,
  RefreshCw
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
import { proceduresApi } from '@/modules/der3/services/proceduresApi';
import { policiesApi } from '@/modules/der3/services/policiesApi';
import { standardsApi } from '@/modules/der3/services/standardsApi';
import { usersApi } from '@/services/usersApi';
import { Procedure, Policy, Standard, User as UserType } from '@/types';
import { getNotificationSettings } from '@/lib/notificationSettingsStore';
import { dispatchNotification } from '@/lib/notificationDispatcher';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AttachmentsField } from '@/modules/der3/components/AttachmentsField';

export default function AddProcedurePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const parentId = searchParams.get('parentId') || undefined;
  const isRtl = i18n.language === 'ar';

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [allProcedures, setAllProcedures] = useState<Procedure[]>([]);

  const [formData, setFormData] = useState({
    nameAr: '',
    nameEn: '',
    descriptionAr: '',
    descriptionEn: '',
    policyId: '',
    standardId: '',
    status: 'not_started',
    importance: 'medium',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    assignedTo: [] as string[],
    isPeriodic: false,
    frequency: 'annual' as any,
    attachments: [] as string[],
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [policyRows, standardRows, procedureRows, userRows] = await Promise.all([
          policiesApi.getPolicies(),
          standardsApi.getStandards(),
          proceduresApi.getProcedures(),
          usersApi.getUsers(),
        ]);
        setPolicies(policyRows);
        setStandards(standardRows);
        setAllProcedures(procedureRows);
        setUsers(userRows);

        if (id) {
          const existing = procedureRows.find(p => p.id === id);
      if (existing) {
        setFormData({
          nameAr: existing.nameAr,
          nameEn: existing.nameEn,
          descriptionAr: existing.descriptionAr,
          descriptionEn: existing.descriptionEn,
          policyId: existing.policyId,
          standardId: existing.standardId,
          status: existing.status,
          importance: existing.importance,
          startDate: existing.startDate,
          endDate: existing.endDate,
          assignedTo: existing.assignedTo,
          isPeriodic: existing.isPeriodic || false,
          frequency: existing.frequency || 'annual',
          attachments: existing.attachments || [],
        });
          }
        } else if (parentId) {
          const parent = procedureRows.find(p => p.id === parentId);
      if (parent) {
        setFormData({
          nameAr: '',
          nameEn: '',
          descriptionAr: parent.descriptionAr || '',
          descriptionEn: parent.descriptionEn || '',
          policyId: parent.policyId,
          standardId: parent.standardId,
          status: 'not_started',
          importance: parent.importance,
          startDate: parent.startDate,
          endDate: parent.endDate,
          assignedTo: [...(parent.assignedTo || [])],
          isPeriodic: parent.isPeriodic || false,
          frequency: parent.frequency || 'annual',
          attachments: [],
        });
          }
        }
      } catch (err: any) {
        console.error(err);
        toast.error(err?.message || 'Could not load procedure data');
      }
    };

    loadData();
  }, [id, parentId]);

  const handleSave = async () => {
    if (!formData.nameAr || !formData.nameEn || !formData.policyId || !formData.standardId) {
      toast.error(t('fill_required_fields'));
      return;
    }

    const existingForEdit = id ? allProcedures.find(p => p.id === id) : null;
    const procedure: Procedure = {
      id: id || Math.random().toString(36).substr(2, 9),
      parentId: existingForEdit?.parentId ?? parentId,
      ...formData,
      assignedTeams: [], // Simplified for now
      createdAt: existingForEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Procedure;

    try {
      if (id) {
        await proceduresApi.updateProcedure(id, procedure);
      } else {
        await proceduresApi.createProcedure(procedure);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Could not save procedure');
      return;
    }
    
    // Add Notifications for each assigned user if enabled
    const settings = getNotificationSettings();
    if (settings.notifyOnAssignment) {
      await Promise.all(formData.assignedTo.map(userId =>
        dispatchNotification({
          userId,
          titleAr: 'إسناد إجراء جديد',
          titleEn: 'New Procedure Assigned',
          messageAr: `تم إسناد إجراء جديد لك: ${formData.nameAr}`,
          messageEn: `A new procedure has been assigned to you: ${formData.nameEn}`,
          type: 'procedure_assignment',
          link: '/tasks'
        })
      ));
    }

    toast.success(id ? t('procedure_updated_success') || 'Procedure updated successfully' : t('procedure_added_success') || 'Procedure added successfully');
    navigate('/procedures');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/procedures')}
            className="rounded-full hover:bg-slate-100"
          >
            <ArrowLeft className={cn("w-5 h-5", isRtl && "rotate-180")} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-main">
              {id
                ? t('edit_procedure') || 'Edit Procedure'
                : parentId
                  ? (isRtl ? 'إضافة إجراء فرعي' : 'Add Sub-Procedure')
                  : t('add_procedure')}
            </h1>
            <p className="text-text-muted mt-1">{t('manage_procedures_desc')}</p>
            {parentId && !id && (() => {
              const parent = allProcedures.find(p => p.id === parentId);
              if (!parent) return null;
              return (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-[12px] font-bold text-emerald-700">
                  {isRtl ? 'تابع لـ:' : 'Parent:'} {isRtl ? parent.nameAr : parent.nameEn}
                </div>
              );
            })()}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => navigate('/procedures')}
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
              {t('basic_info') || 'Basic Information'}
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
                <label className="text-sm font-bold text-text-main">{t('desc_ar')}</label>
                <textarea 
                  value={formData.descriptionAr || ''}
                  onChange={e => setFormData({...formData, descriptionAr: e.target.value})}
                  placeholder={t('desc_ar')}
                  className="w-full min-h-[100px] rounded-lg border border-border-subtle p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-transparent"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-text-main">{t('desc_en')}</label>
                <textarea
                  value={formData.descriptionEn || ''}
                  onChange={e => setFormData({...formData, descriptionEn: e.target.value})}
                  placeholder={t('desc_en')}
                  className="w-full min-h-[100px] rounded-lg border border-border-subtle p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-transparent"
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

          <div className="bg-white rounded-2xl border border-border-subtle p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 text-primary font-bold mb-2">
              <Shield className="w-5 h-5" />
              {t('classification') || 'Classification'}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-text-main">{t('policy') || 'Policy'} <span className="text-red-500">*</span></label>
                <Select 
                  value={formData.policyId || ''} 
                  onValueChange={val => setFormData({...formData, policyId: val})}
                >
                  <SelectTrigger className="rounded-lg border-border-subtle h-11">
                    <SelectValue placeholder={t('select_policy')}>
                      {formData.policyId 
                        ? (policies.find(p => p.id === formData.policyId)?.[isRtl ? 'nameAr' : 'nameEn']) 
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
                <label className="text-sm font-bold text-text-main">{t('standard') || 'Standard'} <span className="text-red-500">*</span></label>
                <Select 
                  value={formData.standardId || ''} 
                  onValueChange={val => setFormData({...formData, standardId: val})}
                >
                  <SelectTrigger className="rounded-lg border-border-subtle h-11">
                    <SelectValue placeholder={t('select_standard')}>
                      {formData.standardId 
                        ? (standards.find(s => s.id === formData.standardId)?.[isRtl ? 'nameAr' : 'nameEn']) 
                        : t('select_standard')}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {standards.filter(s => s.policyId === formData.policyId).map(s => (
                      <SelectItem key={s.id} value={s.id}>{isRtl ? s.nameAr : s.nameEn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-border-subtle p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 text-primary font-bold mb-2">
              <AlertCircle className="w-5 h-5" />
              {t('status_and_importance') || 'Status & Importance'}
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-text-main">{t('status')}</label>
                <Select 
                  value={formData.status || ''} 
                  onValueChange={val => setFormData({...formData, status: val as any})}
                >
                  <SelectTrigger className="rounded-lg border-border-subtle h-11">
                    <SelectValue placeholder={t('status')}>
                      {formData.status ? t(formData.status) : t('status')}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">{t('not_started')}</SelectItem>
                    <SelectItem value="in_progress">{t('in_progress')}</SelectItem>
                    <SelectItem value="completed">{t('completed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-text-main">{t('importance')}</label>
                <Select 
                  value={formData.importance || ''} 
                  onValueChange={val => setFormData({...formData, importance: val as any})}
                >
                  <SelectTrigger className="rounded-lg border-border-subtle h-11">
                    <SelectValue placeholder={t('importance')}>
                      {formData.importance ? t(formData.importance) : t('importance')}
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

          <div className="bg-white rounded-2xl border border-border-subtle p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-primary font-bold mb-2">
              <Calendar className="w-5 h-5" />
              {isRtl ? 'تاريخ الانتهاء' : 'End Date'}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-text-main">{t('end_date')}</label>
              <Input
                type="date"
                value={formData.endDate || ''}
                onChange={e => setFormData({ ...formData, endDate: e.target.value, startDate: e.target.value })}
                className="rounded-lg border-border-subtle h-11"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-border-subtle p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 text-primary font-bold mb-2">
              <User className="w-5 h-5" />
              {t('assignment') || 'Assignment'}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-text-main">{t('assigned_to')}</label>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                {users.map(user => (
                  <label key={user.uid} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors border border-transparent hover:border-border-subtle">
                    <input 
                      type="checkbox"
                      checked={formData.assignedTo.includes(user.uid)}
                      onChange={e => {
                        const newAssigned = e.target.checked 
                          ? [...formData.assignedTo, user.uid]
                          : formData.assignedTo.filter(id => id !== user.uid);
                        setFormData({...formData, assignedTo: newAssigned});
                      }}
                      className="w-4 h-4 rounded border-border-subtle text-primary focus:ring-primary"
                    />
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-[10px] font-bold text-blue-600">
                        {user.displayName.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-text-main">{user.displayName}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

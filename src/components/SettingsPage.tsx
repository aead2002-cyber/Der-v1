import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Settings as SettingsIcon, 
  Building2, 
  Users, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X,
  Shield,
  Layers,
  Bell,
  Mail as MailIcon,
  Clock,
  AlertCircle,
  FileText,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '@/components/ui/dialog';
import { mockService, uploadFile, resolveAttachmentUrl, apiUrl } from '@/services/mockService';
import { departmentsApi } from '@/services/departmentsApi';
import { teamsApi } from '@/services/teamsApi';
import { lookupOptionsApi } from '@/services/lookupOptionsApi';
import { Team, Department, NotificationSettings, EmailSettings, NotificationTemplate, ComplianceSettings, LookupOption } from '@/types';
import { PermissionGroupsManager } from './PermissionGroupsManager';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { HtmlTemplateEditor } from './shared/HtmlTemplateEditor';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

type SettingsTab = 'departments' | 'teams' | 'notifications' | 'email' | 'compliance' | 'general' | 'lookup_tables' | 'permissions';

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [activeTab, setActiveTab] = useState<SettingsTab>('departments');

  // Departments State
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isDeptDialogOpen, setIsDeptDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Partial<Department> | null>(null);

  // Teams State
  const [teams, setTeams] = useState<Team[]>([]);
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Partial<Team> | null>(null);

  // Delete Confirmation State
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'dept' | 'team' | null>(null);

  // Notifications State
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>({
    notifyBeforeDays: 30,
    emailNotificationsEnabled: true,
    ccAdmin: false,
    notifyOnAssignment: true,
    procedureExpiryNotificationDays: 7
  });

  // Email Settings State
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    smtpServer: '',
    smtpPort: 587,
    senderEmail: '',
    senderName: '',
    encryption: 'tls'
  });

  const [isTestMailDialogOpen, setIsTestMailDialogOpen] = useState(false);
  const [testMailRecipient, setTestMailRecipient] = useState('');
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);

  // Templates State
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<NotificationTemplate> | null>(null);

  // General State
  const [complianceSettings, setComplianceSettings] = useState<ComplianceSettings>({
    thresholds: []
  });
  const [logoPreviewError, setLogoPreviewError] = useState(false);

  // Lookup Tables State
  const [lookupOptions, setLookupOptions] = useState<LookupOption[]>([]);
  const [isLookupDialogOpen, setIsLookupDialogOpen] = useState(false);
  const [editingLookup, setEditingLookup] = useState<Partial<LookupOption> | null>(null);
  const [activeLookupCategory, setActiveLookupCategory] = useState<string>('change_request_type');

  useEffect(() => {
    refreshDepartments();
    refreshTeams();
    refreshLookupOptions();
    setNotifSettings(mockService.getNotificationSettings());
    const stored: any = { ...mockService.getEmailSettings() };
    delete stored.smtpUser;
    delete stored.smtpPassword;
    setEmailSettings(stored);
    setTemplates(mockService.getNotificationTemplates());
    setComplianceSettings(mockService.getComplianceSettings());
  }, []);

  const refreshDepartments = async () => {
    try {
      setDepartments(await departmentsApi.getDepartments());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (isRtl ? 'تعذر تحميل الإدارات' : 'Failed to load departments'));
    }
  };

  const refreshTeams = async () => {
    try {
      setTeams(await teamsApi.getTeams());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (isRtl ? 'تعذر تحميل الفرق' : 'Failed to load teams'));
    }
  };

  const refreshLookupOptions = async () => {
    try {
      setLookupOptions(await lookupOptionsApi.getLookupOptions());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (isRtl ? 'تعذر تحميل قوائم الاختيارات' : 'Failed to load lookup options'));
    }
  };

  const handleSaveEmailSettings = () => {
    mockService.saveEmailSettings(emailSettings);
    toast.success(t('email_settings_saved'));
  };

  const handleTestSmtp = async () => {
    if (!testMailRecipient) {
      toast.error(t('recipient_email_required') || 'Recipient email is required');
      return;
    }

    setIsTestingSmtp(true);
    try {
      const response = await fetch(`${apiUrl}/email/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: emailSettings, recipient: testMailRecipient })
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok && data.ok) {
        toast.success(t('smtp_test_success') || 'Test email sent successfully. Please check the recipient inbox.');
        setIsTestMailDialogOpen(false);
        setTestMailRecipient('');
      } else {
        const stageLabel = data.stage === 'verify'
          ? (t('smtp_verify_failed') || 'Connection / authentication failed')
          : data.stage === 'send'
            ? (t('smtp_send_failed') || 'Sending failed')
            : (t('smtp_test_failed') || 'Test failed');
        const detail = [data.code, data.response || data.error].filter(Boolean).join(' — ');
        toast.error(`${stageLabel}${detail ? `: ${detail}` : ''}`, { duration: 8000 });
      }
    } catch (err: any) {
      toast.error(`${t('smtp_test_failed') || 'Test failed'}: ${err?.message || 'network error'}`, { duration: 8000 });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const handleSaveComplianceSettings = () => {
    mockService.saveComplianceSettings(complianceSettings);
    toast.success(t('compliance_saved_success'));
  };

  const handleSaveTemplate = () => {
    if (!editingTemplate?.name || !editingTemplate?.subject || !editingTemplate?.body) {
      toast.error(t('fill_required_fields'));
      return;
    }

    const template: NotificationTemplate = {
      id: editingTemplate.id || Math.random().toString(36).substr(2, 9),
      name: editingTemplate.name,
      subject: editingTemplate.subject,
      body: editingTemplate.body,
      type: editingTemplate.type || 'assignment'
    };

    mockService.saveNotificationTemplate(template);
    setTemplates(mockService.getNotificationTemplates());
    setIsTemplateDialogOpen(false);
    setEditingTemplate(null);
    toast.success(t('template_saved_success'));
  };

  const handleSaveNotifSettings = () => {
    mockService.saveNotificationSettings(notifSettings);
    toast.success(t('notification_settings_saved') || 'Notification settings saved successfully');
  };

  const handleSaveDepartment = async () => {
    if (!editingDept?.nameAr || !editingDept?.nameEn) {
      toast.error(t('fill_required_fields'));
      return;
    }

    const dept: Department = {
      id: editingDept.id || Math.random().toString(36).substr(2, 9),
      nameAr: editingDept.nameAr,
      nameEn: editingDept.nameEn,
      descriptionAr: editingDept.descriptionAr,
      descriptionEn: editingDept.descriptionEn,
      createdAt: editingDept.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (editingDept.id) {
        await departmentsApi.updateDepartment(editingDept.id, dept);
      } else {
        await departmentsApi.createDepartment(dept);
      }
      await refreshDepartments();
      setIsDeptDialogOpen(false);
      setEditingDept(null);
      toast.success(t('department_saved_success') || 'Department saved successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (isRtl ? 'تعذر حفظ الإدارة' : 'Failed to save department'));
    }
  };

  const handleSaveTeam = async () => {
    if (!editingTeam?.nameAr || !editingTeam?.nameEn) {
      toast.error(t('fill_required_fields'));
      return;
    }

    const team: Team = {
      id: editingTeam.id || Math.random().toString(36).substr(2, 9),
      nameAr: editingTeam.nameAr,
      nameEn: editingTeam.nameEn,
      descriptionAr: editingTeam.descriptionAr,
      descriptionEn: editingTeam.descriptionEn,
      createdAt: editingTeam.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (editingTeam.id) {
        await teamsApi.updateTeam(editingTeam.id, team);
      } else {
        await teamsApi.createTeam(team);
      }
      await refreshTeams();
      setIsTeamDialogOpen(false);
      setEditingTeam(null);
      toast.success(t('team_saved_success') || 'Team saved successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (isRtl ? 'تعذر حفظ الفريق' : 'Failed to save team'));
    }
  };

  const handleDeleteDept = (id: string) => {
    setIdToDelete(id);
    setDeleteType('dept');
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteTeam = (id: string) => {
    setIdToDelete(id);
    setDeleteType('team');
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (idToDelete && deleteType) {
      try {
        if (deleteType === 'dept') {
          await departmentsApi.deleteDepartment(idToDelete);
          await refreshDepartments();
          toast.success(t('department_deleted_success') || 'Department deleted successfully');
        } else {
          await teamsApi.deleteTeam(idToDelete);
          await refreshTeams();
          toast.success(t('team_deleted_success') || 'Team deleted successfully');
        }
        setIsDeleteConfirmOpen(false);
        setIdToDelete(null);
        setDeleteType(null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : (isRtl ? 'تعذر الحذف' : 'Delete failed'));
      }
    }
  };

  const handleSaveLookupOption = async () => {
    if (!editingLookup?.category || !editingLookup?.value || !editingLookup?.labelAr || !editingLookup?.labelEn) {
      toast.error(t('fill_required_fields'));
      return;
    }

    const option: LookupOption = {
      id: editingLookup.id || Math.random().toString(36).substr(2, 9),
      category: editingLookup.category,
      value: editingLookup.value,
      labelAr: editingLookup.labelAr,
      labelEn: editingLookup.labelEn,
      isActive: editingLookup.isActive ?? true,
      descriptionAr: editingLookup.descriptionAr,
      descriptionEn: editingLookup.descriptionEn
    };

    try {
      if (editingLookup.id) {
        await lookupOptionsApi.updateLookupOption(editingLookup.id, option);
      } else {
        await lookupOptionsApi.createLookupOption(option);
      }
      await refreshLookupOptions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (isRtl ? 'تعذر حفظ الخيار' : 'Failed to save option'));
      return;
    }
    setIsLookupDialogOpen(false);
    setEditingLookup(null);
    toast.success(isRtl ? 'تم حفظ الخيار بنجاح' : 'Option saved successfully');
  };

  const handleDeleteLookupOption = async (id: string) => {
    try {
      await lookupOptionsApi.deleteLookupOption(id);
      await refreshLookupOptions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (isRtl ? 'تعذر حذف الخيار' : 'Failed to delete option'));
      return;
    }
    toast.success(isRtl ? 'تم حذف الخيار' : 'Option deleted');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-text-main">{t('settings')}</h1>
        <p className="text-text-muted mt-1">{t('settings_desc') || 'Configure system global settings and manage organizational structure'}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Nav */}
        <div className="w-full lg:w-64 space-y-1">
          {[
            { id: 'departments', icon: Building2, label: t('departments') || 'Departments' },
            { id: 'teams', icon: Users, label: t('teams') || 'Teams' },
            { id: 'notifications', icon: Bell, label: t('notifications') || 'Notifications' },
            { id: 'email', icon: MailIcon, label: t('email_config') || 'Email & Templates' },
            { id: 'compliance', icon: Activity, label: t('compliance_settings') || 'Compliance Settings' },
            { id: 'lookup_tables', icon: Layers, label: isRtl ? 'قوائم الاختيارات' : 'Lookup Tables' },
            { id: 'permissions', icon: Shield, label: isRtl ? 'المجموعات والصلاحيات' : 'Groups & Permissions' },
            { id: 'general', icon: SettingsIcon, label: t('general') || 'General' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm",
                activeTab === tab.id 
                  ? "bg-primary text-white shadow-lg shadow-blue-600/20" 
                  : "text-text-muted hover:bg-slate-100 hover:text-text-main"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-3xl border border-border-subtle p-8 shadow-sm">
          <AnimatePresence mode="wait">
            {activeTab === 'departments' && (
              <motion.div 
                key="departments"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between pb-6 border-b border-border-subtle">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-text-main">{t('departments')}</h2>
                      <p className="text-xs text-text-muted">{t('manage_departments_desc') || 'Define your organizational departments'}</p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => { setEditingDept({}); setIsDeptDialogOpen(true); }}
                    className="bg-primary hover:bg-primary/90 text-white font-bold h-10 rounded-xl"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('add_department') || 'Add Department'}
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  {departments.map((dept) => (
                    <div 
                      key={dept.id}
                      className="group flex items-center justify-between p-4 rounded-2xl border border-border-subtle bg-slate-50/50 hover:bg-white hover:shadow-md hover:border-primary/20 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors border border-border-subtle">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-text-main text-sm">{isRtl ? dept.nameAr : dept.nameEn}</p>
                          <p className="text-[10px] text-text-muted truncate max-w-[150px]">
                            {isRtl ? dept.descriptionAr : dept.descriptionEn}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => { setEditingDept(dept); setIsDeptDialogOpen(true); }}
                          className="w-8 h-8 rounded-lg hover:bg-blue-50 text-blue-600"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteDept(dept.id)}
                          className="w-8 h-8 rounded-lg hover:bg-rose-50 text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'teams' && (
              <motion.div 
                key="teams"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between pb-6 border-b border-border-subtle">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-text-main">{t('teams')}</h2>
                      <p className="text-xs text-text-muted">{t('manage_teams_desc') || 'Manage collaborative teams and working groups'}</p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => { setEditingTeam({}); setIsTeamDialogOpen(true); }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 rounded-xl"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('add_team') || 'Add Team'}
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  {teams.map((team) => (
                    <div 
                      key={team.id}
                      className="group flex items-center justify-between p-4 rounded-2xl border border-border-subtle bg-slate-50/50 hover:bg-white hover:shadow-md hover:border-emerald-500/20 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-400 group-hover:text-emerald-600 transition-colors border border-border-subtle">
                          <Shield className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-text-main text-sm">{isRtl ? team.nameAr : team.nameEn}</p>
                          <p className="text-[10px] text-text-muted truncate max-w-[150px]">
                            {isRtl ? team.descriptionAr : team.descriptionEn}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => { setEditingTeam(team); setIsTeamDialogOpen(true); }}
                          className="w-8 h-8 rounded-lg hover:bg-emerald-50 text-emerald-600"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteTeam(team.id)}
                          className="w-8 h-8 rounded-lg hover:bg-rose-50 text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'notifications' && (
              <motion.div 
                key="notifications"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="flex items-center gap-3 pb-6 border-b border-border-subtle">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-text-main">{t('notifications')}</h2>
                    <p className="text-xs text-text-muted">{t('manage_notifications_desc') || 'Configure expiry alerts and email notification preferences'}</p>
                  </div>
                </div>

                <div className="space-y-8 max-w-2xl">
                  <div className="flex items-center justify-between p-4 rounded-2xl border border-border-subtle bg-slate-50/50">
                    <div className="space-y-1">
                      <p className="font-bold text-text-main text-sm">{t('email_notifications') || 'Email Notifications'}</p>
                      <p className="text-[11px] text-text-muted">{t('email_notif_desc') || 'Receive automated email alerts for expiring commitments'}</p>
                    </div>
                    <Switch 
                      checked={notifSettings.emailNotificationsEnabled} 
                      onCheckedChange={checked => setNotifSettings({...notifSettings, emailNotificationsEnabled: checked})} 
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-[13px] font-bold text-text-main flex items-center gap-2">
                       <Clock className="w-4 h-4 text-orange-500" />
                       {t('notify_before_days') || 'Notify Before (Days)'}
                    </label>
                    <div className="flex items-center gap-4">
                      <Input 
                        type="number" 
                        value={notifSettings.notifyBeforeDays} 
                        onChange={e => setNotifSettings({...notifSettings, notifyBeforeDays: parseInt(e.target.value)})}
                        className="max-w-[120px] rounded-xl h-11 border-border-subtle"
                      />
                      <span className="text-sm font-medium text-text-muted">{t('days') || 'Days'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl border border-border-subtle bg-slate-50/50">
                    <div className="space-y-1">
                      <p className="font-bold text-text-main text-sm">{t('cc_admin') || 'CC Administrators'}</p>
                      <p className="text-[11px] text-text-muted">{t('cc_admin_desc') || 'Send a copy of all expiry notifications to the system administrators'}</p>
                    </div>
                    <Switch 
                      checked={notifSettings.ccAdmin} 
                      onCheckedChange={checked => setNotifSettings({...notifSettings, ccAdmin: checked})} 
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl border border-border-subtle bg-blue-50/30">
                    <div className="space-y-1">
                      <p className="font-bold text-text-main text-sm">{t('notify_on_assignment') || 'Notify on Assignment'}</p>
                      <p className="text-[11px] text-text-muted">{isRtl ? 'إرسال إشعار للمستخدم عند إسناد إجراء أو التزام أو بلاغ جديد له' : 'Notify users when a procedure, commitment, or incident is assigned to them'}</p>
                    </div>
                    <Switch 
                      checked={notifSettings.notifyOnAssignment} 
                      onCheckedChange={checked => setNotifSettings({...notifSettings, notifyOnAssignment: checked})} 
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-[13px] font-bold text-text-main flex items-center gap-2">
                       <Clock className="w-4 h-4 text-primary" />
                       {t('procedure_expiry_notify_days') || 'Procedure Expiry Notification (Days)'}
                    </label>
                    <div className="flex items-center gap-4">
                      <Input 
                        type="number" 
                        value={notifSettings.procedureExpiryNotificationDays} 
                        onChange={e => setNotifSettings({...notifSettings, procedureExpiryNotificationDays: parseInt(e.target.value) || 0})}
                        className="max-w-[120px] rounded-xl h-11 border-border-subtle"
                      />
                      <span className="text-sm font-medium text-text-muted">{t('days') || 'Days'}</span>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-border-subtle">
                    <Button onClick={handleSaveNotifSettings} className="bg-primary hover:bg-primary/90 text-white font-bold h-11 px-8 rounded-xl shadow-lg shadow-blue-600/20">
                      <Save className="w-4 h-4 mr-2" />
                      {t('save_settings') || 'Save Settings'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'email' && (
              <motion.div 
                key="email"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="flex items-center gap-3 pb-6 border-b border-border-subtle">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <MailIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-text-main">{t('email_server_settings')}</h2>
                    <p className="text-xs text-text-muted">{t('configure_smtp_desc') || 'Configure SMTP server for outgoing system emails'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-text-muted uppercase">{t('smtp_server')} <span className="text-red-500">*</span></label>
                    <Input 
                      value={emailSettings.smtpServer}
                      onChange={e => setEmailSettings({...emailSettings, smtpServer: e.target.value})}
                      placeholder="smtp.example.com"
                      className="rounded-xl border-border-subtle h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-text-muted uppercase">{t('smtp_port')} <span className="text-red-500">*</span></label>
                    <Input 
                      type="number"
                      value={emailSettings.smtpPort}
                      onChange={e => setEmailSettings({...emailSettings, smtpPort: parseInt(e.target.value) || 0})}
                      placeholder="587"
                      className="rounded-xl border-border-subtle h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-text-muted uppercase">{t('sender_email')} <span className="text-red-500">*</span></label>
                    <Input 
                      value={emailSettings.senderEmail}
                      onChange={e => setEmailSettings({...emailSettings, senderEmail: e.target.value})}
                      placeholder="no-reply@der3.com"
                      className="rounded-xl border-border-subtle h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-text-muted uppercase">{t('sender_name')}</label>
                    <Input 
                      value={emailSettings.senderName}
                      onChange={e => setEmailSettings({...emailSettings, senderName: e.target.value})}
                      placeholder="DER3 System"
                      className="rounded-xl border-border-subtle h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-text-muted uppercase">{t('encryption')}</label>
                    <Select 
                      value={emailSettings.encryption}
                      onValueChange={(val: any) => setEmailSettings({...emailSettings, encryption: val})}
                    >
                      <SelectTrigger className="rounded-xl border-border-subtle h-11">
                        <SelectValue placeholder={t('encryption')}>
                          {emailSettings.encryption === 'none' ? t('none') : (emailSettings.encryption || '').toUpperCase()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('none')}</SelectItem>
                        <SelectItem value="ssl">SSL</SelectItem>
                        <SelectItem value="tls">TLS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-4 flex items-center gap-3">
                  <Button onClick={handleSaveEmailSettings} className="bg-primary hover:bg-primary/90 text-white font-bold h-11 px-8 rounded-xl shadow-lg shadow-blue-600/20">
                    <Save className="w-4 h-4 mr-2" />
                    {t('save_settings')}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsTestMailDialogOpen(true)}
                    className="border-primary text-primary hover:bg-primary/5 font-bold h-11 px-8 rounded-xl"
                  >
                    <MailIcon className="w-4 h-4 mr-2" />
                    {t('test_sending') || 'Test Sending'}
                  </Button>
                </div>

                <div className="pt-8 border-t border-border-subtle">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-text-main">{t('notification_templates')}</h3>
                      <p className="text-xs text-text-muted">{t('notification_templates_desc') || 'Customize the content of sent notification emails'}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => { setEditingTemplate({}); setIsTemplateDialogOpen(true); }}
                      className="rounded-xl h-10 font-bold border-primary text-primary hover:bg-primary/5"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t('add_template') || 'Add Template'}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.map((template) => (
                      <div key={template.id} className="p-4 rounded-2xl border border-border-subtle bg-slate-50/30 flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white border border-border-subtle flex items-center justify-center text-primary shadow-sm">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-text-main">{template.name}</p>
                            <p className="text-[10px] text-text-muted uppercase tracking-wider">{template.type}</p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => { setEditingTemplate(template); setIsTemplateDialogOpen(true); }}
                          className="w-9 h-9 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-border-subtle shadow-sm hover:text-primary"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'compliance' && (
              <motion.div 
                key="compliance"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="flex items-center gap-3 pb-6 border-b border-border-subtle">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-text-main">{t('compliance_thresholds')}</h2>
                    <p className="text-xs text-text-muted">{t('configure_compliance_desc')}</p>
                  </div>
                </div>

                <div className="space-y-6 max-w-4xl">
                  {complianceSettings.thresholds.map((threshold, index) => (
                    <div key={threshold.id} className="p-5 rounded-2xl border border-border-subtle bg-slate-50/30 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg shadow-sm border border-white" style={{ backgroundColor: threshold.color }} />
                          <h3 className="font-bold text-text-main">{isRtl ? threshold.labelAr : threshold.labelEn}</h3>
                        </div>
                        <Input 
                          type="color" 
                          value={threshold.color}
                          onChange={e => {
                            const newThresholds = [...complianceSettings.thresholds];
                            newThresholds[index].color = e.target.value;
                            setComplianceSettings({...complianceSettings, thresholds: newThresholds});
                          }}
                          className="w-10 h-10 p-1 rounded-lg border-border-subtle cursor-pointer"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{t('min_threshold')}</label>
                          <Input 
                            type="number"
                            value={threshold.min}
                            onChange={e => {
                              const newThresholds = [...complianceSettings.thresholds];
                              newThresholds[index].min = parseInt(e.target.value) || 0;
                              setComplianceSettings({...complianceSettings, thresholds: newThresholds});
                            }}
                            className="rounded-xl border-border-subtle h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{t('max_threshold')}</label>
                          <Input 
                            type="number"
                            value={threshold.max}
                            onChange={e => {
                              const newThresholds = [...complianceSettings.thresholds];
                              newThresholds[index].max = parseInt(e.target.value) || 0;
                              setComplianceSettings({...complianceSettings, thresholds: newThresholds});
                            }}
                            className="rounded-xl border-border-subtle h-11"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{t('label_ar')}</label>
                          <Input 
                            value={threshold.labelAr}
                            onChange={e => {
                              const newThresholds = [...complianceSettings.thresholds];
                              newThresholds[index].labelAr = e.target.value;
                              setComplianceSettings({...complianceSettings, thresholds: newThresholds});
                            }}
                            className="rounded-xl border-border-subtle h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{t('label_en')}</label>
                          <Input 
                            value={threshold.labelEn}
                            onChange={e => {
                              const newThresholds = [...complianceSettings.thresholds];
                              newThresholds[index].labelEn = e.target.value;
                              setComplianceSettings({...complianceSettings, thresholds: newThresholds});
                            }}
                            className="rounded-xl border-border-subtle h-11"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4">
                  <Button onClick={handleSaveComplianceSettings} className="bg-primary hover:bg-primary/90 text-white font-bold h-11 px-8 rounded-xl shadow-lg shadow-blue-600/20">
                    <Save className="w-4 h-4 mr-2" />
                    {t('save_settings')}
                  </Button>
                </div>
              </motion.div>
            )}

            {activeTab === 'lookup_tables' && (
              <motion.div 
                key="lookup_tables"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between pb-6 border-b border-border-subtle">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-text-main">{isRtl ? 'قوائم الاختيارات' : 'Lookup Tables'}</h2>
                      <p className="text-xs text-text-muted">{isRtl ? 'إدارة الخيارات المتوفرة في القوائم المنسدلة عبر النظام' : 'Manage options available in dropdown menus across the system'}</p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => { 
                      setEditingLookup({ category: activeLookupCategory, isActive: true }); 
                      setIsLookupDialogOpen(true); 
                    }}
                    className="bg-primary hover:bg-primary/90 text-white font-bold h-10 rounded-xl"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {isRtl ? 'إضافة خيار' : 'Add Option'}
                  </Button>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {[
                    { id: 'change_request_type', label: isRtl ? 'أنواع طلبات التغيير' : 'Change Request Types' },
                    { id: 'incident_type', label: isRtl ? 'أنواع البلاغات' : 'Incident Types' },
                    { id: 'procedure_status', label: isRtl ? 'حالات الإجراءات' : 'Procedure Statuses' },
                    { id: 'commitment_status', label: isRtl ? 'حالات الالتزامات' : 'Commitment Statuses' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveLookupCategory(cat.id)}
                      className={cn(
                        "whitespace-nowrap px-4 py-2 rounded-full text-xs font-black transition-all border shrink-0",
                        activeLookupCategory === cat.id
                          ? "bg-primary text-white border-primary shadow-md"
                          : "bg-white text-slate-500 border-slate-200 hover:border-primary/30"
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {lookupOptions.filter(o => o.category === activeLookupCategory).map((option) => (
                    <div 
                      key={option.id}
                      className="group flex items-center justify-between p-4 rounded-2xl border border-border-subtle bg-slate-50/50 hover:bg-white hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          option.isActive ? "bg-emerald-500" : "bg-slate-300"
                        )} />
                        <div>
                          <p className="font-bold text-text-main text-sm">{isRtl ? option.labelAr : option.labelEn}</p>
                          <p className="text-[10px] text-text-muted font-mono uppercase tracking-tight">{option.value}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => { setEditingLookup(option); setIsLookupDialogOpen(true); }}
                          className="w-8 h-8 rounded-lg hover:bg-blue-50 text-blue-600"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteLookupOption(option.id)}
                          className="w-8 h-8 rounded-lg hover:bg-rose-50 text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {lookupOptions.filter(o => o.category === activeLookupCategory).length === 0 && (
                    <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3 border-2 border-dashed border-slate-100 rounded-3xl">
                      <Layers className="w-8 h-8 opacity-20" />
                      <p className="text-sm font-bold">{isRtl ? 'لا توجد خيارات مضافة بعد' : 'No options added yet'}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'permissions' && (
              <motion.div
                key="permissions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <PermissionGroupsManager />
              </motion.div>
            )}

            {activeTab === 'general' && (
              <motion.div
                key="general"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="flex items-center gap-3 pb-6 border-b border-border-subtle">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
                    <SettingsIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-text-main">{t('general_settings')}</h2>
                    <p className="text-xs text-text-muted">{t('general_settings_desc')}</p>
                  </div>
                </div>

                <div className="space-y-6 max-w-2xl">
                  <div className="space-y-4">
                    <label className="text-[13px] font-bold text-text-main">
                      {t('system_logo_url')}
                    </label>
                    <div className="flex items-center gap-4">
                      <Input
                        value={complianceSettings.systemLogo || ''}
                        onChange={e => {
                          setComplianceSettings({...complianceSettings, systemLogo: e.target.value});
                          setLogoPreviewError(false);
                        }}
                        placeholder="/logo-der3.png"
                        className="rounded-xl h-11 border-border-subtle flex-1"
                      />
                      <label className="cursor-pointer inline-flex items-center gap-2 h-11 px-4 rounded-xl border border-dashed border-border-subtle bg-slate-50 hover:bg-slate-100 text-[13px] font-bold text-text-main transition-colors">
                        <Save className="w-4 h-4" />
                        {isRtl ? 'رفع ملف' : 'Upload File'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            e.currentTarget.value = '';
                            if (!file) return;
                            const uploaded = await uploadFile(file);
                            if (!uploaded) {
                              toast.error(isRtl ? 'فشل رفع الملف' : 'Upload failed');
                              return;
                            }
                            setComplianceSettings({ ...complianceSettings, systemLogo: uploaded.url });
                            setLogoPreviewError(false);
                          }}
                        />
                      </label>
                      <div className="w-16 h-16 rounded-xl border border-border-subtle bg-slate-50 flex items-center justify-center overflow-hidden">
                        {complianceSettings.systemLogo && !logoPreviewError ? (
                          <img
                            src={resolveAttachmentUrl(complianceSettings.systemLogo) || complianceSettings.systemLogo}
                            className="w-full h-full object-contain"
                            alt="Preview"
                            onError={() => setLogoPreviewError(true)}
                          />
                        ) : (
                          <Shield className="w-6 h-6 text-slate-300" />
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-text-muted">
                      {t('system_logo_hint')}
                    </p>
                  </div>

                  <div className="pt-6 border-t border-border-subtle">
                    <Button onClick={handleSaveComplianceSettings} className="bg-primary hover:bg-primary/90 text-white font-bold h-11 px-8 rounded-xl shadow-lg shadow-blue-600/20">
                      <Save className="w-4 h-4 mr-2" />
                      {t('save_settings') || 'Save Settings'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={isDeptDialogOpen} onOpenChange={setIsDeptDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{editingDept?.id ? t('edit_department') || 'Edit Department' : t('add_department') || 'Add Department'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-xs font-bold">{t('name_ar')} <span className="text-red-500">*</span></label>
              <Input 
                value={editingDept?.nameAr || ''} 
                onChange={e => setEditingDept({...editingDept, nameAr: e.target.value})}
                placeholder="مثال: إدارة تقنية المعلومات"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-bold">{t('name_en')} <span className="text-red-500">*</span></label>
              <Input 
                value={editingDept?.nameEn || ''} 
                onChange={e => setEditingDept({...editingDept, nameEn: e.target.value})}
                placeholder="Example: IT Department"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDeptDialogOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleSaveDepartment} className="bg-primary hover:bg-primary/90 text-white font-bold">{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{editingTeam?.id ? t('edit_team') || 'Edit Team' : t('add_team') || 'Add Team'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-xs font-bold">{t('name_ar')} <span className="text-red-500">*</span></label>
              <Input 
                value={editingTeam?.nameAr || ''} 
                onChange={e => setEditingTeam({...editingTeam, nameAr: e.target.value})}
                placeholder="مثال: فريق أمن المعلومات"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-bold">{t('name_en')} <span className="text-red-500">*</span></label>
              <Input 
                value={editingTeam?.nameEn || ''} 
                onChange={e => setEditingTeam({...editingTeam, nameEn: e.target.value})}
                placeholder="Example: Information Security Team"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsTeamDialogOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleSaveTeam} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SMTP Test Dialog */}
      <Dialog open={isLookupDialogOpen} onOpenChange={setIsLookupDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="font-black text-xl">
              {editingLookup?.id ? (isRtl ? 'تعديل خيار' : 'Edit Option') : (isRtl ? 'إضافة خيار جديد' : 'Add New Option')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-slate-400">{isRtl ? 'التصنيف' : 'Category'}</label>
                <Select 
                  value={editingLookup?.category || 'change_request_type'}
                  onValueChange={(val) => setEditingLookup({...editingLookup, category: val})}
                >
                  <SelectTrigger className="h-11 rounded-xl border-slate-200">
                    <SelectValue>
                      {(() => {
                        const cat = editingLookup?.category || 'change_request_type';
                        const labels: Record<string, { ar: string; en: string }> = {
                          change_request_type: { ar: 'نوع طلب التغيير', en: 'Change Request Type' },
                          incident_type: { ar: 'نوع البلاغ', en: 'Incident Type' },
                          procedure_status: { ar: 'حالة الإجراء', en: 'Procedure Status' },
                          commitment_status: { ar: 'حالة الالتزام', en: 'Commitment Status' }
                        };
                        return labels[cat] ? (isRtl ? labels[cat].ar : labels[cat].en) : cat;
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="change_request_type">{isRtl ? 'نوع طلب التغيير' : 'Change Request Type'}</SelectItem>
                    <SelectItem value="incident_type">{isRtl ? 'نوع البلاغ' : 'Incident Type'}</SelectItem>
                    <SelectItem value="procedure_status">{isRtl ? 'حالة الإجراء' : 'Procedure Status'}</SelectItem>
                    <SelectItem value="commitment_status">{isRtl ? 'حالة الالتزام' : 'Commitment Status'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-slate-400">{isRtl ? 'المفتاح (Value)' : 'Value (Code)'}</label>
                <Input 
                  value={editingLookup?.value || ''} 
                  onChange={e => setEditingLookup({...editingLookup, value: e.target.value.toLowerCase().replace(/\s+/g, '_')})}
                  placeholder="e.g. firewall_open"
                  className="h-11 rounded-xl border-slate-200 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-slate-400">{isRtl ? 'الاسم بالعربية' : 'Label (Arabic)'}</label>
                <Input 
                  value={editingLookup?.labelAr || ''} 
                  onChange={e => setEditingLookup({...editingLookup, labelAr: e.target.value})}
                  className="h-11 rounded-xl border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-slate-400">{isRtl ? 'الاسم بالإنجليزية' : 'Label (English)'}</label>
                <Input 
                  value={editingLookup?.labelEn || ''} 
                  onChange={e => setEditingLookup({...editingLookup, labelEn: e.target.value})}
                  className="h-11 rounded-xl border-slate-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-xs font-bold text-slate-600">{isRtl ? 'الحالة (نشط)' : 'Status (Active)'}</span>
              <Switch 
                checked={editingLookup?.isActive ?? true}
                onCheckedChange={checked => setEditingLookup({...editingLookup, isActive: checked})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsLookupDialogOpen(false)} className="font-bold">{t('cancel')}</Button>
            <Button onClick={handleSaveLookupOption} className="bg-primary hover:bg-primary/90 text-white font-black px-6 rounded-xl">{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTestMailDialogOpen} onOpenChange={setIsTestMailDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MailIcon className="w-5 h-5 text-primary" />
              {t('test_sending') || 'Test Sending'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <p className="text-xs text-text-muted leading-relaxed">
              {t('test_email_desc') || 'Enter an email address to send a test message and verify SMTP settings.'}
            </p>
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-main">{t('email')} <span className="text-red-500">*</span></label>
              <Input 
                type="email"
                value={testMailRecipient}
                onChange={e => setTestMailRecipient(e.target.value)}
                placeholder="test@example.com"
                className="rounded-xl h-11 border-border-subtle"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsTestMailDialogOpen(false)} disabled={isTestingSmtp} className="font-bold">
              {t('cancel')}
            </Button>
            <Button 
              onClick={handleTestSmtp} 
              disabled={isTestingSmtp || !testMailRecipient}
              className="bg-primary hover:bg-primary/90 text-white font-bold px-8"
            >
              {isTestingSmtp ? t('sending') || 'Sending...' : t('send_test_email') || 'Send Test Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="sm:max-w-[1000px] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate?.id ? t('edit_template') : t('add_template')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="grid gap-2">
              <label className="text-[13px] font-bold text-text-main">{t('template_name')} <span className="text-red-500">*</span></label>
              <Input 
                value={editingTemplate?.name || ''} 
                onChange={e => setEditingTemplate({...editingTemplate, name: e.target.value})}
                className="rounded-xl h-11 border-border-subtle"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-[13px] font-bold text-text-main">{t('report_type')}</label>
              <Select 
                value={editingTemplate?.type || 'assignment'}
                onValueChange={(val: any) => setEditingTemplate({...editingTemplate, type: val})}
              >
                <SelectTrigger className="rounded-xl h-11 border-border-subtle">
                  <SelectValue placeholder={t('report_type')}>
                    {t(editingTemplate?.type || 'assignment')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assignment">{t('assignment')}</SelectItem>
                  <SelectItem value="expiry_reminder">{t('expiry_reminder')}</SelectItem>
                  <SelectItem value="overdue_alert">{t('overdue_alert')}</SelectItem>
                  <SelectItem value="otp">{isRtl ? 'رمز التحقق (OTP)' : 'OTP Verification'}</SelectItem>
                  <SelectItem value="password_reset">{isRtl ? 'إعادة تعيين كلمة المرور' : 'Password Reset'}</SelectItem>
                  <SelectItem value="password_changed">{isRtl ? 'تأكيد تغيير كلمة المرور' : 'Password Changed Confirmation'}</SelectItem>
                  <SelectItem value="incident_new_to_owner">{isRtl ? 'بلاغ أمني جديد — للمسؤول' : 'New Security Incident — to Owner'}</SelectItem>
                  <SelectItem value="incident_received_to_reporter">{isRtl ? 'تأكيد استلام البلاغ — للمُبلِّغ' : 'Incident Received — to Reporter'}</SelectItem>
                  <SelectItem value="incident_resolved_to_reporter">{isRtl ? 'إغلاق البلاغ — للمُبلِّغ' : 'Incident Resolved — to Reporter'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-[13px] font-bold text-text-main">{t('email_subject')} <span className="text-red-500">*</span></label>
              <Input 
                value={editingTemplate?.subject || ''} 
                onChange={e => setEditingTemplate({...editingTemplate, subject: e.target.value})}
                className="rounded-xl h-11 border-border-subtle"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-[13px] font-bold text-text-main">{t('email_body')} <span className="text-red-500">*</span></label>
              <HtmlTemplateEditor
                value={editingTemplate?.body || ''}
                onChange={(next) => setEditingTemplate({ ...editingTemplate, body: next })}
                placeholders={['{{user_name}}', '{{procedure_name}}', '{{end_date}}', '{{commitment_name}}', '{{expiry_date}}']}
                minHeight={280}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsTemplateDialogOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleSaveTemplate} className="bg-primary hover:bg-primary/90 text-white font-bold h-11 px-8 rounded-xl">{t('save')}</Button>
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
              {deleteType === 'dept' 
                ? (t('confirm_delete_department_desc') || 'Are you sure you want to delete this department?')
                : (t('confirm_delete_team_desc') || 'Are you sure you want to delete this team?')}
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

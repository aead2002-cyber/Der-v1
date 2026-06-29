import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  UserPlus,
  ArrowLeft,
  Save,
  Mail,
  User as UserIcon,
  Shield,
  Building2,
  Users as UsersIcon,
  Tag,
  Upload,
  X,
  Loader2,
  ShieldAlert
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
import { uploadFile, resolveAttachmentUrl } from '@/lib/backendFileHelpers';
import { usersApi } from '@/services/usersApi';
import { teamsApi } from '@/services/teamsApi';
import { departmentsApi } from '@/services/departmentsApi';
import { User, Role, Team, Department } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Check } from 'lucide-react';

export default function AddUserPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isRtl = i18n.language === 'ar';

  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [availableDepts, setAvailableDepts] = useState<Department[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingUser, setSavingUser] = useState(false);

  const handlePhotoUpload = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(isRtl ? 'يجب اختيار ملف صورة' : 'Please select an image file');
      return;
    }
    setUploadingPhoto(true);
    const uploaded = await uploadFile(file);
    setUploadingPhoto(false);
    if (!uploaded) {
      toast.error(isRtl ? 'فشل رفع الصورة' : 'Upload failed');
      return;
    }
    setFormData(prev => ({ ...prev, photoURL: uploaded.url }));
  };

  const [formData, setFormData] = useState<Partial<User>>({
    role: 'user',
    teams: [],
    departments: []
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [teams, departments, users] = await Promise.all([
          teamsApi.getTeams(),
          departmentsApi.getDepartments(),
          id ? usersApi.getUsers() : Promise.resolve([]),
        ]);
        if (!active) return;
        setAvailableTeams(teams);
        setAvailableDepts(departments);
        if (id) {
          const user = users.find(u => u.uid === id);
          if (user) {
            setFormData(user);
          }
        }
      } catch (error) {
        if (active) {
          toast.error(error instanceof Error ? error.message : (isRtl ? 'تعذر تحميل بيانات المستخدم' : 'Failed to load user data'));
        }
      }
    };

    void load();
    return () => { active = false; };
  }, [id, isRtl]);

  const toggleSelection = (id: string, type: 'teams' | 'departments') => {
    const current = formData[type] || [];
    if (current.includes(id)) {
      setFormData({...formData, [type]: current.filter(item => item !== id)});
    } else {
      setFormData({...formData, [type]: [...current, id]});
    }
  };

  const handleSave = async () => {
    if (!formData.email || !formData.displayName) {
      toast.error(t('fill_required_fields'));
      return;
    }

    const user: User = {
      uid: formData.uid || Math.random().toString(36).substr(2, 9),
      email: formData.email || '',
      displayName: formData.displayName || '',
      displayNameEn: (formData as any).displayNameEn || '',
      role: formData.role || 'user',
      groupId: formData.groupId,
      permissionOverrides: formData.permissionOverrides,
      teams: formData.teams || [],
      departments: formData.departments || [],
      photoURL: formData.photoURL,
      receiveSecurityIncidents: formData.receiveSecurityIncidents
    };

    setSavingUser(true);
    try {
      if (id) {
        await usersApi.updateUser(id, user);
      } else {
        await usersApi.createUser(user);
      }
      toast.success(id ? t('user_updated_success') || 'User updated successfully' : t('user_added_success') || 'User added successfully');
      navigate('/users');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (isRtl ? 'تعذر حفظ المستخدم' : 'Failed to save user'));
    } finally {
      setSavingUser(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/users')}
            className="rounded-full hover:bg-slate-100"
          >
            <ArrowLeft className={isRtl ? "rotate-180 w-5 h-5" : "w-5 h-5"} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-main">
              {id ? t('edit_user') : t('add_user')}
            </h1>
            <p className="text-text-muted mt-1">
              {id ? t('edit_user_desc') || 'Modify user information and permissions' : t('add_user_desc') || 'Create a new user and assign roles'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/users')} className="font-bold">
            {t('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={savingUser} className="bg-primary hover:bg-primary/90 text-white font-bold px-8 h-11 rounded-lg shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5">
            <Save className="w-4 h-4 mr-2" />
            {savingUser ? (t('loading') || 'Loading...') : t('save')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Basic Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-border-subtle p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 text-primary font-bold">
              <UserIcon className="w-5 h-5" />
              {t('basic_info')}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-text-main">{isRtl ? 'الاسم بالعربي' : 'Arabic Name'} <span className="text-red-500">*</span></label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <Input
                    value={formData.displayName || ''}
                    onChange={e => setFormData({...formData, displayName: e.target.value})}
                    placeholder={isRtl ? 'الاسم بالعربي' : 'Arabic name'}
                    className="pl-10 rounded-lg border-border-subtle h-11"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-text-main">{isRtl ? 'الاسم بالإنجليزي' : 'English Name'}</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <Input
                    value={(formData as any).displayNameEn || ''}
                    onChange={e => setFormData({ ...formData, displayNameEn: e.target.value } as any)}
                    placeholder="English name"
                    dir="ltr"
                    className="pl-10 rounded-lg border-border-subtle h-11"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-text-main">{t('email')} <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <Input 
                    type="email"
                    value={formData.email || ''} 
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    placeholder="name@example.com"
                    className="pl-10 rounded-lg border-border-subtle h-11"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[13px] font-bold text-text-main">{t('profile_photo') || (isRtl ? 'الصورة الشخصية' : 'Profile Photo')}</label>
              {formData.photoURL ? (
                <div className="flex items-center gap-4 p-3 rounded-xl border border-border-subtle bg-slate-50/50">
                  <img
                    src={resolveAttachmentUrl(formData.photoURL) || formData.photoURL}
                    alt={formData.displayName || 'avatar'}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-text-main truncate">
                      {(() => {
                        const v = formData.photoURL!;
                        if (v.startsWith('/api/files/') || v.startsWith('http')) {
                          const parts = v.split('/');
                          return parts[parts.length - 1].replace(/^\d+-[a-f0-9]+-/, '');
                        }
                        return v;
                      })()}
                    </p>
                    <p className="text-[11px] text-text-muted">{isRtl ? 'تم الرفع' : 'Uploaded'}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setFormData({ ...formData, photoURL: '' })}
                    className="text-rose-600 hover:bg-rose-50 rounded-lg"
                    title={isRtl ? 'إزالة' : 'Remove'}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <label className={cn(
                  "flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-dashed border-border-subtle hover:border-primary hover:bg-blue-50/30 cursor-pointer transition-all h-24",
                  uploadingPhoto && "opacity-60 pointer-events-none"
                )}>
                  {uploadingPhoto ? (
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  ) : (
                    <Upload className="w-5 h-5 text-text-muted" />
                  )}
                  <span className="text-[12px] font-bold text-text-muted">
                    {uploadingPhoto
                      ? (isRtl ? 'جاري الرفع...' : 'Uploading...')
                      : (isRtl ? 'انقر لاختيار صورة الملف الشخصي' : 'Click to choose a profile photo')}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { handlePhotoUpload(e.target.files?.[0]); e.target.value = ''; }}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-border-subtle p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 text-primary font-bold">
              <Building2 className="w-5 h-5" />
              {t('assignment_and_teams') || 'Assignment & Teams'}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[13px] font-bold text-text-main flex items-center gap-2">
                  <UsersIcon className="w-4 h-4 text-primary" />
                  {t('teams')}
                </label>
                <div className="grid grid-cols-1 gap-2 border border-border-subtle rounded-xl p-3 max-h-[200px] overflow-y-auto">
                  {availableTeams.map(team => (
                    <div 
                      key={team.id}
                      onClick={() => toggleSelection(isRtl ? team.nameAr : team.nameEn, 'teams')}
                      className={cn(
                        "flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer",
                        formData.teams?.includes(isRtl ? team.nameAr : team.nameEn)
                          ? "border-primary bg-blue-50 text-primary"
                          : "border-transparent hover:bg-slate-50 text-text-muted"
                      )}
                    >
                      <span className="text-xs font-bold">{isRtl ? team.nameAr : team.nameEn}</span>
                      {formData.teams?.includes(isRtl ? team.nameAr : team.nameEn) && <Check className="w-3.5 h-3.5" />}
                    </div>
                  ))}
                  {availableTeams.length === 0 && (
                    <p className="text-[11px] text-center text-text-muted py-4">{t('no_teams_found') || 'No teams found. Add them in settings.'}</p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[13px] font-bold text-text-main flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  {t('department')}
                </label>
                <div className="grid grid-cols-1 gap-2 border border-border-subtle rounded-xl p-3 max-h-[200px] overflow-y-auto">
                  {availableDepts.map(dept => (
                    <div 
                      key={dept.id}
                      onClick={() => toggleSelection(isRtl ? dept.nameAr : dept.nameEn, 'departments')}
                      className={cn(
                        "flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer",
                        formData.departments?.includes(isRtl ? dept.nameAr : dept.nameEn)
                          ? "border-emerald-500 bg-emerald-50 text-emerald-600"
                          : "border-transparent hover:bg-slate-50 text-text-muted"
                      )}
                    >
                      <span className="text-xs font-bold">{isRtl ? dept.nameAr : dept.nameEn}</span>
                      {formData.departments?.includes(isRtl ? dept.nameAr : dept.nameEn) && <Check className="w-3.5 h-3.5" />}
                    </div>
                  ))}
                  {availableDepts.length === 0 && (
                    <p className="text-[11px] text-center text-text-muted py-4">{t('no_departments_found') || 'No departments found. Add them in settings.'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Role */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-border-subtle p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 text-primary font-bold">
              <Shield className="w-5 h-5" />
              {t('role')}
            </div>

            <div className="space-y-3">
              {[
                { id: 'admin', title: t('admin'), desc: t('admin_role_desc') || 'Full system access and management' },
                { id: 'auditor', title: t('auditor'), desc: t('auditor_role_desc') || 'View-only access for compliance audits' },
                { id: 'user', title: t('user'), desc: t('user_role_desc') || 'Standard access to assigned tasks' }
              ].map((role) => (
                <div 
                  key={role.id}
                  onClick={() => setFormData({...formData, role: role.id as Role})}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all cursor-pointer",
                    formData.role === role.id 
                      ? "border-primary bg-blue-50/50" 
                      : "border-border-subtle hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-text-main">{role.title}</span>
                    {formData.role === role.id && (
                      <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    {role.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-border-subtle p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-rose-600 font-bold">
              <ShieldAlert className="w-5 h-5" />
              {t('special_permissions') || (isRtl ? 'صلاحيات خاصة' : 'Special Permissions')}
            </div>
            <label className="flex items-start gap-3 p-4 rounded-xl border-2 border-border-subtle hover:border-rose-300 cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={!!formData.receiveSecurityIncidents}
                onChange={e => setFormData({ ...formData, receiveSecurityIncidents: e.target.checked })}
                className="mt-1 w-4 h-4 accent-rose-600"
              />
              <div className="flex-1">
                <p className="font-bold text-sm text-text-main">
                  {t('receive_security_incidents') || (isRtl ? 'استلام البلاغات الأمنية مباشرة' : 'Receive security incident reports')}
                </p>
                <p className="text-[11px] text-text-muted leading-relaxed mt-1">
                  {t('receive_security_incidents_desc') || (isRtl ? 'يتم إرسال إشعار وبريد فوري لهذا المستخدم عند تقديم أي بلاغ أمني جديد.' : 'This user receives an instant in-app and email notification for every new security incident report.')}
                </p>
              </div>
            </label>
          </div>

          <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100 flex gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Tag className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-blue-900 mb-1">{t('permissions_note') || 'Permissions Note'}</h4>
              <p className="text-xs text-blue-800/70 leading-relaxed">
                {t('permissions_note_desc') || 'Assigning a role determines the global access level of the user across the platform.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

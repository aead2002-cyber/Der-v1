import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, X, Mail, User as UserIcon, Shield, Building2, Users as UsersIcon, Upload, Loader2, Check, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { mockService, uploadFile, resolveAttachmentUrl } from '@/services/mockService';
import { usersApi } from '@/services/usersApi';
import { teamsApi } from '@/services/teamsApi';
import { departmentsApi } from '@/services/departmentsApi';
import { User, Role, Team, Department, PermissionGroup } from '@/types';
import { PERMISSION_SERVICES, permKey } from '@/permissions';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  userId: string | null;
  onSaved: () => void;
  onClose: () => void;
}

export function UserFormDialog({ open, userId, onSaved, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [availableDepts, setAvailableDepts] = useState<Department[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [showOverrides, setShowOverrides] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({
    role: 'user',
    teams: [],
    departments: [],
  });

  useEffect(() => {
    if (!open) return;
    let active = true;
    setPermissionGroups(mockService.getPermissionGroups());
    setShowOverrides(false);

    const load = async () => {
      try {
        const [teams, departments, users] = await Promise.all([
          teamsApi.getTeams(),
          departmentsApi.getDepartments(),
          userId ? usersApi.getUsers() : Promise.resolve([]),
        ]);
        if (!active) return;
        setAvailableTeams(teams);
        setAvailableDepts(departments);
        if (userId) {
          const u = users.find(x => x.uid === userId);
          if (u) setFormData(u);
        } else {
          setFormData({ role: 'user', groupId: 'user', teams: [], departments: [] });
        }
      } catch (error) {
        if (active) {
          toast.error(error instanceof Error ? error.message : (isRtl ? 'تعذر تحميل بيانات المستخدم' : 'Failed to load user data'));
        }
      }
    };

    void load();
    return () => { active = false; };
  }, [open, userId, isRtl]);

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

  const toggleSelection = (id: string, type: 'teams' | 'departments') => {
    const current = formData[type] || [];
    if (current.includes(id)) {
      setFormData({ ...formData, [type]: current.filter(item => item !== id) });
    } else {
      setFormData({ ...formData, [type]: [...current, id] });
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
      groupId: formData.groupId || formData.role || 'user',
      permissionOverrides: formData.permissionOverrides,
      teams: formData.teams || [],
      departments: formData.departments || [],
      photoURL: formData.photoURL,
      bypassOtp: !!formData.bypassOtp,
      receiveSecurityIncidents: !!formData.receiveSecurityIncidents,
    };
    setSavingUser(true);
    try {
      if (userId) {
        await usersApi.updateUser(userId, user);
      } else {
        await usersApi.createUser(user);
      }
      toast.success(userId ? (t('user_updated_success') || 'User updated successfully') : (t('user_added_success') || 'User added successfully'));
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (isRtl ? 'تعذر حفظ المستخدم' : 'Failed to save user'));
    } finally {
      setSavingUser(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto rounded-xl border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{userId ? t('edit_user') : t('add_user')}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 py-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-border-subtle p-5 space-y-4">
              <div className="flex items-center gap-2 text-primary font-bold">
                <UserIcon className="w-5 h-5" />
                {t('basic_info')}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-text-main">{isRtl ? 'الاسم بالعربي' : 'Arabic Name'} <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <Input
                      value={formData.displayName || ''}
                      onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                      className="pl-10 rounded-lg border-border-subtle h-10"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-text-main">{isRtl ? 'الاسم بالإنجليزي' : 'English Name'}</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <Input
                      value={(formData as any).displayNameEn || ''}
                      onChange={e => setFormData({ ...formData, displayNameEn: e.target.value } as any)}
                      dir="ltr"
                      className="pl-10 rounded-lg border-border-subtle h-10"
                    />
                  </div>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[12px] font-bold text-text-main">{t('email')} <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <Input
                      type="email"
                      value={formData.email || ''}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="name@example.com"
                      className="pl-10 rounded-lg border-border-subtle h-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-text-main">{t('profile_photo') || (isRtl ? 'الصورة الشخصية' : 'Profile Photo')}</label>
                {formData.photoURL ? (
                  <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border-subtle bg-slate-50/50">
                    <img
                      src={resolveAttachmentUrl(formData.photoURL) || formData.photoURL}
                      alt={formData.displayName || 'avatar'}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                    <span className="flex-1 text-[12px] text-text-muted">{isRtl ? 'تم الرفع' : 'Uploaded'}</span>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setFormData({ ...formData, photoURL: '' })} className="text-rose-600 hover:bg-rose-50">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <label className={cn(
                    'flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-border-subtle hover:border-primary hover:bg-blue-50/30 cursor-pointer transition-all h-20',
                    uploadingPhoto && 'opacity-60 pointer-events-none'
                  )}>
                    {uploadingPhoto ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Upload className="w-5 h-5 text-text-muted" />}
                    <span className="text-[12px] font-bold text-text-muted">
                      {uploadingPhoto ? (isRtl ? 'جاري الرفع...' : 'Uploading...') : (isRtl ? 'اختر صورة' : 'Choose photo')}
                    </span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { handlePhotoUpload(e.target.files?.[0]); e.target.value = ''; }} />
                  </label>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-border-subtle p-5 space-y-4">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Building2 className="w-5 h-5" />
                {t('assignment_and_teams') || 'Assignment & Teams'}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-text-main flex items-center gap-1.5">
                    <UsersIcon className="w-3.5 h-3.5 text-primary" />
                    {t('teams')}
                  </label>
                  <div className="space-y-1 border border-border-subtle rounded-lg p-2 max-h-[160px] overflow-y-auto">
                    {availableTeams.map(team => {
                      const key = isRtl ? team.nameAr : team.nameEn;
                      const checked = formData.teams?.includes(key);
                      return (
                        <div
                          key={team.id}
                          onClick={() => toggleSelection(key, 'teams')}
                          className={cn('flex items-center justify-between p-2 rounded-md border transition-all cursor-pointer',
                            checked ? 'border-primary bg-blue-50 text-primary' : 'border-transparent hover:bg-slate-50 text-text-muted')}
                        >
                          <span className="text-xs font-bold">{key}</span>
                          {checked && <Check className="w-3.5 h-3.5" />}
                        </div>
                      );
                    })}
                    {availableTeams.length === 0 && <p className="text-[11px] text-center text-text-muted py-3">{t('no_teams_found') || 'No teams found.'}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-text-main flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                    {t('department')}
                  </label>
                  <div className="space-y-1 border border-border-subtle rounded-lg p-2 max-h-[160px] overflow-y-auto">
                    {availableDepts.map(dept => {
                      const key = isRtl ? dept.nameAr : dept.nameEn;
                      const checked = formData.departments?.includes(key);
                      return (
                        <div
                          key={dept.id}
                          onClick={() => toggleSelection(key, 'departments')}
                          className={cn('flex items-center justify-between p-2 rounded-md border transition-all cursor-pointer',
                            checked ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-transparent hover:bg-slate-50 text-text-muted')}
                        >
                          <span className="text-xs font-bold">{key}</span>
                          {checked && <Check className="w-3.5 h-3.5" />}
                        </div>
                      );
                    })}
                    {availableDepts.length === 0 && <p className="text-[11px] text-center text-text-muted py-3">{t('no_departments_found') || 'No departments found.'}</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-border-subtle p-5 space-y-3">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Shield className="w-5 h-5" />
                {isRtl ? 'المجموعة' : 'Group'}
              </div>
              {permissionGroups.length === 0 ? (
                <p className="text-[11px] text-text-muted">{isRtl ? 'لا توجد مجموعات معرّفة. أنشئها من الإعدادات.' : 'No groups defined yet. Create some in Settings.'}</p>
              ) : (
                permissionGroups.map(g => (
                  <div
                    key={g.id}
                    onClick={() => {
                      const next: Partial<User> = { ...formData, groupId: g.id };
                      if (g.id === 'admin' || g.id === 'auditor' || g.id === 'user') next.role = g.id as Role;
                      setFormData(next);
                    }}
                    className={cn('p-3 rounded-lg border-2 transition-all cursor-pointer',
                      (formData.groupId || formData.role) === g.id ? 'border-primary bg-blue-50/50' : 'border-border-subtle hover:border-slate-300')}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-text-main">{isRtl ? g.nameAr : g.nameEn}</span>
                      {(formData.groupId || formData.role) === g.id && (
                        <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      {g.permissions.length} {isRtl ? 'صلاحية' : 'permissions'}
                      {g.isSystem && <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5">{isRtl ? 'افتراضية' : 'Built-in'}</span>}
                    </p>
                  </div>
                ))
              )}

              <button
                type="button"
                onClick={() => setShowOverrides(v => !v)}
                className="w-full text-[11px] font-bold text-primary hover:text-primary/80 mt-2 underline underline-offset-2"
              >
                {showOverrides
                  ? (isRtl ? 'إخفاء الصلاحيات الاستثنائية' : 'Hide custom overrides')
                  : (isRtl ? 'صلاحيات استثنائية لهذا المستخدم' : 'Custom overrides for this user')}
              </button>

              {showOverrides && (
                <OverridesEditor
                  user={formData}
                  groups={permissionGroups}
                  onChange={(granted, revoked) =>
                    setFormData({
                      ...formData,
                      permissionOverrides:
                        granted.length === 0 && revoked.length === 0
                          ? undefined
                          : { granted, revoked },
                    })
                  }
                  isRtl={isRtl}
                />
              )}
            </div>

            <div className="bg-white rounded-xl border border-border-subtle p-4 space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!formData.bypassOtp}
                  onChange={(e) => setFormData({ ...formData, bypassOtp: e.target.checked })}
                  className="mt-0.5 w-4 h-4 rounded border-border-subtle text-primary focus:ring-primary"
                />
                <div className="flex-1">
                  <div className="text-sm font-bold text-text-main">
                    {isRtl ? 'استثناء من رمز التحقق (OTP)' : 'Bypass OTP Verification'}
                  </div>
                  <p className="text-[11px] text-text-muted leading-relaxed mt-0.5">
                    {isRtl
                      ? 'عند التفعيل، يدخل هذا المستخدم مباشرة بعد كلمة المرور دون الحاجة لرمز تحقق عبر البريد.'
                      : 'When enabled, this user signs in directly after entering their password without an emailed code.'}
                  </p>
                </div>
              </label>
            </div>

            <div className="bg-white rounded-xl border border-border-subtle p-5 space-y-3">
              <div className="flex items-center gap-2 text-rose-600 font-bold">
                <ShieldAlert className="w-5 h-5" />
                {t('special_permissions') || (isRtl ? 'صلاحيات خاصة' : 'Special Permissions')}
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!formData.receiveSecurityIncidents}
                  onChange={(e) => setFormData({ ...formData, receiveSecurityIncidents: e.target.checked })}
                  className="mt-0.5 w-4 h-4 rounded border-border-subtle accent-rose-600"
                />
                <div className="flex-1">
                  <div className="text-sm font-bold text-text-main">
                    {t('receive_security_incidents') || (isRtl ? 'استلام البلاغات الأمنية مباشرة' : 'Receive security incident reports')}
                  </div>
                  <p className="text-[11px] text-text-muted leading-relaxed mt-0.5">
                    {t('receive_security_incidents_desc') || (isRtl
                      ? 'يتم إرسال إشعار وبريد فوري لهذا المستخدم عند تقديم أي بلاغ أمني جديد.'
                      : 'This user receives an instant in-app and email notification for every new security incident report.')}
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
          <Button variant="outline" onClick={onClose} disabled={savingUser} className="rounded-lg h-10 px-5 font-bold">
            <X className="w-4 h-4 mr-1" />
            {t('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={savingUser} className="bg-primary hover:bg-primary/90 text-white rounded-lg h-10 px-6 font-bold">
            <Save className="w-4 h-4 mr-1" />
            {savingUser ? (t('loading') || 'Loading...') : t('save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Three-state toggle for each permission: inherit-from-group, force-grant, force-revoke.
 * Only renders the screens/services whose names match the search; lazy expansion
 * keeps things manageable when the matrix is large. */
function OverridesEditor({ user, groups, onChange, isRtl }: { user: Partial<User>; groups: PermissionGroup[]; onChange: (granted: string[], revoked: string[]) => void; isRtl: boolean }) {
  const groupId = user.groupId || user.role || 'user';
  const group = groups.find(g => g.id === groupId);
  const groupSet = new Set(group?.permissions || []);
  const granted = new Set(user.permissionOverrides?.granted || []);
  const revoked = new Set(user.permissionOverrides?.revoked || []);

  // Three-state cycle on click: inherit → if-on-group then revoke / else grant → inherit.
  const cycle = (key: string) => {
    const onGroup = groupSet.has(key);
    const isGranted = granted.has(key);
    const isRevoked = revoked.has(key);

    const nextGranted = new Set(granted);
    const nextRevoked = new Set(revoked);

    if (isGranted) { nextGranted.delete(key); }
    else if (isRevoked) { nextRevoked.delete(key); }
    else if (onGroup) { nextRevoked.add(key); }
    else { nextGranted.add(key); }

    onChange(Array.from(nextGranted), Array.from(nextRevoked));
  };

  const [q, setQ] = useState('');
  const lc = q.trim().toLowerCase();

  return (
    <div className="space-y-2 pt-2 border-t border-border-subtle">
      <p className="text-[11px] text-text-muted leading-relaxed">
        {isRtl
          ? 'انقر على الصلاحية لتغيير حالتها: موروثة (—) → ممنوحة (✦) → مسحوبة (✗) → موروثة.'
          : 'Click a permission to cycle its state: inherit (—) → grant (✦) → revoke (✗) → inherit.'}
      </p>
      <Input value={q} onChange={e => setQ(e.target.value)} placeholder={isRtl ? 'بحث...' : 'Search...'} className="rounded-lg h-9 text-[12px]" />
      <div className="max-h-[280px] overflow-y-auto pr-1 space-y-2">
        {PERMISSION_SERVICES.map(svc => {
          const rows = svc.screens.flatMap(scr =>
            scr.actions
              .map(a => ({ scr, a, key: permKey(svc.id, scr.id, a.key) }))
              .filter(({ a, scr }) => !lc
                || (isRtl ? svc.labelAr : svc.labelEn).toLowerCase().includes(lc)
                || (isRtl ? scr.labelAr : scr.labelEn).toLowerCase().includes(lc)
                || (isRtl ? a.labelAr : a.labelEn).toLowerCase().includes(lc)
              )
          );
          if (rows.length === 0) return null;
          return (
            <div key={svc.id} className="border border-border-subtle rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-text-main">{isRtl ? svc.labelAr : svc.labelEn}</div>
              <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                {rows.map(({ scr, a, key }) => {
                  const onGroup = groupSet.has(key);
                  const isGranted = granted.has(key);
                  const isRevoked = revoked.has(key);
                  const state = isGranted ? 'granted' : isRevoked ? 'revoked' : onGroup ? 'inherited-on' : 'inherited-off';
                  const styles = {
                    'inherited-off': 'border-border-subtle bg-white text-text-muted',
                    'inherited-on': 'border-emerald-200 bg-emerald-50/40 text-emerald-700',
                    'granted': 'border-blue-400 bg-blue-50 text-blue-700',
                    'revoked': 'border-rose-400 bg-rose-50 text-rose-700',
                  }[state];
                  const icon = state === 'granted' ? '✦' : state === 'revoked' ? '✗' : state === 'inherited-on' ? '✓' : '—';
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => cycle(key)}
                      className={cn('flex items-center gap-2 px-2 py-1 rounded-md border text-[11px] font-medium text-start transition-colors', styles)}
                      title={key}
                    >
                      <span className="font-mono w-4 text-center">{icon}</span>
                      <span className="truncate">{isRtl ? `${scr.labelAr} — ${a.labelAr}` : `${scr.labelEn} — ${a.labelEn}`}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

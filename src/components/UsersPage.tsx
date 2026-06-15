import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Search,
  Mail,
  Shield,
  Building2,
  MoreVertical,
  Edit2,
  Trash2,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { mockService, resolveAttachmentUrl } from '@/services/mockService';
import { User } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PasswordRulesList, isPasswordValid } from './shared/PasswordRules';
import { UserFormDialog } from './shared/UserFormDialog';
import { useAuth } from '@/AuthContext';

export default function UsersPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { can } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [passwordTarget, setPasswordTarget] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const isRtl = i18n.language === 'ar';

  useEffect(() => {
    setUsers(mockService.getUsers());
  }, []);

  const handleDelete = (id: string) => {
    setIdToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (idToDelete) {
      mockService.deleteUser(idToDelete);
      setUsers(mockService.getUsers());
      setIsDeleteConfirmOpen(false);
      setIdToDelete(null);
    }
  };

  const openPasswordDialog = (user: User) => {
    setPasswordTarget(user);
    setNewPassword('');
    setConfirmPassword('');
    setShowPwd(false);
    setShowConfirmPwd(false);
  };

  const closePasswordDialog = () => {
    setPasswordTarget(null);
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleSavePassword = () => {
    if (!passwordTarget) return;
    if (!isPasswordValid(newPassword)) {
      toast.error(t('password_min_length'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('passwords_do_not_match'));
      return;
    }
    setSavingPassword(true);
    const result = mockService.setUserPassword(passwordTarget.uid, newPassword);
    setSavingPassword(false);
    if (result.success) {
      toast.success(t('password_changed_success'));
      closePasswordDialog();
    } else {
      toast.error(result.error === 'min_length' ? t('password_min_length') : t('error_updating_profile'));
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="badge-minimal bg-purple-50 text-purple-700 border border-purple-100">{t('admin')}</span>;
      case 'auditor':
        return <span className="badge-minimal bg-blue-50 text-blue-700 border border-blue-100">{t('auditor')}</span>;
      default:
        return <span className="badge-minimal bg-slate-100 text-slate-700 border border-slate-200">{t('user')}</span>;
    }
  };

  const filteredUsers = users.filter(u => 
    u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-main">{t('users')}</h1>
          <p className="text-text-muted mt-1">{t('manage_users_desc')}</p>
        </div>
        {can('users.create') && (
          <Button
            onClick={() => { setEditingUserId(null); setUserDialogOpen(true); }}
            className="bg-primary hover:bg-primary/90 text-white font-bold px-6 h-11 rounded-lg shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            {t('add_user')}
          </Button>
        )}
      </div>

      <div className="table-container">
        <div className="section-header">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input 
              className="pl-10 rounded-lg border-border-subtle bg-slate-50/50 h-11" 
              placeholder={t('search_users')} 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className={isRtl ? "text-right" : "text-left"}>{t('user')}</th>
                <th className={isRtl ? "text-right" : "text-left"}>{t('role')}</th>
                <th className={isRtl ? "text-right" : "text-left"}>{t('department')}</th>
                <th className={isRtl ? "text-right" : "text-left"}>{t('teams')}</th>
                <th className={isRtl ? "text-left" : "text-right"}>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.uid} className="hover:bg-slate-50/50 transition-colors">
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 border-2 border-white shadow-sm">
                          <AvatarImage src={resolveAttachmentUrl(user.photoURL || '') || user.photoURL} />
                          <AvatarFallback className="bg-blue-50 text-blue-700 font-bold">
                            {user.displayName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold text-text-main">{user.displayName}</p>
                          <div className="flex items-center gap-1.5 text-[11px] text-text-muted font-medium mt-0.5">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{getRoleBadge(user.role)}</td>
                    <td>
                      <div className="flex items-center gap-2 text-[13px] text-text-muted font-medium">
                        <Building2 className="w-4 h-4" />
                        {user.departments.join(', ')}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1.5">
                        {user.teams.map(team => (
                          <span key={team} className="badge-minimal bg-slate-50 text-slate-600 border border-slate-200 text-[10px]">
                            {team}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className={cn("flex gap-2", isRtl ? "justify-start" : "justify-end")}>
                        {can('users.edit') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setEditingUserId(user.uid); setUserDialogOpen(true); }}
                            className="w-8 h-8 rounded-lg text-blue-600 hover:bg-blue-50"
                            title={t('edit_user') as string}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                        {can('users.edit') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openPasswordDialog(user)}
                            className="w-8 h-8 rounded-lg text-amber-600 hover:bg-amber-50"
                            title={t('change_password') as string}
                          >
                            <KeyRound className="w-4 h-4" />
                          </Button>
                        )}
                        {can('users.delete') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(user.uid)}
                            className="w-8 h-8 rounded-lg text-rose-600 hover:bg-rose-50"
                            title={t('delete') as string}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-text-muted font-medium">
                    {t('no_users_found')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>

      {/* Change Password Dialog */}
      <Dialog open={!!passwordTarget} onOpenChange={(open) => { if (!open) closePasswordDialog(); }}>
        <DialogContent className="sm:max-w-[440px]" dir={isRtl ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-amber-600">
              <KeyRound className="w-5 h-5" />
              {t('change_password')}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {passwordTarget && (
              <p className="text-sm text-text-muted font-medium">
                {t('change_password_for', { name: passwordTarget.displayName })}
              </p>
            )}
            <div className="space-y-2">
              <label className="text-[12px] font-bold text-text-main">{t('new_password')} <span className="text-red-500">*</span></label>
              <div className="relative">
                <Input
                  type={showPwd ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder={t('new_password') as string}
                  className={cn("rounded-lg border-border-subtle h-11", isRtl ? "pl-10" : "pr-10")}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(s => !s)}
                  className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600", isRtl ? "left-3" : "right-3")}
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPassword && <PasswordRulesList value={newPassword} />}
            </div>
            <div className="space-y-2">
              <label className="text-[12px] font-bold text-text-main">{t('confirm_password')} <span className="text-red-500">*</span></label>
              <div className="relative">
                <Input
                  type={showConfirmPwd ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder={t('confirm_password') as string}
                  className={cn("rounded-lg border-border-subtle h-11", isRtl ? "pl-10" : "pr-10")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPwd(s => !s)}
                  className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600", isRtl ? "left-3" : "right-3")}
                  tabIndex={-1}
                >
                  {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-text-muted">{t('password_min_length')}</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={closePasswordDialog} className="font-bold" disabled={savingPassword}>
              {t('cancel')}
            </Button>
            <Button
              onClick={handleSavePassword}
              disabled={savingPassword}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-6"
            >
              {savingPassword ? '…' : t('save_password')}
            </Button>
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
              {t('confirm_delete_user_desc') || 'Are you sure you want to delete this user? This action cannot be undone.'}
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

      <UserFormDialog
        open={userDialogOpen}
        userId={editingUserId}
        onSaved={() => setUsers(mockService.getUsers())}
        onClose={() => setUserDialogOpen(false)}
      />
    </>
  );
}

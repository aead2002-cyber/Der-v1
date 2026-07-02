import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FileText, 
  Plus, 
  Search, 
  Calendar, 
  User as UserIcon, 
  Shield, 
  AlertCircle,
  MoreVertical,
  Edit2,
  Trash2,
  CheckCircle,
  RefreshCw,
  ArrowRight,
  Clock,
  Save,
  Paperclip,
  X,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip } from '@/components/ui/tooltip';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { commitmentsApi } from '@/modules/der3/services/commitmentsApi';
import { filesApi } from '@/services/filesApi';
import { usersApi } from '@/services/usersApi';
import { getNotificationSettings } from '@/lib/notificationSettingsStore';
import { dispatchNotification } from '@/lib/notificationDispatcher';
import { Commitment, User } from '@/types';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ConfirmDialog, PageHeader } from '@/shared/ui';

export default function CommitmentsPage() {
  const { t, i18n } = useTranslation();
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);
  const [editingCommitment, setEditingCommitment] = useState<Partial<Commitment> | null>(null);
  const [isCommCompleteDialogOpen, setIsCommCompleteDialogOpen] = useState(false);
  const [selectedCommForComplete, setSelectedCommForComplete] = useState<Commitment | null>(null);
  const [commEvidenceTitle, setCommEvidenceTitle] = useState('');
  const [commEvidenceLink, setCommEvidenceLink] = useState('');
  const [isCommUploading, setIsCommUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const isRtl = i18n.language === 'ar';

  useEffect(() => {
    void refresh();
  }, []);

  const refresh = async () => {
    try {
      const [commitmentsData, usersData] = await Promise.all([
        commitmentsApi.getCommitments(),
        usersApi.getUsers(),
      ]);
      setCommitments(commitmentsData);
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to load commitments data', error);
      toast.error(t('failed_to_load_data') || 'Failed to load data');
    }
  };

  const getStatusBadge = (commitment: Commitment) => {
    if (commitment.status === 'completed') {
      return (
        <span className="badge-minimal bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          {t('completed') || 'Completed'}
        </span>
      );
    }

    const today = new Date();
    const expiry = parseISO(commitment.expiryDate);
    const diff = differenceInDays(expiry, today);

    if (diff < 0) {
      return (
        <span className="badge-minimal bg-rose-50 text-rose-700 border border-rose-100 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {t('expired') || 'Expired'}
        </span>
      );
    } else if (diff <= 30) {
      return (
        <span className="badge-minimal bg-orange-50 text-orange-700 border border-orange-100 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {t('expiring_soon') || 'Expiring Soon'}
        </span>
      );
    } else {
      return (
        <span className="badge-minimal bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1">
          <Shield className="w-3 h-3" />
          {t('active') || 'Active'}
        </span>
      );
    }
  };

  const handleSave = async () => {
    if (!editingCommitment?.nameAr || !editingCommitment?.nameEn || !editingCommitment?.expiryDate || !editingCommitment?.responsibleUser) {
      toast.error(t('fill_required_fields'));
      return;
    }

    const commitment: Commitment = {
      id: editingCommitment.id || Math.random().toString(36).substr(2, 9),
      nameAr: editingCommitment.nameAr,
      nameEn: editingCommitment.nameEn,
      descriptionAr: editingCommitment.descriptionAr,
      descriptionEn: editingCommitment.descriptionEn,
      expiryDate: editingCommitment.expiryDate,
      responsibleUser: editingCommitment.responsibleUser,
      status: 'active', // Will be recalculated by helper
      createdAt: editingCommitment.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (editingCommitment.id) {
        await commitmentsApi.updateCommitment(editingCommitment.id, commitment);
      } else {
        await commitmentsApi.createCommitment(commitment);
      }

    // Add Notification if enabled
    if (commitment.responsibleUser) {
      const settings = getNotificationSettings();
      if (settings.notifyOnAssignment) {
        await dispatchNotification({
          userId: commitment.responsibleUser,
          titleAr: 'إسناد التزام جديد',
          titleEn: 'New Commitment Assigned',
          messageAr: `تم إسناد التزام جديد لك: ${commitment.nameAr}`,
          messageEn: `A new commitment has been assigned to you: ${commitment.nameEn}`,
          type: 'procedure_assignment',
          link: '/tasks'
        });
      }
    }

      await refresh();
      setIsDialogOpen(false);
      setEditingCommitment(null);
      toast.success(t('commitment_saved_success') || 'Commitment saved successfully');
    } catch (error) {
      console.error('Failed to save commitment', error);
      toast.error(t('commitment_save_failed') || 'Commitment could not be saved');
    }
  };

  const handleComplete = (commitment: Commitment) => {
    setSelectedCommForComplete(commitment);
    setCommEvidenceTitle('');
    setCommEvidenceLink('');
    setIsCommCompleteDialogOpen(true);
  };

  const confirmCommitmentCompletion = async () => {
    if (!selectedCommForComplete) return;
    if (!commEvidenceLink) {
      toast.error(isRtl ? 'يجب إرفاق ملف لإثبات الإنجاز' : 'You must attach a file to prove completion');
      return;
    }

    const updated: Commitment = {
      ...selectedCommForComplete,
      status: 'completed',
      evidenceTitle: commEvidenceTitle || (isRtl ? 'إثبات إنجاز الالتزام' : 'Evidence of completion'),
      evidenceLink: commEvidenceLink,
      evidenceUploadedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await commitmentsApi.updateCommitment(updated.id, updated);
      await refresh();
      setIsCommCompleteDialogOpen(false);
      setSelectedCommForComplete(null);
      toast.success(t('commitment_completed_success') || 'Commitment completed successfully');
    } catch (error) {
      console.error('Failed to complete commitment', error);
      toast.error(t('commitment_complete_failed') || 'Commitment could not be completed');
    }
  };

  const handleViewAttachment = async (value: string) => {
    try {
      await filesApi.openFile(value);
    } catch (error) {
      console.error('Failed to open commitment evidence', error);
      setPreviewFile(value);
      setIsPreviewOpen(true);
    }
  };

  const handleReactivate = async (commitment: Commitment) => {
    const updated: Commitment = {
      ...commitment,
      status: 'active',
      updatedAt: new Date().toISOString()
    };
    try {
      await commitmentsApi.updateCommitment(updated.id, updated);
      await refresh();
      toast.success(t('commitment_reactivated_success') || 'Commitment reactivated successfully');
    } catch (error) {
      console.error('Failed to reactivate commitment', error);
      toast.error(t('commitment_reactivate_failed') || 'Commitment could not be reactivated');
    }
  };

  const handleDelete = (id: string) => {
    setIdToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (idToDelete) {
      try {
        await commitmentsApi.deleteCommitment(idToDelete);
        await refresh();
        setIsDeleteConfirmOpen(false);
        setIdToDelete(null);
        toast.success(t('commitment_deleted_success') || 'Commitment deleted successfully');
      } catch (error) {
        console.error('Failed to delete commitment', error);
        toast.error(t('commitment_delete_failed') || 'Commitment could not be deleted');
      }
    }
  };

  const filteredCommitments = commitments.filter(c => 
    c.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.nameEn.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader
        title={t('commitments') || 'Commitments & Licenses'}
        description={t('commitments_desc') || 'Manage regulatory licenses, certificates, and their expiry dates'}
        actions={
          <Button
            onClick={() => { setEditingCommitment({}); setIsDialogOpen(true); }}
            className="bg-primary hover:bg-primary/90 text-white font-bold px-6 h-11 rounded-lg shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('add_commitment') || 'Add Commitment'}
          </Button>
        }
      />

      <div className="table-container">
        <div className="section-header">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input 
              className="pl-10 rounded-lg border-border-subtle bg-slate-50/50 h-11" 
              placeholder={t('search_commitments') || 'Search commitments...'} 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className={isRtl ? "text-right" : "text-left"}>{t('commitment_name') || 'Commitment Name'}</th>
                <th className={isRtl ? "text-right" : "text-left"}>{t('status')}</th>
                <th className={isRtl ? "text-right" : "text-left"}>{t('expiry_date') || 'Expiry Date'}</th>
                <th className={isRtl ? "text-right" : "text-left"}>{t('responsible_user') || 'Responsible'}</th>
                <th className={isRtl ? "text-left" : "text-right"}>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredCommitments.length > 0 ? (
                filteredCommitments.map((commitment) => (
                  <tr key={commitment.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="max-w-[250px]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <Tooltip content={isRtl ? commitment.nameAr : commitment.nameEn}>
                            <p className="font-bold text-text-main truncate cursor-help">{isRtl ? commitment.nameAr : commitment.nameEn}</p>
                          </Tooltip>
                          {(isRtl ? commitment.descriptionAr : commitment.descriptionEn) && (
                            <Tooltip content={isRtl ? commitment.descriptionAr : commitment.descriptionEn}>
                              <p className="text-[11px] text-text-muted mt-0.5 truncate cursor-help opacity-75">
                                {isRtl ? commitment.descriptionAr : commitment.descriptionEn}
                              </p>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>{getStatusBadge(commitment)}</td>
                    <td>
                      <div className="flex items-center gap-2 text-sm text-text-main font-medium">
                        <Calendar className="w-4 h-4 text-text-muted" />
                        {commitment.expiryDate}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-white shadow-sm font-bold text-[10px]">
                          {users.find(u => u.uid === commitment.responsibleUser)?.displayName.charAt(0) || '?'}
                        </div>
                        <span className="text-xs font-bold text-text-main">
                          {users.find(u => u.uid === commitment.responsibleUser)?.displayName || t('unknown_user')}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className={isRtl ? "flex justify-start gap-2" : "flex justify-end gap-2"}>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => { setEditingCommitment(commitment); setIsDialogOpen(true); }}
                          className="w-8 h-8 rounded-lg text-blue-600 hover:bg-blue-50"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(commitment.id)}
                          className="w-8 h-8 rounded-lg text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        {commitment.status === 'completed' ? (
                          <div className="flex gap-1">
                            {commitment.evidenceLink && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleViewAttachment(commitment.evidenceLink!)}
                                className="w-8 h-8 rounded-lg text-blue-600 hover:bg-blue-50"
                                title={isRtl ? 'عرض الإثبات' : 'View Evidence'}
                              >
                                <Paperclip className="w-4 h-4" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleReactivate(commitment)}
                              className="w-8 h-8 rounded-lg text-emerald-600 hover:bg-emerald-50"
                              title={t('reactivate') || 'Reactivate'}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleComplete(commitment)}
                            className="w-8 h-8 rounded-lg text-blue-600 hover:bg-blue-50"
                            title={t('mark_as_completed') || 'Mark as Completed'}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-text-muted font-medium">
                    {t('no_commitments_found') || 'No commitments found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingCommitment?.id ? t('edit_commitment') || 'Edit Commitment' : t('add_commitment') || 'Add Commitment'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-main">{t('name_ar')} <span className="text-red-500">*</span></label>
                <Input 
                  value={editingCommitment?.nameAr || ''} 
                  onChange={e => setEditingCommitment({...editingCommitment, nameAr: e.target.value})}
                  placeholder="مثال: رخصة البلدية"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-main">{t('name_en')} <span className="text-red-500">*</span></label>
                <Input 
                  value={editingCommitment?.nameEn || ''} 
                  onChange={e => setEditingCommitment({...editingCommitment, nameEn: e.target.value})}
                  placeholder="Example: Municipal License"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-text-main">{t('expiry_date') || 'Expiry Date'} <span className="text-red-500">*</span></label>
              <Input 
                type="date"
                value={editingCommitment?.expiryDate || ''} 
                onChange={e => setEditingCommitment({...editingCommitment, expiryDate: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-text-main">{t('responsible_user') || 'Responsible User'} <span className="text-red-500">*</span></label>
              <Select 
                value={editingCommitment?.responsibleUser || ''} 
                onValueChange={val => setEditingCommitment({...editingCommitment, responsibleUser: val})}
              >
                <SelectTrigger className="rounded-lg h-11">
                  <SelectValue>
                    {editingCommitment?.responsibleUser 
                      ? (users.find(u => u.uid === editingCommitment.responsibleUser)?.displayName || editingCommitment.responsibleUser)
                      : (t('select_user') || 'Select User')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.uid} value={user.uid}>
                      {user.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-text-main">{t('description_ar')}</label>
              <Input 
                value={editingCommitment?.descriptionAr || ''} 
                onChange={e => setEditingCommitment({...editingCommitment, descriptionAr: e.target.value})}
                placeholder="تفاصيل الترخيص..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="font-bold">
              {t('cancel')}
            </Button>
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-white font-bold px-6">
              <Save className="w-4 h-4 mr-2" />
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        title={t('confirm_delete') || 'Confirm Delete'}
        description={t('confirm_delete_commitment_desc') || 'Are you sure you want to delete this commitment? This action cannot be undone.'}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        onConfirm={handleConfirmDelete}
      />

      {/* Commitment Completion Dialog */}
      <Dialog open={isCommCompleteDialogOpen} onOpenChange={setIsCommCompleteDialogOpen}>
        <DialogContent className="sm:max-w-[450px]" dir={isRtl ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle className="w-5 h-5" />
              {isRtl ? 'إكمال الالتزام وإرفاق الإثبات' : 'Complete Commitment & Attach Evidence'}
            </DialogTitle>
            <DialogDescription>
              {isRtl 
                ? 'يجب إرفاق ملف يثبت إنجاز هذا الالتزام لتغيير حالته إلى مكتمل.' 
                : 'You must attach a file proving completion to mark this as completed.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-text-main">{isRtl ? 'عنوان المرفق' : 'Evidence Title'}</Label>
              <Input 
                placeholder={isRtl ? 'مثال: تقرير الالتزام، رخصة مجددة...' : 'e.g. Compliance report, renewed license...'}
                value={commEvidenceTitle}
                onChange={e => setCommEvidenceTitle(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-bold text-text-main">{isRtl ? 'المرفق (إلزامي)' : 'Attachment (Mandatory)'} <span className="text-red-500">*</span></Label>
              
              {commEvidenceLink && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs font-medium flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-3 h-3 text-emerald-600" />
                    <span className="truncate max-w-[200px] text-emerald-700">{(() => { const lc = commEvidenceLink; if (lc.startsWith('/api/files/') || /^https?:\/\//i.test(lc)) { const p = lc.split('/'); return p[p.length-1].replace(/^\d+-[a-f0-9]+-/, ''); } return lc; })()}</span>
                  </div>
                  <button onClick={() => setCommEvidenceLink('')} className="text-emerald-400 hover:text-rose-500 font-bold text-lg">×</button>
                </div>
              )}

              {!commEvidenceLink && (
                <div className="relative">
                  <input
                    type="file"
                    id="page-comm-file-upload"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setIsCommUploading(true);
                      const uploaded = await filesApi.uploadFile(file).catch((error: any) => {
                        console.error('Failed to upload commitment evidence', error);
                        return null;
                      });
                      setIsCommUploading(false);
                      e.target.value = '';
                      if (!uploaded) { toast.error(isRtl ? 'فشل رفع الملف' : 'Upload failed'); return; }
                      setCommEvidenceLink(uploaded.url);
                      setCommEvidenceTitle(currentTitle => currentTitle || uploaded.name);
                      toast.success(isRtl ? 'تم رفع إثبات الإنجاز' : 'Evidence uploaded');
                    }}
                  />
                  <Button 
                    variant="outline" 
                    nativeButton={false}
                    render={
                      <label htmlFor="page-comm-file-upload" className="cursor-pointer flex flex-col items-center justify-center">
                        {isCommUploading ? (
                          <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                        ) : (
                          <>
                            <Paperclip className="w-5 h-5 text-emerald-600" />
                            <span className="font-bold text-slate-700 text-xs">{isRtl ? 'انقر لإرفاق ملف الإثبات' : 'Click to attach evidence file'}</span>
                          </>
                        )}
                      </label>
                    }
                    className="w-full border-dashed border-emerald-300 bg-white hover:bg-emerald-50 h-24 text-slate-500 rounded-xl cursor-pointer flex-col gap-2"
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsCommCompleteDialogOpen(false)} className="font-bold">
              {t('cancel')}
            </Button>
            <Button onClick={confirmCommitmentCompletion} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6">
              {isRtl ? 'إكمال' : 'Complete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl bg-white p-0 overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="bg-slate-900 p-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-blue-400" />
              <div>
                <h3 className="font-bold text-sm">{previewFile}</h3>
                <p className="text-[10px] text-slate-400">{isRtl ? 'معاينة المرفق' : 'Attachment Preview'}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsPreviewOpen(false)} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="p-12 bg-slate-50 min-h-[400px] flex flex-col items-center justify-center text-center">
            <Paperclip className="w-12 h-12 text-slate-200 mb-4" />
            <h4 className="text-xl font-bold mb-2">{isRtl ? 'معاينة الملف' : 'File Preview'}</h4>
            <p className="text-slate-500 text-sm mb-8">{previewFile}</p>
            <Button onClick={() => setIsPreviewOpen(false)} className="bg-blue-600 text-white px-8">{isRtl ? 'إغلاق' : 'Close'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

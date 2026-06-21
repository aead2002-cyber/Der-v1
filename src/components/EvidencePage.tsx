import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, 
  Plus, 
  FileText, 
  Trash2, 
  ExternalLink, 
  Shield, 
  Calendar, 
  User,
  Upload,
  File,
  X,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { mockService } from '@/services/mockService';
import { evidenceApi } from '@/services/evidenceApi';
import { filesApi, isBackendFileUrl, resolveFileUrl } from '@/services/filesApi';
import { proceduresApi } from '@/services/proceduresApi';
import { usersApi } from '@/services/usersApi';
import { Procedure, Evidence, User as UserType } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/AuthContext';

export default function EvidencePage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isRtl = i18n.language === 'ar';
  const { user, can } = useAuth();

  const [procedure, setProcedure] = useState<Procedure | null>(null);
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [sourceType, setSourceType] = useState<'link' | 'file'>('link');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newEvidence, setNewEvidence] = useState<Partial<Evidence>>({
    name: '',
    description: '',
    url: '',
    type: 'PDF'
  });

  const loadData = React.useCallback(async () => {
    if (!id) return;

    try {
      const [procedures, evidenceRows, userRows] = await Promise.all([
        proceduresApi.getProcedures(),
        evidenceApi.getEvidence(id),
        usersApi.getUsers(),
      ]);
      setUsers(userRows);
      const proc = procedures.find(p => p.id === id);
      if (proc) {
        setProcedure(proc);
        setEvidenceList(evidenceRows);
      } else {
        toast.error(t('procedure_not_found') || 'Procedure not found');
        navigate('/procedures');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Could not load evidence');
    }
  }, [id, navigate, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!newEvidence.name) {
        setNewEvidence(prev => ({ ...prev, name: file.name }));
      }
    }
  };

  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);

  const handleAddEvidence = async () => {
    if (!newEvidence.name) {
      toast.error(t('fill_required_fields'));
      return;
    }

    if (sourceType === 'link' && !newEvidence.url) {
      toast.error(t('url_required') || 'URL is required');
      return;
    }

    if (sourceType === 'file' && !selectedFile) {
      toast.error(t('file_required') || 'File is required');
      return;
    }

    let url = newEvidence.url || '';
    let type = 'LINK';

    if (sourceType === 'file' && selectedFile) {
      setIsUploadingEvidence(true);
      let uploaded;
      try {
        uploaded = await filesApi.uploadFile(selectedFile);
      } catch (err: any) {
        setIsUploadingEvidence(false);
        toast.error(err?.message || t('upload_failed') || 'Upload failed');
        return;
      }
      setIsUploadingEvidence(false);
      if (!uploaded) {
        toast.error(t('upload_failed') || 'Upload failed');
        return;
      }
      url = uploaded.url;
      type = (selectedFile.type.split('/')[1] || 'FILE').toUpperCase();
    }

    const evidence: Evidence = {
      id: Math.random().toString(36).substr(2, 9),
      procedureId: id!,
      name: newEvidence.name || '',
      description: newEvidence.description || '',
      url,
      type,
      uploadedBy: user?.uid || '',
      uploadedAt: new Date().toISOString(),
    };

    try {
      await evidenceApi.createEvidence(evidence);
      await loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Could not save evidence');
      return;
    }
    setIsAddDialogOpen(false);
    setNewEvidence({ name: '', description: '', url: '', type: 'PDF' });
    setSelectedFile(null);
    setSourceType('link');
    toast.success(t('evidence_added_success') || 'Evidence added successfully');
  };

  const handleDeleteEvidence = (evidenceId: string) => {
    setIdToDelete(evidenceId);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (idToDelete) {
      // Defense in depth: enforce ownership / full-delete permission at the action layer.
      const target = evidenceList.find(e => e.id === idToDelete);
      const isOwner = !!user && target?.uploadedBy === user.uid;
      if (!isOwner && !can('procedures.evidence.delete')) {
        toast.error(isRtl ? 'لا يمكنك حذف هذا الشاهد — تحتاج صلاحية كاملة أو أن تكون رافعه' : 'You cannot delete this evidence — needs full delete permission or ownership');
        setIsDeleteConfirmOpen(false);
        setIdToDelete(null);
        return;
      }
      try {
        await evidenceApi.deleteEvidence(idToDelete);
        if (target?.url && isBackendFileUrl(target.url)) {
          await filesApi.deleteFile(target.url).catch(err => console.warn('File delete failed:', err));
        }
        await loadData();
        setIsDeleteConfirmOpen(false);
        setIdToDelete(null);
        toast.success(t('evidence_deleted_success') || 'Evidence deleted successfully');
      } catch (err: any) {
        console.error(err);
        toast.error(err?.message || 'Could not delete evidence');
      }
    }
  };

  if (!procedure) return null;

  const handleBack = () => {
    if (location.state?.from === '/my-tasks') {
      navigate('/my-tasks');
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleBack}
            className="rounded-full hover:bg-slate-100"
          >
            <ArrowLeft className={cn("w-5 h-5", isRtl && "rotate-180")} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-main">{t('evidence_management') || 'Evidence Management'}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-primary font-bold">{isRtl ? procedure.nameAr : procedure.nameEn}</span>
              <span className="text-text-muted text-sm">•</span>
              <span className="text-text-muted text-sm">{t('procedure') || 'Procedure'}</span>
            </div>
          </div>
        </div>

        <Button 
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-primary hover:bg-primary/90 text-white font-bold px-6 h-11 rounded-lg shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('add_evidence') || 'Add Evidence'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {evidenceList.length > 0 ? (
              evidenceList.map((evidence) => {
                const uploader = users.find(u => u.uid === evidence.uploadedBy);
                const uploaderName = uploader?.displayName || evidence.uploadedBy || (isRtl ? 'مستخدم' : 'User');
                const isOwner = !!user && evidence.uploadedBy === user.uid;
                const canDeleteEvidence = isOwner || can('procedures.evidence.delete');
                return (
                <div key={evidence.id} className="bg-white rounded-2xl border border-border-subtle p-5 shadow-sm hover:shadow-md transition-all group relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canDeleteEvidence && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 rounded-lg text-rose-600 hover:bg-rose-50"
                          onClick={() => handleDeleteEvidence(evidence.id)}
                          title={isOwner
                            ? (isRtl ? 'حذف الشاهد (مالكه)' : 'Delete (you uploaded it)')
                            : (isRtl ? 'حذف الشاهد (صلاحية كاملة)' : 'Delete (full permission)')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-bold text-text-main truncate pr-8">{evidence.name}</h3>
                    <p className="text-xs text-text-muted line-clamp-2 min-h-[32px]">
                      {evidence.description || t('no_description') || 'No description provided'}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center gap-1.5 text-[11px] text-text-muted font-medium">
                    <User className="w-3 h-3" />
                    <span className="truncate" title={uploaderName}>
                      {isRtl ? 'رفعه:' : 'Uploaded by:'} <span className="font-bold text-text-main">{uploaderName}</span>
                    </span>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px] text-text-muted font-medium">
                      <Calendar className="w-3 h-3" />
                      {new Date(evidence.uploadedAt).toLocaleDateString(i18n.language)}
                    </div>
                    <a
                      href={resolveFileUrl(evidence.url) || evidence.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        e.preventDefault();
                        if (!resolveFileUrl(evidence.url) && !/^https?:\/\//i.test(evidence.url)) {
                          e.preventDefault();
                          toast.error(t('attachment_unavailable') || 'Attachment unavailable — please re-upload');
                          return;
                        }
                        filesApi.openFile(evidence.url).catch(err => toast.error(err?.message || 'Could not open file'));
                      }}
                      className="text-primary text-xs font-bold flex items-center gap-1 hover:underline"
                    >
                      {t('view_file') || 'View File'}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                );
              })
            ) : (
              <div className="col-span-full bg-slate-50/50 rounded-2xl border-2 border-dashed border-border-subtle p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <File className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-text-main mb-1">{t('no_evidence_yet') || 'No evidence yet'}</h3>
                <p className="text-text-muted text-sm max-w-xs mx-auto mb-6">
                  {t('no_evidence_desc') || 'Start by uploading evidence to support this procedure compliance.'}
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(true)}
                  className="rounded-lg px-6 border-border-subtle font-bold"
                >
                  {t('add_first_evidence') || 'Add First Evidence'}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-border-subtle p-6 shadow-sm space-y-6">
            <h3 className="font-bold text-text-main flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              {t('procedure_details') || 'Procedure Details'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{t('status')}</label>
                <div className="mt-1">
                  {procedure.status === 'completed' ? (
                    <span className="badge-minimal bg-emerald-50 text-emerald-700">{t('completed')}</span>
                  ) : procedure.status === 'in_progress' ? (
                    <span className="badge-minimal bg-blue-50 text-blue-700">{t('in_progress')}</span>
                  ) : (
                    <span className="badge-minimal bg-slate-100 text-slate-700">{t('not_started')}</span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{t('assigned_to')}</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {procedure.assignedTo.map((uid, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-lg border border-border-subtle">
                      <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center text-[10px] font-bold text-blue-600">
                        U
                      </div>
                      <span className="text-xs font-medium text-text-main">User {uid}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{t('timeline')}</label>
                <div className="mt-1 flex items-center gap-2 text-sm text-text-main font-medium">
                  <Calendar className="w-4 h-4 text-text-muted" />
                  {procedure.startDate} - {procedure.endDate}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{t('add_evidence')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="flex p-1 bg-slate-100 rounded-lg">
              <button 
                className={cn(
                  "flex-1 py-1.5 text-xs font-bold rounded-md transition-all",
                  sourceType === 'link' ? "bg-white shadow-sm text-primary" : "text-text-muted hover:text-text-main"
                )}
                onClick={() => setSourceType('link')}
              >
                {t('link') || 'Link'}
              </button>
              <button 
                className={cn(
                  "flex-1 py-1.5 text-xs font-bold rounded-md transition-all",
                  sourceType === 'file' ? "bg-white shadow-sm text-primary" : "text-text-muted hover:text-text-main"
                )}
                onClick={() => setSourceType('file')}
              >
                {t('file_upload') || 'File Upload'}
              </button>
            </div>

            <div className="grid gap-2">
              <label className="text-[13px] font-bold text-text-main">{t('evidence_name') || 'Evidence Name'} <span className="text-red-500">*</span></label>
              <Input 
                value={newEvidence.name || ''} 
                onChange={e => setNewEvidence({...newEvidence, name: e.target.value})}
                placeholder={t('evidence_name_placeholder') || 'e.g., Screenshot of configuration'}
                className="rounded-lg border-border-subtle h-11"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-[13px] font-bold text-text-main">{t('description')}</label>
              <textarea 
                value={newEvidence.description || ''} 
                onChange={e => setNewEvidence({...newEvidence, description: e.target.value})}
                placeholder={t('evidence_desc_placeholder') || 'Briefly describe what this evidence proves...'}
                className="w-full min-h-[80px] rounded-lg border border-border-subtle p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-transparent"
              />
            </div>
            
            {sourceType === 'link' ? (
              <div className="grid gap-2">
                <label className="text-[13px] font-bold text-text-main">{t('file_url') || 'File URL / Link'} <span className="text-red-500">*</span></label>
                <div className="relative">
                  <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    value={newEvidence.url || ''} 
                    onChange={e => setNewEvidence({...newEvidence, url: e.target.value})}
                    placeholder="https://..."
                    className="rounded-lg border-border-subtle h-11 pl-10"
                  />
                </div>
                <p className="text-[11px] text-text-muted">{t('file_url_hint') || 'In this demo, please provide a link to the file.'}</p>
              </div>
            ) : (
              <div className="grid gap-2">
                <label className="text-[13px] font-bold text-text-main">{t('upload_file') || 'Upload File'} <span className="text-red-500">*</span></label>
                <div 
                  className={cn(
                    "border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer",
                    selectedFile ? "border-primary bg-primary/5" : "border-border-subtle hover:border-primary/50 hover:bg-slate-50"
                  )}
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <input 
                    id="file-upload"
                    type="file" 
                    className="hidden" 
                    accept=".pdf,image/*"
                    onChange={handleFileChange}
                  />
                  {selectedFile ? (
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
                        <FileText className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-bold text-text-main truncate max-w-[200px] mx-auto">{selectedFile.name}</p>
                      <p className="text-[11px] text-text-muted">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                        <Upload className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-bold text-text-main">{t('click_to_upload') || 'Click to upload'}</p>
                      <p className="text-[11px] text-text-muted">{t('upload_hint') || 'PDF, PNG, JPG (Max 10MB)'}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="rounded-lg h-11 px-6 font-bold">{t('cancel')}</Button>
            <Button onClick={handleAddEvidence} disabled={isUploadingEvidence} className="bg-primary hover:bg-primary/90 text-white rounded-lg h-11 px-8 font-bold">{isUploadingEvidence ? (t('uploading') || 'Uploading...') : t('save')}</Button>
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
              {t('confirm_delete_evidence_desc') || 'Are you sure you want to delete this evidence file? This action cannot be undone.'}
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

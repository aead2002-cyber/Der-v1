import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { auditLogsApi } from '@/services/auditLogsApi';
import { changeRequestsApi } from '@/services/changeRequestsApi';
import { commitmentsApi } from '@/services/commitmentsApi';
import { frameworksApi } from '@/services/frameworksApi';
import { incidentFeedbackApi } from '@/services/incidentFeedbackApi';
import { incidentNotesApi } from '@/services/incidentNotesApi';
import { incidentsApi } from '@/services/incidentsApi';
import { lookupOptionsApi } from '@/services/lookupOptionsApi';
import { notificationsApi } from '@/services/notificationsApi';
import { policiesApi } from '@/services/policiesApi';
import { policyItemsApi } from '@/services/policyItemsApi';
import { proceduresApi } from '@/services/proceduresApi';
import { evidenceApi } from '@/services/evidenceApi';
import { filesApi, resolveFileUrl } from '@/services/filesApi';
import { standardsApi } from '@/services/standardsApi';
import { usersApi } from '@/services/usersApi';
import { useTableSort } from './shared/useTableSort';
import { SortableTableHead } from './shared/SortableTableHead';
import { Procedure, Commitment, PolicyItem, SecurityIncident, IncidentFeedback, IncidentNote, Evidence, ChangeRequest, ChangeRequestStatus, ChangeRequestType, Notification, AuditLog, LookupOption } from '../types';
import { useAuth } from '../AuthContext';
import { Link } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Calendar, 
  FileText, 
  ClipboardList, 
  Search, 
  Filter, 
  Paperclip,
  ChevronDown,
  Layout,
  ShieldCheck,
  Shield,
  Layers,
  ArrowRight,
  Trophy,
  Target,
  Zap,
  ShieldAlert,
  Star,
  MessageSquare,
  Plus,
  RefreshCw,
  X,
  Eye,
  LayoutGrid,
  List as ListIcon,
  Trash2,
  ExternalLink,
  Upload,
  User as UserIcon,
  Send,
  MessageCircle,
  FileCheck,
  MoreVertical,
  Check,
  X as XIcon,
  Save,
  UserCheck,
  UserX,
  CornerUpRight
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { toast } from 'sonner';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function MyTasksPage() {
  const { t, i18n } = useTranslation();
  const { user, can } = useAuth();
  const [myProcedures, setMyProcedures] = useState<Procedure[]>([]);
  const [myCommitments, setMyCommitments] = useState<Commitment[]>([]);
  const [myIncidents, setMyIncidents] = useState<SecurityIncident[]>([]);

  const [procViewMode, setProcViewMode] = useState<'detailed' | 'summary'>('summary');
  const [procSearch, setProcSearch] = useState('');
  const [procStatus, setProcStatus] = useState('all');
  const [procImportance, setProcImportance] = useState('all');
  const [procPolicy, setProcPolicy] = useState('all');
  const [procFramework, setProcFramework] = useState('all');
  const [procDate, setProcDate] = useState('');
  const [frameworks, setFrameworks] = useState<any[]>([]);

  // Comments dialog state
  const [commentProcedure, setCommentProcedure] = useState<Procedure | null>(null);
  const [newCommentText, setNewCommentText] = useState('');

  // Sort hooks for each table
  const procSort = useTableSort();
  const commSort = useTableSort();
  const incSort = useTableSort();
  const reqSort = useTableSort();

  const [commSearch, setCommSearch] = useState('');
  const [commStatus, setCommStatus] = useState('all');
  const [commDate, setCommDate] = useState('');

  const [incSearch, setIncSearch] = useState('');
  const [incStatus, setIncStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [selectedIncForAction, setSelectedIncForAction] = useState<SecurityIncident | null>(null);
  const [newStatusForAction, setNewStatusForAction] = useState<string>('');
  const [actionNote, setActionNote] = useState('');
  const [actionAttachments, setActionAttachments] = useState<string[]>([]);
  const [isActionUploading, setIsActionUploading] = useState(false);
  const [isCommCompleteDialogOpen, setIsCommCompleteDialogOpen] = useState(false);
  const [selectedCommForComplete, setSelectedCommForComplete] = useState<Commitment | null>(null);
  const [commEvidenceTitle, setCommEvidenceTitle] = useState('');
  const [commEvidenceLink, setCommEvidenceLink] = useState('');
  const [isCommUploading, setIsCommUploading] = useState(false);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [selectedIncForDetails, setSelectedIncForDetails] = useState<SecurityIncident | null>(null);
  const [incidentNotes, setIncidentNotes] = useState<IncidentNote[]>([]);
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Change Requests State
  const [mySentRequests, setMySentRequests] = useState<ChangeRequest[]>([]);
  const [myReceivedRequests, setMyReceivedRequests] = useState<ChangeRequest[]>([]);
  const [isNewRequestDialogOpen, setIsNewRequestDialogOpen] = useState(false);
  const [isManageRequestDialogOpen, setIsManageRequestDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null);
  const [lookupOptions, setLookupOptions] = useState<LookupOption[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
    type: 'tool_change' as ChangeRequestType,
    receiverId: '',
    attachments: [] as string[]
  });
  const [requestActionNote, setRequestActionNote] = useState('');
  const [requestActionAttachments, setRequestActionAttachments] = useState<string[]>([]);
  const [isRequestUploading, setIsRequestUploading] = useState(false);
  const [isActionUploadingRequest, setIsActionUploadingRequest] = useState(false);

  const refreshRequests = async () => {
    if (user) {
      try {
        const [allRequests, allUsers] = await Promise.all([
          changeRequestsApi.getChangeRequests(),
          usersApi.getUsers(),
        ]);
        setMySentRequests(allRequests.filter(r => r.senderId === user.uid));
        setMyReceivedRequests(allRequests.filter(r => r.receiverId === user.uid));
        setUsers(allUsers.filter(u => u.uid !== user.uid));
      } catch (error) {
        console.error('Failed to load change requests', error);
        toast.error(t('failed_to_load_data') || 'Failed to load data');
      }
    }
  };

  const handleCreateRequest = async () => {
    if (!user || !newRequest.title || !newRequest.receiverId) {
      toast.error(t('fill_required_fields'));
      return;
    }

    const receiver = users.find(u => u.uid === newRequest.receiverId);
    
    const request: ChangeRequest = {
      id: 'REQ-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      title: newRequest.title,
      description: newRequest.description,
      type: newRequest.type,
      senderId: user.uid,
      senderName: user.displayName,
      receiverId: newRequest.receiverId,
      receiverName: receiver?.displayName || 'Unknown',
      status: 'pending',
      attachments: newRequest.attachments,
      history: [{
        action: 'create',
        note: t('initial_request') || 'Initial request created',
        userId: user.uid,
        userName: user.displayName,
        timestamp: new Date().toISOString()
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await changeRequestsApi.createChangeRequest(request);
    
    // Add notification for receiver
    const notification: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      userId: newRequest.receiverId,
      titleAr: 'طلب تغيير جديد',
      titleEn: 'New Change Request',
      messageAr: `تم إرسال طلب تغيير جديد إليك: ${newRequest.title}`,
      messageEn: `A new change request has been sent to you: ${newRequest.title}`,
      type: 'general',
      isRead: false,
      createdAt: new Date().toISOString(),
      link: '/tasks'
    };
    await notificationsApi.createNotification(notification);

    // Audit Log
    const audit: AuditLog = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user.uid,
      userName: user.displayName,
      action: 'create',
      entityType: 'change_request',
      entityId: request.id,
      timestamp: new Date().toISOString()
    };
    await auditLogsApi.createAuditLog(audit);

      setIsNewRequestDialogOpen(false);
      setNewRequest({ title: '', description: '', type: 'tool_change', receiverId: '', attachments: [] });
      await refreshRequests();
      toast.success(t('request_sent_success'));
  };

  const handleRequestAction = async (action: 'approve' | 'reject' | 'request_clarification' | 'respond_clarification') => {
    if (!user || !selectedRequest || !requestActionNote) {
      toast.error(isRtl ? 'الملاحظة مطلوبة' : 'Note is required');
      return;
    }

    const updatedRequest: ChangeRequest = { ...selectedRequest };
    const historyItem: any = {
      action,
      note: requestActionNote,
      userId: user.uid,
      userName: user.displayName,
      timestamp: new Date().toISOString(),
      attachments: requestActionAttachments
    };

    updatedRequest.history.push(historyItem);
    updatedRequest.updatedAt = new Date().toISOString();

    if (action === 'approve') updatedRequest.status = 'approved';
    if (action === 'reject') updatedRequest.status = 'rejected';
    if (action === 'request_clarification') updatedRequest.status = 'clarification_needed';
    if (action === 'respond_clarification') updatedRequest.status = 'pending';

    await changeRequestsApi.updateChangeRequest(updatedRequest.id, updatedRequest);

    // Notify the other party
    const targetUserId = user.uid === updatedRequest.senderId ? updatedRequest.receiverId : updatedRequest.senderId;
    const notification: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      userId: targetUserId,
      titleAr: 'تحديث على طلب التغيير',
      titleEn: 'Change Request Update',
      messageAr: `تم اتخاذ إجراء (${t(action)}) على طلبك: ${updatedRequest.title}`,
      messageEn: `An action (${t(action)}) has been taken on your request: ${updatedRequest.title}`,
      type: 'general',
      isRead: false,
      createdAt: new Date().toISOString(),
      link: '/tasks'
    };
    await notificationsApi.createNotification(notification);

      setIsManageRequestDialogOpen(false);
      setSelectedRequest(null);
      setRequestActionNote('');
      setRequestActionAttachments([]);
    await refreshRequests();
      toast.success(t('request_action_success'));
  };

  // Evidence Management Dialog State
  const [isEvidenceDialogOpen, setIsEvidenceDialogOpen] = useState(false);
  const [selectedProcedureForEvidence, setSelectedProcedureForEvidence] = useState<Procedure | null>(null);
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [isAddEvidenceDialogOpen, setIsAddEvidenceDialogOpen] = useState(false);
  const [sourceType, setSourceType] = useState<'link' | 'file'>('link');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [newEvidence, setNewEvidence] = useState<Partial<Evidence>>({
    name: '',
    description: '',
    url: '',
    type: 'PDF'
  });
  const [isDeleteEvidenceConfirmOpen, setIsDeleteEvidenceConfirmOpen] = useState(false);
  const [evidenceIdToDelete, setEvidenceIdToDelete] = useState<string | null>(null);

  const openEvidenceDialog = async (proc: Procedure) => {
    setSelectedProcedureForEvidence(proc);
    try {
      setEvidenceList(await evidenceApi.getEvidence(proc.id));
    } catch (error) {
      console.error('Failed to load evidence', error);
      toast.error(isRtl ? 'تعذر تحميل الشواهد' : 'Could not load evidence');
      setEvidenceList([]);
    }
    setIsEvidenceDialogOpen(true);
  };

  const [isUploadingEvidenceTask, setIsUploadingEvidenceTask] = useState(false);
  const handleAddEvidence = async () => {
    if (!selectedProcedureForEvidence) return;
    if (!newEvidence.name) {
      toast.error(isRtl ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields');
      return;
    }

    if (sourceType === 'link' && !newEvidence.url) {
      toast.error(isRtl ? 'رابط الملف مطلوب' : 'URL is required');
      return;
    }

    if (sourceType === 'file' && selectedFiles.length === 0) {
      toast.error(isRtl ? 'الملف مطلوب' : 'File is required');
      return;
    }

    if (sourceType === 'file') {
      setIsUploadingEvidenceTask(true);
      let uploadedCount = 0;
      let failedCount = 0;
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        let uploaded;
        try {
          uploaded = await filesApi.uploadFile(file);
        } catch (error) {
          console.error('Failed to upload evidence file', error);
          failedCount++;
          continue;
        }
        const baseName = (newEvidence.name || '').trim();
        const evidenceName = selectedFiles.length > 1
          ? (baseName ? `${baseName} — ${file.name}` : file.name)
          : (baseName || file.name);
        const evidence: Evidence = {
          id: Math.random().toString(36).substr(2, 9) + i,
          procedureId: selectedProcedureForEvidence.id,
          name: evidenceName,
          description: newEvidence.description || '',
          url: uploaded.url,
          type: (file.type.split('/')[1] || 'FILE').toUpperCase(),
          uploadedBy: user?.uid || '',
          uploadedAt: new Date().toISOString(),
        };
        try {
          await evidenceApi.createEvidence(evidence);
          uploadedCount++;
        } catch (error) {
          console.error('Failed to save evidence', error);
          failedCount++;
        }
      }
      setIsUploadingEvidenceTask(false);
      setEvidenceList(await evidenceApi.getEvidence(selectedProcedureForEvidence.id));
      setIsAddEvidenceDialogOpen(false);
      setNewEvidence({ name: '', description: '', url: '', type: 'PDF' });
      setSelectedFile(null);
      setSelectedFiles([]);
      setSourceType('link');
      if (failedCount > 0) {
        toast.error(isRtl
          ? `تم رفع ${uploadedCount} ملف وفشل ${failedCount}`
          : `Uploaded ${uploadedCount}, failed ${failedCount}`);
      } else {
        toast.success(isRtl
          ? (uploadedCount > 1 ? `تم إضافة ${uploadedCount} شاهد بنجاح` : 'تم إضافة الشاهد بنجاح')
          : (uploadedCount > 1 ? `Added ${uploadedCount} evidences` : 'Evidence added successfully'));
      }
      return;
    }

    // Link mode (single)
    const evidence: Evidence = {
      id: Math.random().toString(36).substr(2, 9),
      procedureId: selectedProcedureForEvidence.id,
      name: newEvidence.name || '',
      description: newEvidence.description || '',
      url: newEvidence.url || '',
      type: 'LINK',
      uploadedBy: user?.uid || '',
      uploadedAt: new Date().toISOString(),
    };
    try {
      await evidenceApi.createEvidence(evidence);
      setEvidenceList(await evidenceApi.getEvidence(selectedProcedureForEvidence.id));
    } catch (error) {
      console.error('Failed to save evidence', error);
      toast.error(isRtl ? 'تعذر إضافة الشاهد' : 'Could not add evidence');
      return;
    }
    setIsAddEvidenceDialogOpen(false);
    setNewEvidence({ name: '', description: '', url: '', type: 'PDF' });
    setSelectedFile(null);
    setSelectedFiles([]);
    setSourceType('link');
    toast.success(isRtl ? 'تم إضافة الشاهد بنجاح' : 'Evidence added successfully');
  };

  const handleDeleteEvidence = (evidenceId: string) => {
    setEvidenceIdToDelete(evidenceId);
    setIsDeleteEvidenceConfirmOpen(true);
  };

  const confirmDeleteEvidence = async () => {
    if (evidenceIdToDelete && selectedProcedureForEvidence) {
      // Defense in depth: even if the delete button somehow leaked through, only
      // the uploader or someone with the full-delete permission can actually delete.
      const target = evidenceList.find(e => e.id === evidenceIdToDelete);
      const isOwner = !!user && target?.uploadedBy === user.uid;
      if (!isOwner && !can('procedures.evidence.delete')) {
        toast.error(isRtl ? 'لا يمكنك حذف هذا الشاهد — تحتاج صلاحية كاملة أو أن تكون رافعه' : 'You cannot delete this evidence — needs full delete permission or ownership');
        setIsDeleteEvidenceConfirmOpen(false);
        setEvidenceIdToDelete(null);
        return;
      }
      try {
        await evidenceApi.deleteEvidence(evidenceIdToDelete);
        setEvidenceList(await evidenceApi.getEvidence(selectedProcedureForEvidence.id));
      } catch (error) {
        console.error('Failed to delete evidence', error);
        toast.error(isRtl ? 'تعذر حذف الشاهد' : 'Could not delete evidence');
        return;
      }
      setIsDeleteEvidenceConfirmOpen(false);
      setEvidenceIdToDelete(null);
      toast.success(isRtl ? 'تم حذف الشاهد بنجاح' : 'Evidence deleted successfully');
    }
  };

  const handleEvidenceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    setSelectedFiles(prev => [...prev, ...arr]);
    setSelectedFile(arr[0]); // keep for any legacy reference
    if (!newEvidence.name && arr.length === 1) {
      setNewEvidence(prev => ({ ...prev, name: arr[0].name }));
    }
    e.target.value = ''; // allow re-selecting the same file
  };

  const openIncidentDetails = async (inc: SecurityIncident) => {
    setSelectedIncForDetails(inc);
    try {
      const notes = await incidentNotesApi.getIncidentNotes();
      setIncidentNotes(notes.filter(note => note.incidentId === inc.id));
    } catch (error) {
      console.error('Failed to load incident notes', error);
      toast.error(isRtl ? 'طھط¹ط°ط± طھط­ظ…ظٹظ„ ط§ظ„ظ…ظ„ط§ط­ط¸ط§طھ' : 'Could not load notes');
      setIncidentNotes([]);
    }
    setIsViewDetailsOpen(true);
  };

  const handleViewAttachment = (value: string) => {
    const url = resolveFileUrl(value);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    setPreviewFile(value);
    setIsPreviewOpen(true);
  };

  const attachmentLabel = (value: string) => {
    if (!value) return '';
    if (value.startsWith('/api/files/') || value.startsWith('/uploads/') || /^https?:\/\//i.test(value)) {
      const parts = value.split('/');
      return parts[parts.length - 1].replace(/^\d+-[a-f0-9]+-/, '');
    }
    return value;
  };

  const isRtl = i18n.language === 'ar';

  const [allUserProcedures, setAllUserProcedures] = useState<Procedure[]>([]);
  const [allUserCommitments, setAllUserCommitments] = useState<Commitment[]>([]);
  const [allUserIncidents, setAllUserIncidents] = useState<SecurityIncident[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [allProcedures, setAllProcedures] = useState<Procedure[]>([]);
  const [policyItems, setPolicyItems] = useState<PolicyItem[]>([]);
  const [standards, setStandards] = useState<any[]>([]);

  useEffect(() => {
    const loadSupportingData = async () => {
      try {
        const [policiesData, frameworksData, policyItemsData, standardsData] = await Promise.all([
          policiesApi.getPolicies(),
          frameworksApi.getFrameworks(),
          policyItemsApi.getPolicyItems(),
          standardsApi.getStandards(),
        ]);
        setPolicies(policiesData);
        setFrameworks(frameworksData);
        setPolicyItems(policyItemsData);
        setStandards(standardsData);
      } catch (error) {
        console.error('Failed to load task supporting data', error);
        toast.error(t('failed_to_load_data') || 'Failed to load data');
      }
    };

    void loadSupportingData();
  }, []);

  const refreshData = async () => {
    if (user) {
      try {
      const [proceduresData, commitmentsData, incidentsData, lookupOptionsData] = await Promise.all([
        proceduresApi.getProcedures(),
        commitmentsApi.getCommitments(),
        incidentsApi.getIncidents(),
        lookupOptionsApi.getLookupOptions(),
      ]);
      const userProcs = proceduresData.filter(p => p.assignedTo.includes(user.uid));
      const userComms = commitmentsData.filter(c => c.responsibleUser === user.uid);
      const userIncs = incidentsData.filter(i => i.assignedTo === user.uid);
      setAllProcedures(proceduresData);
      setLookupOptions(lookupOptionsData);

      setAllUserProcedures(userProcs);
      setAllUserCommitments(userComms);
      setAllUserIncidents(userIncs);
      
      // Filter Procedures
      let filteredProcedures = [...userProcs];
      if (procSearch) {
        const lowerSearch = procSearch.toLowerCase();
        filteredProcedures = filteredProcedures.filter(p => 
          (isRtl ? p.nameAr : p.nameEn).toLowerCase().includes(lowerSearch) ||
          (isRtl ? p.descriptionAr : p.descriptionEn).toLowerCase().includes(lowerSearch)
        );
      }
      if (procStatus !== 'all') {
        filteredProcedures = filteredProcedures.filter(p => p.status === procStatus);
      }
      if (procImportance !== 'all') {
        filteredProcedures = filteredProcedures.filter(p => p.importance === procImportance);
      }
      if (procPolicy !== 'all') {
        filteredProcedures = filteredProcedures.filter(p => p.policyId === procPolicy);
      }
      if (procFramework !== 'all') {
        filteredProcedures = filteredProcedures.filter(p => {
          const policy = policies.find(pol => pol.id === p.policyId);
          return policy?.frameworkId === procFramework;
        });
      }
      if (procDate) {
        filteredProcedures = filteredProcedures.filter(p => p.endDate === procDate);
      }
      setMyProcedures(filteredProcedures);

      // Filter Commitments
      let filteredCommitments = [...userComms];
      if (commSearch) {
        const lowerSearch = commSearch.toLowerCase();
        filteredCommitments = filteredCommitments.filter(c => 
          (isRtl ? c.nameAr : c.nameEn).toLowerCase().includes(lowerSearch) ||
          (c.descriptionAr || '').toLowerCase().includes(lowerSearch) ||
          (c.descriptionEn || '').toLowerCase().includes(lowerSearch)
        );
      }
      if (commStatus !== 'all') {
        filteredCommitments = filteredCommitments.filter(c => c.status === commStatus);
      }
      if (commDate) {
        filteredCommitments = filteredCommitments.filter(c => c.expiryDate === commDate);
      }
      setMyCommitments(filteredCommitments);

      // Filter Incidents
      let filteredIncidents = [...userIncs];
      if (incSearch) {
        const lowerSearch = incSearch.toLowerCase();
        filteredIncidents = filteredIncidents.filter(i => 
          (i.id + i.title + i.description).toLowerCase().includes(lowerSearch)
        );
      }
      if (incStatus !== 'all') {
        filteredIncidents = filteredIncidents.filter(i => i.status === incStatus);
      }
      setMyIncidents(filteredIncidents);
      } catch (error) {
        console.error('Failed to load task data', error);
        toast.error(t('failed_to_load_data') || 'Failed to load data');
      }
    }
  };

  useEffect(() => {
    refreshData();
    refreshRequests();
  }, [user, procSearch, procStatus, procImportance, procPolicy, procFramework, procDate, commSearch, commStatus, commDate, incSearch, incStatus, isRtl, policies]);

  const handleStatusChange = async (procId: string, newStatus: string) => {
    try {
      const latestProcedures = await proceduresApi.getProcedures();
      const procedure = latestProcedures.find(p => p.id === procId);
      if (!procedure) return;

      const updated: Procedure = { ...procedure, status: newStatus as any, updatedAt: new Date().toISOString() };
      await proceduresApi.updateProcedure(updated.id, updated);
      await refreshData();
      toast.success(t('status_updated_successfully') || 'Status updated successfully');
    } catch (error) {
      console.error('Failed to update procedure status', error);
      toast.error(isRtl ? 'تعذر تحديث حالة الإجراء' : 'Could not update procedure status');
    }
  };

  const handleCommitmentStatusChange = async (commId: string, newStatus: string) => {
    try {
      const latestCommitments = await commitmentsApi.getCommitments();
      const commitment = latestCommitments.find(c => c.id === commId);
    if (commitment) {
      if (newStatus === 'completed') {
        setSelectedCommForComplete(commitment);
        setCommEvidenceTitle('');
        setCommEvidenceLink('');
        setIsCommCompleteDialogOpen(true);
      } else {
        const updated: Commitment = { ...commitment, status: newStatus as any, updatedAt: new Date().toISOString() };
        await commitmentsApi.updateCommitment(updated.id, updated);
        await refreshData();
        toast.success(t('status_updated_successfully') || 'Status updated successfully');
      }
    }
    } catch (error) {
      console.error('Failed to update commitment status', error);
      toast.error(isRtl ? 'تعذر تحديث حالة الالتزام' : 'Could not update commitment status');
    }
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
      setIsCommCompleteDialogOpen(false);
      setSelectedCommForComplete(null);
      setCommEvidenceTitle('');
      setCommEvidenceLink('');
      await refreshData();
      toast.success(t('commitment_completed_success') || 'Commitment completed successfully');
    } catch (error) {
      console.error('Failed to complete commitment', error);
      toast.error(isRtl ? 'تعذر إكمال الالتزام' : 'Could not complete commitment');
    }
  };

  // Feedback simulation state
  const [closingIncidentId, setClosingIncidentId] = useState<string | null>(null);
  const [isClosingDialogOpen, setIsClosingDialogOpen] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');

  const handleIncidentStatusChange = (incId: string, newStatus: string) => {
    const incident = myIncidents.find(i => i.id === incId);
    if (incident) {
      setSelectedIncForAction(incident);
      setNewStatusForAction(newStatus);
      setIsActionDialogOpen(true);
      setActionNote('');
      setActionAttachments([]);
    }
  };

  const confirmIncidentAction = async () => {
    if (!selectedIncForAction || !actionNote) {
      toast.error(isRtl ? 'الملاحظة إلزامية' : 'Note is mandatory');
      return;
    }

    if (newStatusForAction === 'resolved') {
      setIsActionDialogOpen(false);
      setClosingIncidentId(selectedIncForAction.id);
      setIsClosingDialogOpen(true);
      // We will save the note and attachments during the final resolution
    } else {
      const updated: SecurityIncident = { 
        ...selectedIncForAction, 
        status: newStatusForAction as any, 
        updatedAt: new Date().toISOString() 
      };
      
      // Save incident
      await incidentsApi.updateIncident(updated.id, updated);
      
      // Save note
      const note: any = {
        id: Math.random().toString(36).substr(2, 9),
        incidentId: selectedIncForAction.id,
        authorId: user?.uid || '1',
        authorName: user?.displayName || 'User',
        content: actionNote,
        createdAt: new Date().toISOString(),
        attachments: actionAttachments
      };
      await incidentNotesApi.createIncidentNote(note);

        setIsActionDialogOpen(false);
        setSelectedIncForAction(null);
      await refreshData();
        toast.success(t('status_updated_successfully') || 'Status updated successfully');
    }
  };

  const confirmCloseIncident = async () => {
    if (!closingIncidentId || !selectedIncForAction) return;
    
    const incident = (await incidentsApi.getIncidents()).find(i => i.id === closingIncidentId);
    if (incident) {
      const updated: SecurityIncident = { 
        ...incident, 
        status: 'resolved', 
        updatedAt: new Date().toISOString() 
      };
      await incidentsApi.updateIncident(updated.id, updated);
      
      // Save the action note and attachments
      const note: any = {
        id: Math.random().toString(36).substr(2, 9),
        incidentId: closingIncidentId,
        authorId: user?.uid || '1',
        authorName: user?.displayName || 'User',
        content: actionNote,
        createdAt: new Date().toISOString(),
        attachments: actionAttachments
      };
      await incidentNotesApi.createIncidentNote(note);

      // Auto-generate feedback (simulating the reporter's response)
      const feedback: IncidentFeedback = {
        id: Math.random().toString(36).substr(2, 9),
        incidentId: closingIncidentId,
        rating: feedbackRating,
        comment: feedbackComment || (isRtl ? 'شكراً لكم على سرعة الاستجابة تم حل المشكلة' : 'Thank you for the quick response, the problem is resolved'),
        submittedAt: new Date().toISOString()
      };
      await incidentFeedbackApi.createIncidentFeedback(feedback);
      
      setIsClosingDialogOpen(false);
      setClosingIncidentId(null);
      setSelectedIncForAction(null);
      setFeedbackComment('');
      await refreshData();
      toast.success(isRtl ? 'تم وضع الحالة "تم الحل" وتسجيل التقييم المحاكى' : 'Status set to "Resolved" and simulated feedback recorded');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 gap-1"><CheckCircle2 className="w-3 h-3" /> {t('completed')}</Badge>;
      case 'in_progress':
        return <Badge variant="secondary" className="bg-amber-500 text-white hover:bg-amber-600 gap-1"><Clock className="w-3 h-3" /> {t('in_progress')}</Badge>;
      case 'not_started':
        return <Badge variant="outline" className="gap-1 text-slate-500"><AlertCircle className="w-3 h-3" /> {t('not_started')}</Badge>;
      case 'active':
        return <Badge className="bg-blue-500 hover:bg-blue-600 gap-1">{t('active')}</Badge>;
      case 'expired':
        return <Badge variant="destructive" className="gap-1">{t('expired')}</Badge>;
      case 'expiring_soon':
        return <Badge variant="secondary" className="bg-orange-500 text-white hover:bg-orange-600 gap-1">{t('expiring_soon')}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getCommitmentRowColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-50/30';
      case 'active':
      case 'in_progress':
        return 'bg-blue-50/30';
      case 'expired':
        return 'bg-rose-50/40';
      case 'expiring_soon':
        return 'bg-orange-50/40';
      default:
        return 'bg-transparent';
    }
  };

  const [expandedFrameworks, setExpandedFrameworks] = useState<string[]>([]);
  const [expandedPolicies, setExpandedPolicies] = useState<string[]>([]);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const groupedProcedures = React.useMemo(() => {
    const items = policyItems;
    
    // Grouping structure: frameworks -> policies -> items -> procedures
    const groups: Record<string, Record<string, Record<string, Procedure[]>>> = {};
    
    myProcedures.forEach(proc => {
      const policy = policies.find(p => p.id === proc.policyId);
      const frameworkId = policy?.frameworkId || 'others';
      const policyId = proc.policyId;
      const standard = standards.find(s => s.id === proc.standardId);
      const itemId = standard?.policyItemId || 'others';
      
      if (!groups[frameworkId]) groups[frameworkId] = {};
      if (!groups[frameworkId][policyId]) groups[frameworkId][policyId] = {};
      if (!groups[frameworkId][policyId][itemId]) groups[frameworkId][policyId][itemId] = [];
      groups[frameworkId][policyId][itemId].push(proc);
    });
    
    return { groups, frameworks, policies, items, standards };
  }, [frameworks, policies, policyItems, standards, myProcedures]);

  const toggleFramework = (id: string) => {
    setExpandedFrameworks(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const togglePolicy = (id: string) => {
    setExpandedPolicies(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleItem = (id: string) => {
    setExpandedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const performanceStats = React.useMemo(() => {
    const totalProc = allUserProcedures.length;
    const completedProc = allUserProcedures.filter(p => p.status === 'completed').length;
    // Weighted completion: only leaf procedures count, each contributes its weight.
    const leaves = allUserProcedures.filter(p => !allProcedures.some(c => c.parentId === p.id));
    let cw = 0, tw = 0;
    leaves.forEach(p => {
      const w = Math.max(1, Math.min(10, Math.round(Number(p.weight) || 1)));
      tw += w;
      if (p.status === 'completed') cw += w;
    });
    const completionRate = tw > 0 ? Math.round((cw / tw) * 100) : 0;
    
    const pendingProc = allUserProcedures.filter(p => p.status !== 'completed').length;
    const activeComm = allUserCommitments.filter(c => c.status === 'active').length;
    const activeInc = allUserIncidents.filter(i => i.status !== 'closed').length;
    
    const today = new Date().toISOString().split('T')[0];
    const overdue = allUserProcedures.filter(p => p.status !== 'completed' && p.endDate < today).length;

    const pendingRequests = myReceivedRequests.filter(r => r.status === 'pending' || r.status === 'clarification_needed').length;

    return { completionRate, pendingProc, activeComm, overdue, activeInc, pendingRequests, total: totalProc + allUserCommitments.length + allUserIncidents.length };
  }, [allProcedures, allUserProcedures, allUserCommitments, allUserIncidents, myReceivedRequests]);

  const ImportanceBadge = ({ importance }: { importance: string }) => {
    const colors: Record<string, string> = {
      high: 'bg-rose-100 text-rose-700 border-rose-200',
      medium: 'bg-amber-100 text-amber-700 border-amber-200',
      low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors[importance] || ''}`}>
        {t(importance)}
      </span>
    );
  };

  const getFrameworkColor = (index: number) => {
    const colors = [
      'border-slate-800 bg-slate-800 text-white',
      'border-blue-800 bg-blue-800 text-white',
      'border-purple-800 bg-purple-800 text-white',
      'border-indigo-800 bg-indigo-800 text-white',
    ];
    return colors[index % colors.length];
  };

  const getPolicyColor = (index: number) => {
    const colors = [
      'border-blue-500 bg-blue-50/50 text-blue-700',
      'border-purple-500 bg-purple-50/50 text-purple-700',
      'border-emerald-500 bg-emerald-50/50 text-emerald-700',
      'border-indigo-500 bg-indigo-50/50 text-indigo-700',
      'border-rose-500 bg-rose-50/50 text-rose-700',
    ];
    return colors[index % colors.length];
  };

  const getItemColor = (index: number) => {
    const colors = [
      'bg-blue-100/50 text-blue-800 border-blue-200',
      'bg-purple-100/50 text-purple-800 border-purple-200',
      'bg-emerald-100/50 text-emerald-800 border-emerald-200',
      'bg-indigo-100/50 text-indigo-800 border-indigo-200',
      'bg-rose-100/50 text-rose-800 border-rose-200',
    ];
    return colors[index % colors.length];
  };

  const getItemCode = (item: PolicyItem, allItems: PolicyItem[]): string => {
    if (!item.parentId) return (item.order || 0).toString();
    const parent = allItems.find(i => i.id === item.parentId);
    if (!parent) return (item.order || 0).toString();
    return `${getItemCode(parent, allItems)}-${item.order || 0}`;
  };

  const getProcedureStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-50/60 border-emerald-100';
      case 'in_progress':
        return 'bg-amber-50/60 border-amber-100';
      case 'not_started':
        return 'bg-slate-50/60 border-slate-100';
      default:
        return 'bg-white border-slate-100';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1e293b] flex items-center gap-2">
            <ClipboardList className="w-8 h-8 text-blue-600" />
            {t('my_tasks')}
          </h1>
          <p className="text-[#64748b] mt-1">
            {isRtl ? 'قائمة بجميع الإجراءات والالتزامات المسندة إليك' : 'List of all procedures and commitments assigned to you'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {isRtl ? 'نسبة الإنجاز' : 'Completion Rate'}
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold text-slate-800">{performanceStats.completionRate}%</h3>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                +{Math.round(performanceStats.completionRate / 10)}%
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {isRtl ? 'الإجراءات المعلقة' : 'Pending Procedures'}
            </p>
            <h3 className="text-2xl font-bold text-slate-800">{performanceStats.pendingProc}</h3>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {isRtl ? 'الالتزامات النشطة' : 'Active Commitments'}
            </p>
            <h3 className="text-2xl font-bold text-slate-800">{performanceStats.activeComm}</h3>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4"
        >
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            performanceStats.overdue > 0 ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-400"
          )}>
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {isRtl ? 'مهام متأخرة' : 'Overdue Tasks'}
            </p>
            <h3 className={cn("text-2xl font-bold", performanceStats.overdue > 0 ? "text-rose-600" : "text-slate-800")}>
              {performanceStats.overdue}
            </h3>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4"
        >
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            performanceStats.pendingRequests > 0 ? "bg-indigo-50 text-indigo-600" : "bg-slate-50 text-slate-400"
          )}>
            <Send className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {isRtl ? 'طلبات معلقة' : 'Pending Requests'}
            </p>
            <h3 className={cn("text-2xl font-bold", performanceStats.pendingRequests > 0 ? "text-indigo-600" : "text-slate-800")}>
              {performanceStats.pendingRequests}
            </h3>
          </div>
        </motion.div>
      </div>

      <Tabs defaultValue="procedures" className="w-full">
        <TabsList className="flex flex-wrap md:flex-nowrap items-center gap-2 bg-slate-100/80 p-1.5 rounded-2xl h-auto w-full md:w-fit self-end shadow-inner border border-slate-200/50 mb-8">
          <TabsTrigger 
            value="procedures" 
            className="group flex-1 md:flex-none md:min-w-[140px] data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-lg rounded-xl transition-all duration-300 h-12 font-black border border-transparent data-[state=active]:border-blue-100"
          >
            <div className="flex items-center justify-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center group-data-[state=active]:bg-blue-600 transition-colors">
                <FileCheck className="w-4 h-4 text-blue-600 group-data-[state=active]:text-white" />
              </div>
              <span className="text-[13px] tracking-tight">{t('procedures')}</span>
              <Badge 
                variant="secondary" 
                className="ml-auto bg-blue-100/50 text-blue-700 group-data-[state=active]:bg-blue-600 group-data-[state=active]:text-white border-none transition-colors text-[10px] h-5 px-1.5 font-black shrink-0"
              >
                {myProcedures.length}
              </Badge>
            </div>
          </TabsTrigger>

          <TabsTrigger 
            value="commitments" 
            className="group flex-1 md:flex-none md:min-w-[140px] data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-lg rounded-xl transition-all duration-300 h-12 font-black border border-transparent data-[state=active]:border-emerald-100"
          >
            <div className="flex items-center justify-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center group-data-[state=active]:bg-emerald-600 transition-colors">
                <ShieldCheck className="w-4 h-4 text-emerald-600 group-data-[state=active]:text-white" />
              </div>
              <span className="text-[13px] tracking-tight">{t('commitments')}</span>
              <Badge 
                variant="secondary" 
                className="ml-auto bg-emerald-100/50 text-emerald-700 group-data-[state=active]:bg-emerald-600 group-data-[state=active]:text-white border-none transition-colors text-[10px] h-5 px-1.5 font-black shrink-0"
              >
                {myCommitments.length}
              </Badge>
            </div>
          </TabsTrigger>

          <TabsTrigger 
            value="incidents" 
            className="group flex-1 md:flex-none md:min-w-[140px] data-[state=active]:bg-white data-[state=active]:text-rose-700 data-[state=active]:shadow-lg rounded-xl transition-all duration-300 h-12 font-black border border-transparent data-[state=active]:border-rose-100"
          >
            <div className="flex items-center justify-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center group-data-[state=active]:bg-rose-600 transition-colors">
                <AlertCircle className="w-4 h-4 text-rose-600 group-data-[state=active]:text-white" />
              </div>
              <span className="text-[13px] tracking-tight">{isRtl ? 'البلاغات' : 'Incidents'}</span>
              <Badge 
                variant="secondary" 
                className="ml-auto bg-rose-100/50 text-rose-700 group-data-[state=active]:bg-rose-600 group-data-[state=active]:text-white border-none transition-colors text-[10px] h-5 px-1.5 font-black shrink-0"
              >
                {myIncidents.length}
              </Badge>
            </div>
          </TabsTrigger>

          <TabsTrigger 
            value="requests" 
            className="group flex-1 md:flex-none md:min-w-[140px] data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-lg rounded-xl transition-all duration-300 h-12 font-black border border-transparent data-[state=active]:border-indigo-100"
          >
            <div className="flex items-center justify-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center group-data-[state=active]:bg-indigo-600 transition-colors">
                <Send className="w-4 h-4 text-indigo-600 group-data-[state=active]:text-white" />
              </div>
              <span className="text-[13px] tracking-tight">{t('requests')}</span>
              <Badge 
                variant="secondary" 
                className="ml-auto bg-indigo-100/50 text-indigo-700 group-data-[state=active]:bg-indigo-600 group-data-[state=active]:text-white border-none transition-colors text-[10px] h-5 px-1.5 font-black shrink-0"
              >
                {mySentRequests.length + myReceivedRequests.length}
              </Badge>
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="procedures" className="mt-6 space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-4 space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
                  {isRtl ? 'البحث عن إجراء' : 'Search Procedure'}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 rtl:left-auto rtl:right-3" />
                  <Input
                    placeholder={t('search')}
                    className="pl-9 rtl:pl-3 rtl:pr-9 h-10"
                    value={procSearch}
                    onChange={(e) => setProcSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="md:col-span-8 flex flex-wrap md:flex-nowrap gap-4">
                <div className="flex-1 min-w-[140px] space-y-1.5">
                  <label className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider px-1 flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    {isRtl ? 'إطار العمل' : 'Framework'}
                  </label>
                  <Select value={procFramework} onValueChange={setProcFramework}>
                    <SelectTrigger className="w-full h-10 border-2 border-indigo-200 bg-indigo-50/50 text-indigo-900 font-bold ring-offset-indigo-100 focus:ring-indigo-300 shadow-sm shadow-indigo-100">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <SelectValue placeholder={t('framework')}>
                          {procFramework === 'all'
                            ? t('all_frameworks')
                            : (frameworks.find(f => f.id === procFramework)?.[isRtl ? 'nameAr' : 'nameEn'] || t('framework'))}
                        </SelectValue>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('all_frameworks')}</SelectItem>
                      {frameworks.map(f => (
                        <SelectItem key={f.id} value={f.id}>{isRtl ? f.nameAr : f.nameEn}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 min-w-[120px] space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
                    {t('status')}
                  </label>
                  <Select value={procStatus} onValueChange={setProcStatus}>
                    <SelectTrigger className="w-full h-10">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                        <SelectValue placeholder={t('status')} />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('all_statuses')}</SelectItem>
                      <SelectItem value="not_started">{t('not_started')}</SelectItem>
                      <SelectItem value="in_progress">{t('in_progress')}</SelectItem>
                      <SelectItem value="completed">{t('completed')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 min-w-[120px] space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
                    {t('importance')}
                  </label>
                  <Select value={procImportance} onValueChange={setProcImportance}>
                    <SelectTrigger className="w-full h-10">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Shield className="w-4 h-4 text-slate-400 shrink-0" />
                        <SelectValue placeholder={t('importance')} />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('all_importance')}</SelectItem>
                      <SelectItem value="high">{t('high')}</SelectItem>
                      <SelectItem value="medium">{t('medium')}</SelectItem>
                      <SelectItem value="low">{t('low')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 min-w-[140px] space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
                    {isRtl ? 'السياسة' : 'Policy'}
                  </label>
                  <Select value={procPolicy} onValueChange={setProcPolicy}>
                    <SelectTrigger className="w-full h-10">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        <SelectValue placeholder={t('policy')}>
                          {procPolicy === 'all'
                            ? (t('all_policies') || (isRtl ? 'كل السياسات' : 'All Policies'))
                            : (policies.find(p => p.id === procPolicy)?.[isRtl ? 'nameAr' : 'nameEn'] || t('policy'))}
                        </SelectValue>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('all_policies') || (isRtl ? 'كل السياسات' : 'All Policies')}</SelectItem>
                      {policies.map(p => (
                        <SelectItem key={p.id} value={p.id}>{isRtl ? p.nameAr : p.nameEn}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 min-w-[140px] space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
                    {isRtl ? 'تاريخ الانتهاء' : 'Expiry Date'}
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 rtl:left-auto rtl:right-3 pointer-events-none" />
                    <Input
                      type="date"
                      className="pl-9 rtl:pl-3 rtl:pr-9 h-10 text-xs"
                      value={procDate}
                      onChange={(e) => setProcDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {(procSearch || procStatus !== 'all' || procImportance !== 'all' || procPolicy !== 'all' || procDate) && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  {isRtl ? `تم العثور على ${myProcedures.length} نتيجة` : `Found ${myProcedures.length} results`}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  onClick={() => {
                    setProcSearch('');
                    setProcStatus('all');
                    setProcImportance('all');
                    setProcPolicy('all');
                    setProcFramework('all');
                    setProcDate('');
                  }}
                >
                  {isRtl ? 'إعادة تعيين الفلاتر' : 'Reset Filters'}
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mb-4 bg-slate-50 p-1.5 rounded-lg w-fit border border-slate-200">
            <Button
              variant={procViewMode === 'detailed' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setProcViewMode('detailed')}
              className={cn(
                "h-8 px-4 rounded-md text-xs font-bold transition-all",
                procViewMode === 'detailed' ? "bg-blue-600 shadow-sm" : "text-slate-500"
              )}
            >
              <Layers className="w-3.5 h-3.5 mr-2 rtl:ml-2 rtl:mr-0" />
              {isRtl ? 'عرض مفصل' : 'Detailed View'}
            </Button>
            <Button
              variant={procViewMode === 'summary' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setProcViewMode('summary')}
              className={cn(
                "h-8 px-4 rounded-md text-xs font-bold transition-all",
                procViewMode === 'summary' ? "bg-blue-600 shadow-sm" : "text-slate-500"
              )}
            >
              <ClipboardList className="w-3.5 h-3.5 mr-2 rtl:ml-2 rtl:mr-0" />
              {isRtl ? 'عرض مختصر' : 'Summary View'}
            </Button>
          </div>

          {procViewMode === 'detailed' ? (
            myProcedures.length === 0 ? (
            <Card className="p-12 text-center text-[#64748b] bg-white border-dashed">
              <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-20" />
              {isRtl ? 'لا توجد إجراءات مسندة إليك' : 'No procedures assigned to you'}
            </Card>
          ) : (
            Object.entries(groupedProcedures.groups).map(([frameworkId, policyGroups], fIdx) => {
              const framework = groupedProcedures.frameworks.find(f => f.id === frameworkId);
              const isFrameworkExpanded = expandedFrameworks.includes(frameworkId);
              const frameworkColor = getFrameworkColor(fIdx);
              const totalFrameworkProcs = Object.values(policyGroups as Record<string, Record<string, Procedure[]>>).reduce((acc: number, pg) => 
                acc + Object.values(pg as Record<string, Procedure[]>).reduce((a: number, procs) => a + (procs as Procedure[]).length, 0), 0);

              return (
                <div key={frameworkId} className="border border-slate-200 rounded-2xl overflow-hidden mb-4 shadow-sm">
                  <button
                    onClick={() => toggleFramework(frameworkId)}
                    className={cn(
                      "w-full flex items-center justify-between p-5 font-bold text-xl transition-all",
                      frameworkColor
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Layout className="w-6 h-6" />
                      <span>
                        <span className="opacity-70 font-normal mr-2">
                          {isRtl ? '( إطار العمل )' : '(Framework)'}
                        </span>
                        {frameworkId === 'others' ? (isRtl ? 'أطر عمل أخرى' : 'Other Frameworks') : (isRtl ? framework?.nameAr : framework?.nameEn)}
                      </span>
                      <Badge variant="secondary" className="ml-2 bg-white/20 text-white border-none">{totalFrameworkProcs}</Badge>
                    </div>
                    <ChevronDown className={cn("w-6 h-6 transition-transform duration-300", isFrameworkExpanded && "rotate-180")} />
                  </button>

                  <AnimatePresence initial={false}>
                    {isFrameworkExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-slate-50/50 p-4 space-y-4"
                      >
                        {Object.entries(policyGroups).map(([policyId, itemGroups], pIdx) => {
                          const policy = groupedProcedures.policies.find(p => p.id === policyId);
                          const isPolicyExpanded = expandedPolicies.includes(policyId);
                          const colorClasses = getPolicyColor(pIdx);
                          
                          return (
                            <div key={policyId} className={cn("border rounded-xl overflow-hidden transition-all duration-300 shadow-sm", colorClasses.split(' ')[0])}>
                              <button
                                onClick={() => togglePolicy(policyId)}
                                className={cn(
                                  "w-full flex items-center justify-between p-4 font-bold text-lg transition-colors",
                                  colorClasses.split(' ').slice(1).join(' ')
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <Shield className="w-5 h-5" />
                                  <span>
                                    {isRtl ? policy?.nameAr : policy?.nameEn}
                                  </span>
                                  <Badge variant="secondary" className="ml-2 bg-white/50">{Object.values(itemGroups).flat().length}</Badge>
                                </div>
                                <ChevronDown className={cn("w-5 h-5 transition-transform duration-300", isPolicyExpanded && "rotate-180")} />
                              </button>

                              <AnimatePresence initial={false}>
                                {isPolicyExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="bg-white"
                                  >
                                    <div className="p-4 space-y-3">
                                      {Object.entries(itemGroups as Record<string, Procedure[]>).map(([itemId, procs], iIdx) => {
                                        const procedures = procs as Procedure[];
                                        const item = groupedProcedures.items.find(i => i.id === itemId);
                                        const isItemExpanded = expandedItems.includes(`${policyId}-${itemId}`);
                                        const itemColor = getItemColor(iIdx);

                                        return (
                                          <div key={itemId} className="border border-slate-100 rounded-lg overflow-hidden shadow-sm">
                                            <button
                                              onClick={() => toggleItem(`${policyId}-${itemId}`)}
                                              className={cn(
                                                "w-full flex items-center justify-between p-3 text-sm font-bold transition-colors",
                                                itemColor
                                              )}
                                            >
                                              <div className="flex items-center gap-2">
                                                <Layers className="w-4 h-4" />
                                                <span>
                                                  <span className="opacity-70 font-normal mr-2">
                                                    {itemId === 'others' 
                                                      ? (isRtl ? '( أخرى )' : '(Other)') 
                                                      : (isRtl 
                                                          ? `( البند ${item ? getItemCode(item, groupedProcedures.items) : ''} )` 
                                                          : `( Item ${item ? getItemCode(item, groupedProcedures.items) : ''} )`
                                                        )
                                                    }
                                                  </span>
                                                  {itemId === 'others' ? (isRtl ? 'أخرى' : 'Others') : (isRtl ? item?.nameAr : item?.nameEn)}
                                                </span>
                                                <Badge variant="outline" className="text-[10px] h-5 bg-white/20 border-transparent">{procedures.length}</Badge>
                                              </div>
                                              <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isItemExpanded && "rotate-180")} />
                                            </button>

                                            <AnimatePresence initial={false}>
                                              {isItemExpanded && (
                                                <motion.div
                                                  initial={{ height: 0, opacity: 0 }}
                                                  animate={{ height: "auto", opacity: 1 }}
                                                  exit={{ height: 0, opacity: 0 }}
                                                  className="bg-slate-50/30"
                                                >
                                                  <div className="divide-y divide-slate-100">
                                                    {procedures.map((proc) => {
                                                      const standard = groupedProcedures.standards.find(s => s.id === proc.standardId);
                                                      const statusColor = getProcedureStatusColor(proc.status);
                                                      
                                                      return (
                                                        <div key={proc.id} className={cn(
                                                          "p-4 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 border-b last:border-b-0",
                                                          statusColor
                                                        )}>
                                                          <div className="flex-1 min-w-0">
                                                            <div className="flex items-start gap-2">
                                                              <div className={cn(
                                                                "mt-1 w-2 h-2 rounded-full",
                                                                proc.status === 'completed' ? "bg-emerald-500" : 
                                                                proc.status === 'in_progress' ? "bg-amber-500" : "bg-slate-300"
                                                              )} />
                                                              <div>
                                                                <h4 className="font-bold text-slate-800 text-sm">
                                                                  <span className="opacity-60 font-normal mr-1.5">
                                                                    {isRtl ? '( الإجراء )' : '(Procedure)'}
                                                                  </span>
                                                                  {isRtl ? proc.nameAr : proc.nameEn}
                                                                </h4>
                                                                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-blue-600 font-medium">
                                                                  <Shield className="w-3 h-3" />
                                                                  <span className="opacity-70 font-normal mr-1">
                                                                    {isRtl ? '( المعيار )' : '(Standard)'}
                                                                  </span>
                                                                  <span>{isRtl ? standard?.nameAr : standard?.nameEn}</span>
                                                                </div>
                                                                {(isRtl ? proc.descriptionAr : proc.descriptionEn) && (
                                                                  <p className="text-[12px] text-slate-500 mt-2 line-clamp-2">
                                                                    {isRtl ? proc.descriptionAr : proc.descriptionEn}
                                                                  </p>
                                                                )}
                                                              </div>
                                                            </div>
                                                            <div className="flex items-center gap-4 mt-3">
                                                              <ImportanceBadge importance={proc.importance} />
                                                              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                                                <Calendar className="w-3 h-3" />
                                                                {proc.endDate}
                                                              </div>
                                                            </div>
                                                          </div>

                                                          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                                                            <Select
                                                              value={proc.status}
                                                              onValueChange={(val) => handleStatusChange(proc.id, val)}
                                                            >
                                                              <SelectTrigger className="w-[140px] h-9 text-xs bg-white border-slate-200">
                                                                <SelectValue>{t(proc.status)}</SelectValue>
                                                              </SelectTrigger>
                                                              <SelectContent>
                                                                <SelectItem value="not_started">{t('not_started')}</SelectItem>
                                                                <SelectItem value="in_progress">{t('in_progress')}</SelectItem>
                                                                <SelectItem value="completed">{t('completed')}</SelectItem>
                                                              </SelectContent>
                                                            </Select>

                                                            <Button 
                                                              variant="outline" 
                                                              size="sm"
                                                              onClick={() => openEvidenceDialog(proc)}
                                                              className="h-9 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 bg-white"
                                                            >
                                                              <Paperclip className="w-3 h-3 mr-1" />
                                                              {isRtl ? 'رفع الشواهد' : 'Evidence'}
                                                            </Button>
                                                          </div>
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                </motion.div>
                                              )}
                                            </AnimatePresence>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )) : (
            <div className="space-y-4">
              <Card className="border-none shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-[#f8fafc]">
                      <TableRow>
                        <SortableTableHead sortKey="name" sort={procSort.sort} onToggle={procSort.toggle}>{isRtl ? 'الإجراء' : 'Procedure'}</SortableTableHead>
                        <SortableTableHead sortKey="framework" sort={procSort.sort} onToggle={procSort.toggle}>{isRtl ? 'إطار العمل' : 'Framework'}</SortableTableHead>
                        <SortableTableHead sortKey="policy" sort={procSort.sort} onToggle={procSort.toggle}>{isRtl ? 'السياسة' : 'Policy'}</SortableTableHead>
                        <SortableTableHead sortKey="status" sort={procSort.sort} onToggle={procSort.toggle}>{t('status')}</SortableTableHead>
                        <SortableTableHead sortKey="endDate" sort={procSort.sort} onToggle={procSort.toggle}>{isRtl ? 'تاريخ الانتهاء' : 'End Date'}</SortableTableHead>
                        <TableHead className="font-bold text-center">{t('actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {procSort.sortedRows(myProcedures, (proc: any, key: string) => {
                        switch (key) {
                          case 'name': return isRtl ? proc.nameAr : proc.nameEn;
                          case 'framework': {
                            const pol = policies.find(p => p.id === proc.policyId);
                            const fw = frameworks.find(f => f.id === pol?.frameworkId);
                            return fw ? (isRtl ? fw.nameAr : fw.nameEn) : '';
                          }
                          case 'policy': return (policies.find(p => p.id === proc.policyId)?.[isRtl ? 'nameAr' : 'nameEn']) || '';
                          case 'status': {
                            const order: Record<string, number> = { not_started: 1, in_progress: 2, completed: 3 };
                            return order[proc.status] || 0;
                          }
                          case 'endDate': return proc.endDate || '';
                          default: return '';
                        }
                      }).map((proc: any) => {
                        const policy = policies.find(p => p.id === proc.policyId);
                        const framework = frameworks.find(f => f.id === policy?.frameworkId);
                        const statusColor = getProcedureStatusColor(proc.status);
                        
                        const frameworkIndex = frameworks.findIndex(f => f.id === framework?.id);
                        const frameworkColor = frameworkIndex !== -1 ? getFrameworkColor(frameworkIndex) : 'bg-slate-100 text-slate-600';

                        return (
                          <TableRow key={proc.id} className={cn("hover:bg-slate-50/50 transition-colors align-top", statusColor)}>
                            <TableCell className="font-medium text-[#1e293b] max-w-[420px]">
                              <div className="flex items-start gap-2">
                                <div className={cn(
                                  "w-2 h-2 rounded-full shrink-0 mt-2",
                                  proc.status === 'completed' ? "bg-emerald-500" :
                                  proc.status === 'in_progress' ? "bg-amber-500" : "bg-slate-300"
                                )} />
                                <Tooltip content={isRtl ? proc.nameAr : proc.nameEn}>
                                  <span className="block whitespace-normal break-words leading-relaxed cursor-help">
                                    {isRtl ? proc.nameAr : proc.nameEn}
                                  </span>
                                </Tooltip>
                              </div>
                            </TableCell>
                            <TableCell>
                              {framework && (
                                <Tooltip content={isRtl ? framework.nameAr : framework.nameEn}>
                                  <div className={cn(
                                    "px-1.5 py-0.5 rounded text-[10px] font-black uppercase whitespace-nowrap w-fit",
                                    frameworkColor
                                  )}>
                                    {isRtl ? framework.nameAr.substring(0, 3) : framework.nameEn.substring(0, 3)}
                                  </div>
                                </Tooltip>
                              )}
                            </TableCell>
                            <TableCell className="text-slate-500 text-xs">
                              {isRtl ? policy?.nameAr : policy?.nameEn}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(proc.status)}
                            </TableCell>
                            <TableCell className="text-slate-500 font-mono text-[11px]">
                              {proc.endDate}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-2">
                                <Select
                                  value={proc.status}
                                  onValueChange={(val) => handleStatusChange(proc.id, val)}
                                >
                                  <SelectTrigger className="w-[120px] h-8 text-xs bg-white">
                                    <SelectValue>{t(proc.status)}</SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="not_started">{t('not_started')}</SelectItem>
                                    <SelectItem value="in_progress">{t('in_progress')}</SelectItem>
                                    <SelectItem value="completed">{t('completed')}</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEvidenceDialog(proc)}
                                  className="h-8 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 bg-white"
                                >
                                  <Paperclip className="w-3.5 h-3.5 mr-1" />
                                  {isRtl ? 'رفع الشواهد' : 'Evidence'}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => { setCommentProcedure(proc); setNewCommentText(''); }}
                                  className="h-8 text-xs border-blue-200 text-blue-700 hover:bg-blue-50 bg-white relative"
                                >
                                  <MessageSquare className="w-3.5 h-3.5 mr-1" />
                                  {isRtl ? 'تعليق' : 'Comment'}
                                  {(proc.comments && proc.comments.length > 0) && (
                                    <span className="absolute -top-1.5 -right-1.5 rtl:right-auto rtl:-left-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">
                                      {proc.comments.length}
                                    </span>
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="commitments" className="mt-6 space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-6 space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
                  {isRtl ? 'البحث عن التزام' : 'Search Commitment'}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 rtl:left-auto rtl:right-3" />
                  <Input
                    placeholder={t('search')}
                    className="pl-9 rtl:pl-3 rtl:pr-9 h-10"
                    value={commSearch}
                    onChange={(e) => setCommSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="md:col-span-3 space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
                  {t('status')}
                </label>
                <Select value={commStatus} onValueChange={setCommStatus}>
                  <SelectTrigger className="w-full h-10">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                      <SelectValue placeholder={t('status')} />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('all_statuses')}</SelectItem>
                    <SelectItem value="active">{t('active')}</SelectItem>
                    <SelectItem value="completed">{t('completed')}</SelectItem>
                    <SelectItem value="expired">{t('expired')}</SelectItem>
                    <SelectItem value="expiring_soon">{t('expiring_soon')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-3 space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
                  {isRtl ? 'تاريخ الانتهاء' : 'Expiry Date'}
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 rtl:left-auto rtl:right-3 pointer-events-none" />
                  <Input
                    type="date"
                    className="pl-9 rtl:pl-3 rtl:pr-9 h-10 text-xs"
                    value={commDate}
                    onChange={(e) => setCommDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {(commSearch || commStatus !== 'all' || commDate) && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  {isRtl ? `تم العثور على ${myCommitments.length} نتيجة` : `Found ${myCommitments.length} results`}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  onClick={() => {
                    setCommSearch('');
                    setCommStatus('all');
                    setCommDate('');
                  }}
                >
                  {isRtl ? 'إعادة تعيين الفلاتر' : 'Reset Filters'}
                </Button>
              </div>
            )}
          </div>

          <Card className="border-none shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#f8fafc]">
                  <TableRow>
                    <SortableTableHead sortKey="name" sort={commSort.sort} onToggle={commSort.toggle}>{t('commitment_name')}</SortableTableHead>
                    <SortableTableHead sortKey="status" sort={commSort.sort} onToggle={commSort.toggle}>{t('status')}</SortableTableHead>
                    <SortableTableHead sortKey="expiry" sort={commSort.sort} onToggle={commSort.toggle}>{t('expiry_date')}</SortableTableHead>
                    <TableHead className="font-bold text-center">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myCommitments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-[#64748b]">
                        {isRtl ? 'لا توجد التزامات مسندة إليك' : 'No commitments assigned to you'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    commSort.sortedRows(myCommitments, (c: any, key: string) => {
                      switch (key) {
                        case 'name': return isRtl ? c.nameAr : c.nameEn;
                        case 'status': {
                          const order: Record<string, number> = { active: 1, expiring_soon: 2, expired: 3, completed: 4 };
                          return order[c.status] || 0;
                        }
                        case 'expiry': return c.expiryDate || '';
                        default: return '';
                      }
                    }).map((comm: any) => (
                      <TableRow key={comm.id} className={cn("hover:bg-slate-50/50 transition-colors border-l-4", getCommitmentRowColor(comm.status).replace('/30', '/50').replace('/40', '/60'), {
                        'border-l-emerald-500': comm.status === 'completed',
                        'border-l-blue-500': comm.status === 'active' || comm.status === 'in_progress',
                        'border-l-rose-500': comm.status === 'expired',
                        'border-l-orange-500': comm.status === 'expiring_soon',
                        'border-l-transparent': comm.status === 'not_started'
                      })}>
                        <TableCell className="font-medium text-[#1e293b] max-w-[200px]">
                          <Tooltip content={isRtl ? comm.nameAr : comm.nameEn}>
                            <span className="block truncate cursor-help">
                              {isRtl ? comm.nameAr : comm.nameEn}
                            </span>
                          </Tooltip>
                        </TableCell>
                        <TableCell>{getStatusBadge(comm.status)}</TableCell>
                        <TableCell className="text-[#64748b] text-[13px]">{comm.expiryDate}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            {comm.status !== 'completed' ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                onClick={() => handleCommitmentStatusChange(comm.id, 'completed')}
                                title={isRtl ? 'تحديد كمكتمل' : 'Mark as Completed'}
                              >
                                <CheckCircle2 className="w-5 h-5" />
                              </Button>
                            ) : (
                              comm.evidenceLink && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  onClick={() => {
                                    filesApi.openFile(comm.evidenceLink!).catch((error) => {
                                      console.error('Failed to open commitment evidence', error);
                                      toast.error(isRtl ? 'تعذر فتح إثبات الالتزام' : 'Could not open commitment evidence');
                                    });
                                  }}
                                  title={isRtl ? 'عرض الإثبات' : 'View Evidence'}
                                >
                                  <Paperclip className="w-5 h-5" />
                                </Button>
                              )
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="incidents" className="mt-6 space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-8 space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
                  {t('search_incidents')}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 rtl:left-auto rtl:right-3" />
                  <Input
                    placeholder={t('search_incident_placeholder')}
                    className="pl-9 rtl:pl-3 rtl:pr-9 h-10"
                    value={incSearch}
                    onChange={(e) => setIncSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="md:col-span-4 space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
                  {t('status')}
                </label>
                <div className="flex gap-2">
                  <Select value={incStatus} onValueChange={setIncStatus}>
                    <SelectTrigger className="flex-1 h-10">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                        <SelectValue placeholder={t('status')} />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('all_statuses')}</SelectItem>
                      <SelectItem value="new">{isRtl ? 'جديد' : 'New'}</SelectItem>
                      <SelectItem value="open">{isRtl ? 'مفتوح' : 'Open'}</SelectItem>
                      <SelectItem value="investigating">{isRtl ? 'قيد التحقيق' : 'Investigating'}</SelectItem>
                      <SelectItem value="resolved">{isRtl ? 'تم الحل' : 'Resolved'}</SelectItem>
                      <SelectItem value="closed">{isRtl ? 'مغلق' : 'Closed'}</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="flex bg-slate-50 rounded-lg p-1 border border-slate-200">
                    <Button
                      variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                      size="icon"
                      className={cn("h-7 w-7 rounded-md", viewMode === 'table' ? "bg-white shadow-sm" : "")}
                      onClick={() => setViewMode('table')}
                      title={isRtl ? 'عرض جدول' : 'Table View'}
                    >
                      <ListIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                      size="icon"
                      className={cn("h-7 w-7 rounded-md", viewMode === 'cards' ? "bg-white shadow-sm" : "")}
                      onClick={() => setViewMode('cards')}
                      title={isRtl ? 'عرض بطاقات' : 'Card View'}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {viewMode === 'table' ? (
            <Card className="border-none shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-[#f8fafc]">
                    <TableRow>
                      <SortableTableHead sortKey="id" sort={incSort.sort} onToggle={incSort.toggle}>{t('incident_id')}</SortableTableHead>
                      <SortableTableHead sortKey="title" sort={incSort.sort} onToggle={incSort.toggle}>{t('title')}</SortableTableHead>
                      <SortableTableHead sortKey="priority" sort={incSort.sort} onToggle={incSort.toggle}>{t('priority')}</SortableTableHead>
                      <SortableTableHead sortKey="status" sort={incSort.sort} onToggle={incSort.toggle}>{t('status')}</SortableTableHead>
                      <SortableTableHead sortKey="reportedAt" sort={incSort.sort} onToggle={incSort.toggle}>{t('reported_at')}</SortableTableHead>
                      <TableHead className="font-bold text-center">{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myIncidents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-[#64748b]">
                          {isRtl ? 'لا توجد بلاغات مسندة إليك' : 'No incidents assigned to you'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      incSort.sortedRows(myIncidents, (i: any, key: string) => {
                        switch (key) {
                          case 'id': return i.id || '';
                          case 'title': return i.title || '';
                          case 'priority': {
                            const order: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
                            return order[i.priority] || 0;
                          }
                          case 'status': {
                            const order: Record<string, number> = { new: 1, open: 2, investigating: 3, resolved: 4, closed: 5 };
                            return order[i.status] || 0;
                          }
                          case 'reportedAt': return i.reportedAt || '';
                          default: return '';
                        }
                      }).map((inc: any) => (
                        <TableRow key={inc.id} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell className="font-mono font-bold text-red-600">{inc.id}</TableCell>
                          <TableCell className="font-medium text-[#1e293b]">
                            <div className="flex flex-col">
                              <span>{inc.title}</span>
                              <span className="text-[10px] text-slate-400">{inc.reporterEmail}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(
                              "uppercase text-[10px]",
                              inc.priority === 'critical' ? 'border-red-200 text-red-600 bg-red-50' :
                              inc.priority === 'high' ? 'border-orange-200 text-orange-600 bg-orange-50' :
                              'border-slate-200 text-slate-600'
                            )}>
                              {inc.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn(
                              "capitalize",
                              inc.status === 'closed' ? 'bg-slate-500' :
                              inc.status === 'resolved' ? 'bg-emerald-500' :
                              'bg-blue-500'
                            )}>
                              {inc.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[#64748b] text-[13px]">
                            {inc.reportedAt.split('T')[0]}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => openIncidentDetails(inc)}
                                title={isRtl ? 'تفاصيل السجل' : 'View History & Details'}
                              >
                                <FileText className="w-4 h-4" />
                              </Button>
                              
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-slate-600 hover:text-slate-700 hover:bg-slate-50"
                                onClick={() => {
                                  setSelectedIncForAction(inc);
                                  setNewStatusForAction(inc.status);
                                  setIsActionDialogOpen(true);
                                  setActionNote('');
                                  setActionAttachments([]);
                                }}
                                title={isRtl ? 'إضافة ملاحظة/مرفق' : 'Add Note/Attachment'}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>

                              <Select 
                                value={inc.status} 
                                onValueChange={(val) => handleIncidentStatusChange(inc.id, val)}
                              >
                                <SelectTrigger className="w-[120px] h-8 text-xs bg-white">
                                  <SelectValue>{t(inc.status)}</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="open">{isRtl ? 'مفتوح' : 'Open'}</SelectItem>
                                  <SelectItem value="investigating">{isRtl ? 'قيد التحقيق' : 'Investigating'}</SelectItem>
                                  <SelectItem value="resolved">{isRtl ? 'تم الحل' : 'Resolved'}</SelectItem>
                                  <SelectItem value="closed">{isRtl ? 'إغلاق البلاغ' : 'Close Incident'}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {myIncidents.length === 0 ? (
                <div className="col-span-full py-12 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-500">
                  {isRtl ? 'لا توجد بلاغات مسندة إليك' : 'No incidents assigned to you'}
                </div>
              ) : (
                myIncidents.map((inc) => (
                  <Card key={inc.id} className="border-none shadow-sm hover:shadow-md transition-shadow group overflow-hidden">
                    <div className={cn(
                      "h-1.5 w-full",
                      inc.priority === 'critical' ? 'bg-red-500' :
                      inc.priority === 'high' ? 'bg-orange-500' :
                      'bg-slate-300'
                    )} />
                    <CardHeader className="p-5 space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="font-mono font-black text-red-600 text-xs">#{inc.id}</span>
                        <Badge className={cn(
                          "capitalize text-[10px] h-5",
                          inc.status === 'closed' ? 'bg-slate-500' :
                          inc.status === 'resolved' ? 'bg-emerald-500' :
                          'bg-blue-500'
                        )}>
                          {inc.status}
                        </Badge>
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">{inc.title}</h4>
                        <p className="text-[10px] text-slate-400 mt-1">{inc.reporterEmail}</p>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5 pt-0 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Calendar className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-medium">{inc.reportedAt.split('T')[0]}</span>
                        </div>
                        <Badge variant="outline" className={cn(
                          "uppercase text-[9px] font-black h-5",
                          inc.priority === 'critical' ? 'border-red-200 text-red-600 bg-red-50' :
                          inc.priority === 'high' ? 'border-orange-200 text-orange-600 bg-orange-50' :
                          'border-slate-200 text-slate-600'
                        )}>
                          {inc.priority}
                        </Badge>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-slate-50">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 h-8 text-[11px] font-bold rounded-lg gap-1.5 border-slate-200 hover:bg-blue-50 hover:text-blue-600"
                          onClick={() => openIncidentDetails(inc)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {isRtl ? 'عرض' : 'View'}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 h-8 text-[11px] font-bold rounded-lg gap-1.5 border-slate-200 hover:bg-slate-50"
                          onClick={() => {
                            setSelectedIncForAction(inc);
                            setNewStatusForAction(inc.status);
                            setIsActionDialogOpen(true);
                            setActionNote('');
                            setActionAttachments([]);
                          }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {isRtl ? 'إجراء' : 'Action'}
                        </Button>
                      </div>

                      <div className="pt-2">
                        <Select 
                          value={inc.status} 
                          onValueChange={(val) => handleIncidentStatusChange(inc.id, val)}
                        >
                          <SelectTrigger className="w-full h-8 text-[10px] bg-slate-50/50 border-slate-100">
                            <SelectValue>{t(inc.status)}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">{isRtl ? 'مفتوح' : 'Open'}</SelectItem>
                            <SelectItem value="investigating">{isRtl ? 'قيد التحقيق' : 'Investigating'}</SelectItem>
                            <SelectItem value="resolved">{isRtl ? 'تم الحل' : 'Resolved'}</SelectItem>
                            <SelectItem value="closed">{isRtl ? 'إغلاق البلاغ' : 'Close Incident'}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="requests" className="mt-6 space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800">{t('change_requests')}</h3>
            <Button 
              onClick={() => setIsNewRequestDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl gap-2 h-11"
            >
              <Plus className="w-4 h-4" />
              {t('new_request')}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Received Requests */}
            <Card className="border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
              <CardHeader className="bg-slate-50 border-b p-4">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-blue-600" />
                  <CardTitle className="text-base font-black uppercase tracking-tight">{t('received_requests')}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1">
                <ScrollArea className="h-[500px]">
                  {myReceivedRequests.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 italic">
                      {isRtl ? 'لا توجد طلبات واردة' : 'No received requests'}
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {myReceivedRequests.map((req) => (
                        <div key={req.id} className="p-4 hover:bg-slate-50/50 transition-colors group">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border border-slate-200">
                                <AvatarImage />
                                <AvatarFallback className="bg-blue-100 text-blue-700 font-black">
                                  {req.senderName.substring(0,2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h4 className="text-sm font-black text-slate-900 group-hover:text-blue-700 transition-colors">{req.title}</h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{req.senderName}</p>
                              </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-1">
                              <Badge className={cn(
                                "text-[10px] font-black uppercase h-5",
                                req.status === 'approved' ? 'bg-emerald-500' :
                                req.status === 'rejected' ? 'bg-red-500' :
                                req.status === 'clarification_needed' ? 'bg-orange-500' :
                                'bg-blue-500'
                              )}>
                                {t(req.status)}
                              </Badge>
                              <span className="text-[9px] text-slate-400 font-mono">{req.createdAt.split('T')[0]}</span>
                            </div>
                          </div>
                          
                          <p className="text-xs text-slate-600 line-clamp-2 mb-4 px-1">{req.description}</p>
                          
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 text-[11px] font-bold rounded-lg border-slate-200"
                              onClick={() => {
                                setSelectedRequest(req);
                                setIsManageRequestDialogOpen(true);
                                setRequestActionNote('');
                                setRequestActionAttachments([]);
                              }}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1.5" />
                              {t('view_details')}
                            </Button>
                            {req.status === 'pending' && (
                              <Button 
                                size="sm" 
                                className="h-8 text-[11px] font-bold rounded-lg bg-blue-600 hover:bg-blue-700"
                                onClick={() => {
                                  setSelectedRequest(req);
                                  setIsManageRequestDialogOpen(true);
                                  setRequestActionNote('');
                                  setRequestActionAttachments([]);
                                }}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                                {t('approve')}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Sent Requests */}
            <Card className="border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
              <CardHeader className="bg-slate-50 border-b p-4">
                <div className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-blue-600" />
                  <CardTitle className="text-base font-black uppercase tracking-tight">{t('sent_requests')}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1">
                <ScrollArea className="h-[500px]">
                  {mySentRequests.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 italic">
                      {isRtl ? 'لا توجد طلبات مرسلة' : 'No sent requests'}
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {mySentRequests.map((req) => (
                        <div key={req.id} className="p-4 hover:bg-slate-50/50 transition-colors group">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border border-slate-200">
                                <AvatarImage />
                                <AvatarFallback className="bg-slate-100 text-slate-700 font-black">
                                  {req.receiverName.substring(0,2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h4 className="text-sm font-black text-slate-900">{req.title}</h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{isRtl ? 'إلى: ' : 'To: '}{req.receiverName}</p>
                              </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-1">
                              <Badge className={cn(
                                "text-[10px] font-black uppercase h-5",
                                req.status === 'approved' ? 'bg-emerald-500' :
                                req.status === 'rejected' ? 'bg-red-500' :
                                req.status === 'clarification_needed' ? 'bg-orange-500' :
                                'bg-blue-500'
                              )}>
                                {t(req.status)}
                              </Badge>
                              <span className="text-[9px] text-slate-400 font-mono">{req.createdAt.split('T')[0]}</span>
                            </div>
                          </div>
                          
                          <p className="text-xs text-slate-600 line-clamp-2 mb-4 px-1">{req.description}</p>
                          
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 text-[11px] font-bold rounded-lg border-slate-200"
                              onClick={() => {
                                setSelectedRequest(req);
                                setIsManageRequestDialogOpen(true);
                                setRequestActionNote('');
                                setRequestActionAttachments([]);
                              }}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1.5" />
                              {t('view_details')}
                            </Button>
                            {req.status === 'clarification_needed' && (
                              <Button 
                                size="sm" 
                                className="h-8 text-[11px] font-bold rounded-lg bg-orange-600 hover:bg-orange-700"
                                onClick={() => {
                                  setSelectedRequest(req);
                                  setIsManageRequestDialogOpen(true);
                                  setRequestActionNote('');
                                  setRequestActionAttachments([]);
                                }}
                              >
                                <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                                {t('reply')}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Commitment Completion Dialog */}
      <Dialog open={isCommCompleteDialogOpen} onOpenChange={setIsCommCompleteDialogOpen}>
        <DialogContent className="max-w-md bg-white border-none shadow-2xl p-0" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="h-1.5 bg-emerald-600" />
          <div className="p-8 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                {isRtl ? 'إكمال الالتزام' : 'Complete Commitment'}
              </DialogTitle>
              <DialogDescription className="font-medium text-slate-500">
                {isRtl 
                  ? 'يرجى إرفاق ملف يثبت إنجاز هذا الالتزام لتغيير حالته إلى مكتمل.' 
                  : 'Please attach a file proving the completion of this commitment to change its status to completed.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                  {isRtl ? 'عنوان المرفق (اختياري)' : 'Evidence Title (Optional)'}
                </Label>
                <Input 
                  placeholder={isRtl ? 'مثال: تقرير الالتزام، رخصة مجددة...' : 'e.g. Compliance report, renewed license...'}
                  value={commEvidenceTitle}
                  onChange={(e) => setCommEvidenceTitle(e.target.value)}
                  className="border-slate-200 focus:ring-emerald-600"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                  {isRtl ? 'المرفق (إلزامي)' : 'Attachment (Mandatory)'}
                </Label>
                
                {commEvidenceLink && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs font-medium flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-3 h-3 text-emerald-600" />
                      <span className="truncate max-w-[200px] text-emerald-700">{attachmentLabel(commEvidenceLink)}</span>
                    </div>
                    <button 
                      onClick={() => setCommEvidenceLink('')}
                      className="text-emerald-400 hover:text-rose-500 font-bold text-lg"
                    >
                      ×
                    </button>
                  </div>
                )}

                {!commEvidenceLink && (
                  <div className="relative">
                    <input
                      type="file"
                      id="comm-file-upload"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setIsCommUploading(true);
                        let uploaded;
                        try {
                          uploaded = await filesApi.uploadFile(file);
                        } catch (error) {
                          console.error('Failed to upload commitment evidence', error);
                          toast.error(isRtl ? 'فشل رفع الملف' : 'Upload failed');
                        }
                        setIsCommUploading(false);
                        e.target.value = '';
                        if (!uploaded) { toast.error(isRtl ? 'فشل رفع الملف' : 'Upload failed'); return; }
                        setCommEvidenceLink(uploaded.url);
                        toast.success(isRtl ? 'تم رفع إثبات الإنجاز' : 'Evidence uploaded');
                      }}
                    />
                    <Button 
                      variant="outline" 
                      nativeButton={false}
                      render={
                        <label htmlFor="comm-file-upload" className="cursor-pointer flex flex-col items-center justify-center">
                          {isCommUploading ? (
                            <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                          ) : (
                            <>
                              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mb-1">
                                <Paperclip className="w-5 h-5 text-emerald-600" />
                              </div>
                              <span className="font-bold text-slate-700">{isRtl ? 'اسحب الملف هنا أو انقر للإرفاق' : 'Drop file here or click to attach'}</span>
                              <span className="text-[10px] text-slate-400">PDF, Images or Documents</span>
                            </>
                          )}
                        </label>
                      }
                      className="w-full border-dashed border-emerald-300 bg-white hover:bg-emerald-50/50 h-24 text-slate-500 rounded-xl cursor-pointer flex-col gap-2"
                    />
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="pt-6 sm:justify-between gap-3">
              <Button variant="ghost" onClick={() => setIsCommCompleteDialogOpen(false)} className="flex-1 h-12 font-bold rounded-xl text-slate-500">
                {isRtl ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button 
                onClick={confirmCommitmentCompletion} 
                className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/10"
              >
                {isRtl ? 'إكمال الالتزام' : 'Complete Commitment'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* File Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl bg-white border-none shadow-2xl p-0 overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="h-1.5 bg-blue-600" />
          <div className="p-0">
            <div className="bg-slate-900 p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-tight">{previewFile}</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">{isRtl ? 'عرض مستند المرفق' : 'Viewing attachment document'}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsPreviewOpen(false)}
                className="text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="p-12 bg-slate-50 min-h-[400px] flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-6 border border-slate-100">
                <Paperclip className="w-12 h-12 text-slate-200" />
              </div>
              <h4 className="text-xl font-black text-slate-900 mb-2">
                {isRtl ? 'معاينة الملف' : 'File Preview'}
              </h4>
              <p className="max-w-md text-slate-500 text-sm leading-relaxed mb-8">
                {isRtl 
                  ? `هذه معاينة تجريبية للملف (${previewFile}). في النظام الفعلي، سيتم عرض محتوى الملف هنا (صورة، PDF، أو مستند).` 
                  : `This is a mock preview for the file (${previewFile}). In a real system, the actual file content (Image, PDF, or Document) would be displayed here.`}
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="font-bold bg-white">{isRtl ? 'تحميل الملف' : 'Download File'}</Button>
                <Button 
                  onClick={() => setIsPreviewOpen(false)}
                  className="bg-blue-600 hover:bg-blue-700 font-bold px-8"
                >
                  {isRtl ? 'إغلاق' : 'Close'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Incident Details & History Dialog */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="max-w-2xl bg-white border-none shadow-2xl p-0 h-[80vh] flex flex-col" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="h-1.5 bg-slate-900" />
          <div className="p-8 space-y-6 overflow-y-auto flex-1">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                <Shield className="w-6 h-6 text-red-500" />
                {isRtl ? 'تفاصيل البلاغ والسجل' : 'Incident Details & History'}
              </DialogTitle>
              <DialogDescription className="font-bold text-red-600 font-mono">
                #{selectedIncForDetails?.id}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    {isRtl ? 'الحالة' : 'Status'}
                  </span>
                  <Badge>{selectedIncForDetails?.status}</Badge>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    {isRtl ? 'الأولوية' : 'Priority'}
                  </span>
                  <Badge variant="outline">{selectedIncForDetails?.priority}</Badge>
                </div>
              </div>

              {/* Description & Initial Attachments */}
              <div className="space-y-3">
                <h4 className="text-sm font-black text-slate-900 border-b pb-2">
                  {isRtl ? 'وصف البلاغ' : 'Report Description'}
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed bg-slate-50/50 p-4 rounded-xl italic">
                  {selectedIncForDetails?.description}
                </p>
                
                {selectedIncForDetails?.attachments && selectedIncForDetails.attachments.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">
                      {isRtl ? 'المرفقات الأولية' : 'Initial Attachments'}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {selectedIncForDetails.attachments.map((file, idx) => (
                        <button 
                          key={idx} 
                          onClick={() => handleViewAttachment(file)}
                          className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-100 hover:bg-blue-100 transition-colors"
                        >
                          <Paperclip className="w-3 h-3" />
                          {attachmentLabel(file)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* History / Notes */}
              <div className="space-y-4">
                <h4 className="text-sm font-black text-slate-900 border-b pb-2 flex items-center justify-between">
                  <span>{isRtl ? 'سجل الإجراءات' : 'Action History'}</span>
                  <Badge variant="outline" className="text-[10px]">{incidentNotes.length}</Badge>
                </h4>
                
                {incidentNotes.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs italic">
                    {isRtl ? 'لا يوجد سجل إجراءات' : 'No action history yet'}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {incidentNotes.map((note) => (
                      <div key={note.id} className="relative border-r-2 border-slate-100 pr-4 rtl:border-r-0 rtl:border-l-2 rtl:pl-4 py-1">
                        <div className="absolute -right-1.5 top-2 w-3 h-3 rounded-full bg-slate-200 rtl:-right-auto rtl:-left-1.5" />
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-black text-slate-900">{note.authorName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{new Date(note.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-slate-600 bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                          {note.content}
                        </p>
                        {note.attachments && note.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {note.attachments.map((file, idx) => (
                              <button 
                                key={idx} 
                                onClick={() => handleViewAttachment(file)}
                                className="flex items-center gap-1.5 bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-medium border border-slate-200 hover:bg-slate-200 transition-colors"
                              >
                                <Paperclip className="w-2.5 h-2.5" />
                                {attachmentLabel(file)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="p-6 border-t bg-slate-50">
            <Button onClick={() => setIsViewDetailsOpen(false)} className="w-full h-12 bg-slate-900 font-bold rounded-xl">
              {isRtl ? 'إغلاق' : 'Close'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Incident Action Dialog (Notes & Attachments) */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent className="max-w-md bg-white border-none shadow-2xl p-0" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="h-1.5 bg-blue-600" />
          <div className="p-8 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-blue-500" />
                {isRtl ? 'تحديث حالة البلاغ' : 'Update Incident Status'}
              </DialogTitle>
              <DialogDescription className="font-medium text-slate-500">
                {isRtl 
                  ? `تغيير الحالة إلى (${newStatusForAction}). يرجى إضافة ملاحظات ومرفقات لتوضيح الإجراء المتخذ.` 
                  : `Changing status to (${newStatusForAction}). Please add notes and attachments to explain the action taken.`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                  {isRtl ? 'الملاحظات (إلزامي)' : 'Notes (Mandatory)'}
                </Label>
                <Textarea 
                  placeholder={isRtl ? 'اكتب ملاحظاتك هنا...' : 'Write your notes here...'}
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  className="min-h-[120px] border-slate-200 focus:ring-blue-600"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                  {isRtl ? 'المرفقات' : 'Attachments'}
                </Label>
                
                <div className="flex flex-wrap gap-2">
                  {actionAttachments.map((file, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-2 shadow-sm">
                      <Paperclip className="w-3 h-3 text-slate-400" />
                      <span className="truncate max-w-[150px]">{attachmentLabel(file)}</span>
                      <button
                        onClick={() => setActionAttachments(prev => prev.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-red-500"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <div className="relative">
                  <input
                    type="file"
                    id="action-file-upload"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setIsActionUploading(true);
                      const uploaded = await filesApi.uploadFile(file);
                      setIsActionUploading(false);
                      e.target.value = '';
                      if (!uploaded) { toast.error(isRtl ? 'فشل رفع الملف' : 'Upload failed'); return; }
                      setActionAttachments(prev => [...prev, uploaded.url]);
                      toast.success(isRtl ? 'تمت إضافة المرفق' : 'Attachment added');
                    }}
                  />
                  <Button 
                    variant="outline" 
                    nativeButton={false}
                    render={
                      <label htmlFor="action-file-upload" className="cursor-pointer flex items-center justify-center gap-2">
                        {isActionUploading ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Paperclip className="w-4 h-4" />
                            {isRtl ? 'إضافة مرفق' : 'Add Attachment'}
                          </>
                        )}
                      </label>
                    }
                    className="w-full border-dashed border-slate-300 bg-white hover:bg-slate-50 h-10 text-slate-500 rounded-xl cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-6 sm:justify-between gap-3">
              <Button variant="ghost" onClick={() => setIsActionDialogOpen(false)} className="flex-1 h-12 font-bold rounded-xl">
                {isRtl ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button 
                onClick={confirmIncidentAction} 
                className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/10"
              >
                {isRtl ? 'تحديث الحالة' : 'Update Status'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Closing Incident Dialog (Feedback Simulation) */}
      <Dialog open={isClosingDialogOpen} onOpenChange={setIsClosingDialogOpen}>
        <DialogContent className="max-w-md bg-white border-none shadow-2xl p-0" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="h-1.5 bg-slate-900" />
          <div className="p-8 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                {isRtl ? 'حل البلاغ والتقييم' : 'Resolve Incident & Feedback'}
              </DialogTitle>
              <DialogDescription className="font-medium text-slate-500">
                {isRtl 
                  ? 'عند حل البلاغ، سيتم إرسال طلب تقييم للمبلغ. للمحاكاة، يرجى إدخال التقييم المتوقع.' 
                  : 'When resolving the incident, a feedback request is sent. For simulation, please enter the expected feedback.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                  {isRtl ? 'التقييم (1-5)' : 'Rating (1-5)'}
                </Label>
                <div className="flex items-center gap-2 justify-center py-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button 
                      key={star} 
                      onClick={() => setFeedbackRating(star)}
                      className="p-1 transition-transform hover:scale-125"
                    >
                      <Star className={cn(
                        "w-8 h-8 transition-colors",
                        star <= feedbackRating ? "fill-amber-400 text-amber-400" : "text-slate-200"
                      )} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                  {isRtl ? 'تعليق المبلغ المحاكى' : 'Simulated Reporter Comment'}
                </Label>
                <Textarea 
                  placeholder={isRtl ? 'أدخل تعليق المبلغ هنا...' : 'Enter reporter comment here...'}
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  className="min-h-[100px] border-slate-200 focus:ring-slate-900"
                />
              </div>
            </div>

            <DialogFooter className="pt-6 sm:justify-between gap-3">
              <Button variant="ghost" onClick={() => setIsClosingDialogOpen(false)} className="flex-1 h-12 font-bold rounded-xl">
                {isRtl ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button 
                onClick={confirmCloseIncident} 
                className="flex-1 h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-slate-900/10"
              >
                {isRtl ? 'تأكيد الحل' : 'Confirm Resolution'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Procedure Comments Dialog */}
      <Dialog open={!!commentProcedure} onOpenChange={(open) => { if (!open) setCommentProcedure(null); }}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto bg-white border-none shadow-2xl p-0" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="h-1.5 bg-blue-600" />
          <div className="p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                {isRtl ? 'تعليقات الإجراء' : 'Procedure Comments'}
              </DialogTitle>
              {commentProcedure && (
                <p className="text-[12px] text-slate-500 mt-1">{isRtl ? commentProcedure.nameAr : commentProcedure.nameEn}</p>
              )}
            </DialogHeader>

            {/* Existing comments list */}
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {commentProcedure && (commentProcedure.comments || []).length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-[12px] italic">
                  {isRtl ? 'لا توجد تعليقات بعد' : 'No comments yet'}
                </div>
              ) : (
                (commentProcedure?.comments || []).slice().reverse().map((c: any) => (
                  <div key={c.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[12px] font-bold text-slate-700">{c.userName}</span>
                      <span className="text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleString(isRtl ? 'ar-SA' : 'en-US')}</span>
                    </div>
                    <p className="text-[13px] text-slate-700 whitespace-pre-wrap break-words">{c.text}</p>
                  </div>
                ))
              )}
            </div>

            {/* New comment textarea */}
            <div className="space-y-2 pt-2 border-t border-border-subtle">
              <label className="text-[12px] font-bold text-text-main">
                {isRtl ? 'إضافة تعليق' : 'Add Comment'}
              </label>
              <textarea
                value={newCommentText}
                onChange={e => setNewCommentText(e.target.value)}
                placeholder={isRtl ? 'اكتب تعليقك هنا...' : 'Type your comment...'}
                className="w-full min-h-[100px] rounded-lg border border-border-subtle p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/40"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 px-6 py-4 bg-slate-50 border-t border-border-subtle">
            <Button variant="ghost" onClick={() => setCommentProcedure(null)}>
              {t('cancel')}
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
              disabled={!newCommentText.trim() || !commentProcedure}
              onClick={async () => {
                if (!commentProcedure || !newCommentText.trim()) return;
                const newComment: any = {
                  id: Math.random().toString(36).slice(2, 11),
                  procedureId: commentProcedure.id,
                  userId: user?.uid || 'unknown',
                  userName: user?.displayName || (isRtl ? 'مستخدم' : 'User'),
                  text: newCommentText.trim(),
                  createdAt: new Date().toISOString()
                };
                try {
                  const latestProcedures = await proceduresApi.getProcedures();
                  const procedure = latestProcedures.find(p => p.id === commentProcedure.id) || commentProcedure;
                  const updated: Procedure = {
                    ...procedure,
                    comments: [...(procedure.comments || []), newComment],
                    updatedAt: new Date().toISOString()
                  };
                  const saved = await proceduresApi.updateProcedure(updated.id, updated);
                  await refreshData();
                  setCommentProcedure(saved);
                  setNewCommentText('');
                toast.success(isRtl ? 'تم إضافة التعليق' : 'Comment added');
                } catch (error) {
                  console.error('Failed to add procedure comment', error);
                  toast.error(isRtl ? 'تعذر إضافة التعليق' : 'Could not add comment');
                }
              }}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              {isRtl ? 'إرسال' : 'Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Evidence Management Dialog */}
      <Dialog open={isEvidenceDialogOpen} onOpenChange={setIsEvidenceDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border-none shadow-2xl p-0" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="h-1.5 bg-blue-600" />
          <div className="p-8 space-y-6">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                    <Paperclip className="w-6 h-6 text-blue-600" />
                    {isRtl ? 'إدارة الشواهد' : 'Evidence Management'}
                  </DialogTitle>
                  <DialogDescription className="font-medium text-slate-500 mt-1">
                    {selectedProcedureForEvidence && (isRtl ? selectedProcedureForEvidence.nameAr : selectedProcedureForEvidence.nameEn)}
                  </DialogDescription>
                </div>
                <Button 
                  onClick={() => setIsAddEvidenceDialogOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 px-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {isRtl ? 'إضافة شاهد' : 'Add Evidence'}
                </Button>
              </div>
            </DialogHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
              {evidenceList.length > 0 ? (
                evidenceList.map((evidence) => {
                  // Resolve the uploader name. Newer records store the UID; older
                  // ones stored the display name directly — fall back to that.
                  // Note: `users` excludes the current user, so check `user` too.
                  const uploader = evidence.uploadedBy === user?.uid
                    ? user
                    : users.find(u => u.uid === evidence.uploadedBy);
                  const uploaderName = uploader?.displayName || evidence.uploadedBy || (isRtl ? 'مستخدم' : 'User');
                  const isOwner = !!user && (evidence.uploadedBy === user.uid);
                  const canDeleteEvidence = isOwner || can('procedures.evidence.delete');
                  return (
                  <div key={evidence.id} className="bg-slate-50 rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all group relative">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canDeleteEvidence && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 rounded-lg text-rose-600 hover:bg-rose-100"
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
                      <h3 className="font-bold text-slate-900 truncate pr-8">{evidence.name}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2 min-h-[32px]">
                        {evidence.description || (isRtl ? 'لا يوجد وصف' : 'No description provided')}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                      <UserIcon className="w-3 h-3" />
                      <span className="truncate" title={uploaderName}>
                        {isRtl ? 'رفعه:' : 'Uploaded by:'} <span className="font-bold text-slate-700">{uploaderName}</span>
                      </span>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        <Calendar className="w-3 h-3" />
                        {new Date(evidence.uploadedAt).toLocaleDateString(isRtl ? 'ar-SA' : 'en-US')}
                      </div>
                      <a
                        href={evidence.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={async (e) => {
                          e.preventDefault();
                          try {
                            await filesApi.openFile(evidence.url);
                          } catch (error) {
                            console.error('Failed to open evidence file', error);
                            toast.error(isRtl ? 'تعذر فتح الشاهد' : 'Could not open evidence');
                          }
                        }}
                        className="text-blue-600 text-xs font-bold flex items-center gap-1 hover:underline"
                      >
                        {isRtl ? 'عرض' : 'View'}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                  );
                })
              ) : (
                <div className="col-span-full bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-4 text-slate-300">
                    <FileText className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{isRtl ? 'لا توجد شواهد بعد' : 'No evidence yet'}</h3>
                  <p className="text-slate-500 text-sm max-w-xs mx-auto mb-6">
                    {isRtl ? 'ابدأ برفع الشواهد لدعم الامتثال لهذا الإجراء.' : 'Start by uploading evidence to support this procedure compliance.'}
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsAddEvidenceDialogOpen(true)}
                    className="rounded-xl px-6 border-slate-200 font-bold bg-white text-slate-600 hover:bg-slate-50 shadow-sm"
                  >
                    {isRtl ? 'إضافة الشاهد الأول' : 'Add First Evidence'}
                  </Button>
                </div>
              )}
            </div>

            <DialogFooter className="pt-6 sm:justify-start">
              <Button variant="ghost" onClick={() => setIsEvidenceDialogOpen(false)} className="h-11 px-6 font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600">
                {isRtl ? 'إغلاق' : 'Close'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Evidence Dialog */}
      <Dialog open={isAddEvidenceDialogOpen} onOpenChange={setIsAddEvidenceDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl border-none shadow-2xl p-0" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="h-1.5 bg-blue-600" />
          <div className="p-8 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">{isRtl ? 'إضافة شاهد' : 'Add Evidence'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-5 py-4">
              <div className="flex p-1 bg-slate-100 rounded-xl">
                <button 
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                    sourceType === 'link' ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700"
                  )}
                  onClick={() => setSourceType('link')}
                >
                  {isRtl ? 'رابط' : 'Link'}
                </button>
                <button 
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                    sourceType === 'file' ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700"
                  )}
                  onClick={() => setSourceType('file')}
                >
                  {isRtl ? 'رفع ملف' : 'File Upload'}
                </button>
              </div>

              <div className="grid gap-2">
                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                  {isRtl ? 'اسم الشاهد' : 'Evidence Name'}
                  {sourceType === 'link' && <span className="text-red-500">*</span>}
                  {sourceType === 'file' && selectedFiles.length > 1 && (
                    <span className="text-[9px] text-slate-400 font-normal mx-1">
                      ({isRtl ? 'بادئة اختيارية — يُضاف اسم الملف بعدها' : 'optional prefix — file name appended'})
                    </span>
                  )}
                </Label>
                <Input
                  value={newEvidence.name || ''}
                  onChange={e => setNewEvidence({...newEvidence, name: e.target.value})}
                  placeholder={isRtl ? 'مثال: لقطة شاشة للإعدادات' : 'e.g., Screenshot of configuration'}
                  className="rounded-xl border-slate-200 h-12 focus:ring-blue-600"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">{t('description')}</Label>
                <Textarea 
                  value={newEvidence.description || ''} 
                  onChange={e => setNewEvidence({...newEvidence, description: e.target.value})}
                  placeholder={isRtl ? 'وصف موجز لما يثبت هذا الشاهد...' : 'Briefly describe what this evidence proves...'}
                  className="w-full min-h-[100px] rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-transparent"
                />
              </div>
              
              {sourceType === 'link' ? (
                <div className="grid gap-2">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                    {isRtl ? 'رابط الملف' : 'File URL / Link'} <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      value={newEvidence.url || ''} 
                      onChange={e => setNewEvidence({...newEvidence, url: e.target.value})}
                      placeholder="https://..."
                      className="rounded-xl border-slate-200 h-12 pl-10 focus:ring-blue-600"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">{isRtl ? 'في هذه النسخة التجريبية، يرجى تقديم رابط للملف.' : 'Please provide a link to the file.'}</p>
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                    {isRtl ? 'رفع الملفات' : 'Upload Files'} <span className="text-red-500">*</span>
                    {selectedFiles.length > 0 && (
                      <span className="text-blue-600 font-bold mx-1">({selectedFiles.length})</span>
                    )}
                  </Label>
                  <div
                    className={cn(
                      "border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer",
                      selectedFiles.length > 0 ? "border-blue-600 bg-blue-50/30" : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                    )}
                    onClick={() => document.getElementById('dialog-file-upload')?.click()}
                  >
                    <input
                      id="dialog-file-upload"
                      type="file"
                      multiple
                      className="hidden"
                      accept=".pdf,image/*"
                      onChange={handleEvidenceFileChange}
                    />
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-900">
                        {selectedFiles.length > 0
                          ? (isRtl ? 'انقر لإضافة ملفات أخرى' : 'Click to add more files')
                          : (isRtl ? 'انقر لرفع الملفات' : 'Click to upload files')}
                      </p>
                      <p className="text-[11px] text-slate-400 font-medium">
                        {isRtl ? 'PDF أو صور — يمكن اختيار أكثر من ملف' : 'PDF or images — multiple files supported'}
                      </p>
                    </div>
                  </div>

                  {selectedFiles.length > 0 && (
                    <div className="mt-2 space-y-1.5 max-h-[200px] overflow-y-auto">
                      {selectedFiles.map((f, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                          <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-bold text-slate-800 truncate">{f.name}</p>
                            <p className="text-[10px] text-slate-400">{(f.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
                            }}
                            className="text-rose-500 hover:text-rose-700 shrink-0"
                            title={isRtl ? 'حذف' : 'Remove'}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <DialogFooter className="gap-3 sm:justify-between">
              <Button variant="ghost" onClick={() => setIsAddEvidenceDialogOpen(false)} className="flex-1 h-12 font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600">
                {isRtl ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button onClick={handleAddEvidence} className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/10">
                {isRtl ? 'حفظ' : 'Save'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Change Request Dialog */}
      <Dialog open={isNewRequestDialogOpen} onOpenChange={setIsNewRequestDialogOpen}>
        <DialogContent className="max-w-md bg-white border-none shadow-2xl p-0" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="h-1.5 bg-blue-600" />
          <div className="p-8 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                <Send className="w-6 h-6 text-blue-600" />
                {t('new_request')}
              </DialogTitle>
              <DialogDescription className="font-medium text-slate-500">
                {isRtl ? 'قم بتعبئة النموذج أدناه لإرسال طلب تغيير لأحد الزملاء.' : 'Fill out the form below to send a change request to a colleague.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                  {t('request_type')} <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={newRequest.type} 
                  onValueChange={(val: ChangeRequestType) => setNewRequest({...newRequest, type: val})}
                >
                  <SelectTrigger className="h-11 border-slate-200 rounded-xl focus:ring-blue-600">
                    <SelectValue>
                      {(() => {
                        if (newRequest.type === 'other') return t('other');
                        const m = lookupOptions.find(o => o.category === 'change_request_type' && o.value === newRequest.type);
                        return m ? (isRtl ? m.labelAr : m.labelEn) : t(newRequest.type as string);
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {lookupOptions.filter(o => o.category === 'change_request_type' && o.isActive).map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {isRtl ? option.labelAr : option.labelEn}
                      </SelectItem>
                    ))}
                    <SelectItem value="other">{t('other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                  {t('select_receiver')} <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={newRequest.receiverId} 
                  onValueChange={(val) => setNewRequest({...newRequest, receiverId: val})}
                >
                  <SelectTrigger className="h-11 border-slate-200 rounded-xl focus:ring-blue-600">
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-slate-400" />
                      <SelectValue placeholder={t('select_receiver')}>
                        {newRequest.receiverId
                          ? (users.find(u => u.uid === newRequest.receiverId)?.displayName || t('select_receiver'))
                          : t('select_receiver')}
                      </SelectValue>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.uid} value={u.uid}>{u.displayName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                  {t('request_title')} <span className="text-red-500">*</span>
                </Label>
                <Input 
                  placeholder={isRtl ? 'مثال: فتح منفذ 8080 في خادم الإنتاج' : 'e.g. Open port 8080 in production server'}
                  value={newRequest.title}
                  onChange={(e) => setNewRequest({...newRequest, title: e.target.value})}
                  className="h-11 border-slate-200 rounded-xl focus:ring-blue-600"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                  {t('request_desc')}
                </Label>
                <Textarea 
                  placeholder={isRtl ? 'تفاصيل ومعلومات إضافية حول الطلب...' : 'Additional details and information about the request...'}
                  value={newRequest.description}
                  onChange={(e) => setNewRequest({...newRequest, description: e.target.value})}
                  className="min-h-[100px] border-slate-200 rounded-xl focus:ring-blue-600"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                  {t('attachments')}
                </Label>
                <div className="flex flex-wrap gap-2">
                  {newRequest.attachments.map((file, idx) => (
                    <div key={idx} className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 text-[10px] font-bold text-blue-700 flex items-center gap-2">
                      <Paperclip className="w-3 h-3" />
                      <span className="truncate max-w-[100px]">{attachmentLabel(file)}</span>
                      <button onClick={() => setNewRequest({...newRequest, attachments: newRequest.attachments.filter((_, i) => i !== idx)})}>
                        <X className="w-3 h-3 hover:text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="relative">
                  <input
                    type="file"
                    id="req-file-upload"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setIsRequestUploading(true);
                      const uploaded = await filesApi.uploadFile(file);
                      setIsRequestUploading(false);
                      e.target.value = '';
                      if (!uploaded) { toast.error(isRtl ? 'فشل رفع الملف' : 'Upload failed'); return; }
                      setNewRequest(prev => ({...prev, attachments: [...prev.attachments, uploaded.url]}));
                    }}
                  />
                  <Button 
                    variant="outline" 
                    nativeButton={false}
                    render={
                      <label htmlFor="req-file-upload" className="cursor-pointer flex items-center justify-center gap-2">
                        {isRequestUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                        {isRtl ? 'إرفاق ملف' : 'Attach File'}
                      </label>
                    }
                    className="w-full border-dashed border-slate-300 h-10 rounded-xl"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-3 sm:justify-between px-0">
              <Button variant="ghost" onClick={() => setIsNewRequestDialogOpen(false)} className="flex-1 h-12 font-bold rounded-xl text-slate-500">
                {t('cancel')}
              </Button>
              <Button 
                onClick={handleCreateRequest}
                className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/10"
              >
                {t('confirm_submit')}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Request Dialog */}
      <Dialog open={isManageRequestDialogOpen} onOpenChange={setIsManageRequestDialogOpen}>
        <DialogContent className="max-w-2xl bg-white border-none shadow-2xl p-0 h-[85vh] flex flex-col" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="h-1.5 bg-blue-600" />
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-8 space-y-8">
              <DialogHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 leading-tight">
                      {selectedRequest?.title}
                    </DialogTitle>
                    <div className="flex gap-2 mt-3">
                      <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 border-slate-200 text-slate-500">
                        {(() => {
                          const option = lookupOptions.find(o => o.category === 'change_request_type' && o.value === selectedRequest?.type);
                          return option ? (isRtl ? option.labelAr : option.labelEn) : t(selectedRequest?.type || '');
                        })()}
                      </Badge>
                      <Badge className={cn(
                        "text-[10px] font-black uppercase h-6 px-2 shadow-sm",
                        selectedRequest?.status === 'approved' ? 'bg-emerald-500 hover:bg-emerald-600' :
                        selectedRequest?.status === 'rejected' ? 'bg-red-500 hover:bg-red-600' :
                        selectedRequest?.status === 'clarification_needed' ? 'bg-orange-500 hover:bg-orange-600' :
                        'bg-blue-600 hover:bg-blue-700'
                      )}>
                        {t(selectedRequest?.status || '')}
                      </Badge>
                    </div>
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs px-2 py-1 bg-slate-100 text-slate-500 border-none">
                    {selectedRequest?.id}
                  </Badge>
                </div>
              </DialogHeader>

              {/* From/To Visual Card */}
              <div className="relative bg-gradient-to-br from-slate-50 to-white p-6 rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                <div className="relative flex items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{isRtl ? 'المرسل' : 'From'}</span>
                    <div className="flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-slate-100 shadow-sm">
                      <Avatar className="h-9 w-9 border-2 border-blue-100">
                        <AvatarFallback className="text-xs bg-blue-600 text-white font-black">
                          {selectedRequest?.senderName.substring(0,2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900">{selectedRequest?.senderName}</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{isRtl ? 'صاحب الطلب' : 'Request Owner'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center pt-5">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100 shadow-sm">
                      <Send className={cn("w-4 h-4 text-blue-600", isRtl ? "rotate-180" : "")} />
                    </div>
                    <div className="h-px w-8 bg-gradient-to-r from-transparent via-blue-200 to-transparent my-1" />
                  </div>

                  <div className="flex-1 space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-right rtl:text-left">{isRtl ? 'المستلم' : 'To'}</span>
                    <div className="flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-slate-100 shadow-sm flex-row-reverse rtl:flex-row">
                      <Avatar className="h-9 w-9 border-2 border-slate-100">
                        <AvatarFallback className="text-xs bg-slate-100 text-slate-600 font-black">
                          {selectedRequest?.receiverName.substring(0,2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col text-right rtl:text-left">
                        <span className="text-sm font-bold text-slate-800">{selectedRequest?.receiverName}</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{isRtl ? 'المسؤول المعني' : 'Responsive Agent'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <h4 className="text-sm font-black text-slate-900 tracking-tight">{t('request_desc')}</h4>
                </div>
                <div className="bg-blue-50/30 p-5 rounded-2xl border border-blue-50 leading-relaxed">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">
                    {selectedRequest?.description || (isRtl ? 'لا يوجد وصف متاح' : 'No description available')}
                  </p>
                </div>
                
                {selectedRequest?.attachments && selectedRequest.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {selectedRequest.attachments.map((file, idx) => (
                      <button 
                        key={idx} 
                        onClick={() => handleViewAttachment(file)}
                        className="group flex items-center gap-2 bg-white text-slate-600 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 hover:border-blue-300 hover:text-blue-700 transition-all shadow-sm"
                      >
                        <Paperclip className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500" />
                        {attachmentLabel(file)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <h4 className="text-sm font-black text-slate-900 tracking-tight">{t('history')}</h4>
                  </div>
                  <Badge variant="outline" className="text-[10px] h-5 rounded-full border-slate-200 text-slate-400">{selectedRequest?.history.length}</Badge>
                </div>
                
                <div className="relative space-y-8 pr-1 rtl:pr-0 rtl:pl-1">
                  {/* Timeline Track */}
                  <div className="absolute left-[19px] top-1 bottom-1 w-[3px] bg-slate-100 rounded-full rtl:left-auto rtl:right-[19px]" />
                  
                  {selectedRequest?.history.map((item, idx) => {
                    let icon = <Plus className="w-3.5 h-3.5" />;
                    let colorClass = "bg-blue-500";
                    let glowClass = "shadow-blue-500/20";
                    let bgLight = "bg-blue-50/50";
                    let borderLight = "border-blue-100";

                    if (item.action === 'approve') {
                      icon = <Check className="w-3.5 h-3.5" />;
                      colorClass = "bg-emerald-500";
                      glowClass = "shadow-emerald-500/20";
                      bgLight = "bg-emerald-50/30";
                      borderLight = "border-emerald-100";
                    } else if (item.action === 'reject') {
                      icon = <XIcon className="w-3.5 h-3.5" />;
                      colorClass = "bg-red-500";
                      glowClass = "shadow-red-500/20";
                      bgLight = "bg-red-50/30";
                      borderLight = "border-red-100";
                    } else if (item.action === 'request_clarification') {
                      icon = <AlertCircle className="w-3.5 h-3.5" />;
                      colorClass = "bg-orange-500";
                      glowClass = "shadow-orange-500/20";
                      bgLight = "bg-orange-50/30";
                      borderLight = "border-orange-100";
                    } else if (item.action === 'respond_clarification') {
                      icon = <CornerUpRight className="w-3.5 h-3.5" />;
                      colorClass = "bg-indigo-500";
                      glowClass = "shadow-indigo-500/20";
                      bgLight = "bg-indigo-50/30";
                      borderLight = "border-indigo-100";
                    }

                    return (
                      <div key={idx} className="relative pl-12 rtl:pl-0 rtl:pr-12 group">
                        {/* Timeline Node */}
                        <div className={cn(
                          "absolute left-0 top-0 w-10 h-10 rounded-2xl flex items-center justify-center text-white z-10 shadow-lg transition-transform group-hover:scale-110 rtl:left-auto rtl:right-0",
                          colorClass, glowClass
                        )}>
                          {icon}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between items-center ml-1 rtl:ml-0 rtl:mr-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-800">{item.userName}</span>
                              <Badge variant="secondary" className="text-[10px] font-bold uppercase h-4 px-1.5 opacity-80 bg-slate-100">
                                {t(item.action)}
                              </Badge>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono italic">
                              {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          
                          <div className={cn(
                            "p-4 rounded-2xl border shadow-sm transition-all hover:shadow-md",
                            bgLight, borderLight
                          )}>
                            <p className="text-xs text-slate-700 leading-relaxed font-medium">
                              {item.note}
                            </p>
                            
                            {item.attachments && item.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-200/50">
                                {item.attachments.map((f, i) => (
                                  <button 
                                    key={i} 
                                    onClick={() => handleViewAttachment(f)}
                                    className="flex items-center gap-1.5 bg-white/80 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-slate-100 hover:bg-white hover:shadow-sm"
                                  >
                                    <Paperclip className="w-3 h-3 text-slate-400" />
                                    {attachmentLabel(f)}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }).reverse()}
                </div>
              </div>
            </div>
          </div>

          {/* Action Section */}
          <div className="p-8 border-t bg-slate-50 space-y-6">
            {((user?.uid === selectedRequest?.receiverId && selectedRequest?.status === 'pending') || 
              (user?.uid === selectedRequest?.senderId && selectedRequest?.status === 'clarification_needed')) ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                      {t('note')} <span className="text-red-500">*</span>
                    </Label>
                    <span className="text-[10px] text-slate-400 italic">{isRtl ? 'الملاحظة ستظهر في سجل الطلب' : 'Note will appear in request history'}</span>
                  </div>
                  <Textarea 
                    placeholder={t('note_placeholder')}
                    value={requestActionNote}
                    onChange={(e) => setRequestActionNote(e.target.value)}
                    className="min-h-[100px] border-slate-200 rounded-2xl bg-white shadow-inner focus:ring-blue-600 resize-none"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {requestActionAttachments.map((f, i) => (
                    <Badge key={i} variant="secondary" className="gap-2 h-8 bg-blue-50 text-blue-700 shadow-sm border-blue-100 px-3 rounded-xl font-bold">
                      <Paperclip className="w-3 h-3" />
                      <span className="max-w-[150px] truncate">{attachmentLabel(f)}</span>
                      <button onClick={() => setRequestActionAttachments(prev => prev.filter((_, idx) => idx !== i))}>
                        <X className="w-3 h-3 hover:text-red-500" />
                      </button>
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-3">
                  <div className="relative">
                    <input
                      type="file"
                      id="action-req-upload"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setIsActionUploadingRequest(true);
                        const uploaded = await filesApi.uploadFile(file);
                        setIsActionUploadingRequest(false);
                        e.target.value = '';
                        if (!uploaded) { toast.error(isRtl ? 'فشل رفع الملف' : 'Upload failed'); return; }
                        setRequestActionAttachments(prev => [...prev, uploaded.url]);
                      }}
                    />
                    <Button 
                      variant="outline" 
                      nativeButton={false}
                      render={
                        <label htmlFor="action-req-upload" className="cursor-pointer flex items-center justify-center gap-2">
                          {isActionUploadingRequest ? <RefreshCw className="w-5 h-5 animate-spin text-blue-600" /> : <Paperclip className="w-5 h-5 text-slate-400" />}
                        </label>
                      }
                      className="h-12 w-12 rounded-2xl p-0 border-slate-200 bg-white hover:bg-slate-50 shadow-sm"
                    />
                  </div>

                  {user?.uid === selectedRequest?.receiverId && selectedRequest?.status === 'pending' && (
                    <div className="flex-1 flex gap-2">
                      <Button 
                        variant="ghost"
                        onClick={() => handleRequestAction('reject')}
                        className="flex-1 h-12 font-black text-red-600 hover:bg-red-50 rounded-2xl"
                      >
                        <UserX className="w-4 h-4 mr-2" />
                        {t('reject')}
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => handleRequestAction('request_clarification')}
                        className="flex-1 h-12 font-black text-orange-600 border-orange-200 hover:bg-orange-50 rounded-2xl"
                      >
                        <AlertCircle className="w-4 h-4 mr-2" />
                        {t('clarification')}
                      </Button>
                      <Button 
                        onClick={() => handleRequestAction('approve')}
                        className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-600/20"
                      >
                        <UserCheck className="w-4 h-4 mr-2" />
                        {t('approve')}
                      </Button>
                    </div>
                  )}

                  {user?.uid === selectedRequest?.senderId && selectedRequest?.status === 'clarification_needed' && (
                    <Button 
                      onClick={() => handleRequestAction('respond_clarification')}
                      className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-600/20"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {t('respond')}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <Button onClick={() => setIsManageRequestDialogOpen(false)} className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl shadow-lg">
                {t('close')}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Evidence Confirmation Dialog */}
      <Dialog open={isDeleteEvidenceConfirmOpen} onOpenChange={setIsDeleteEvidenceConfirmOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl border-none shadow-2xl p-0" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="h-1.5 bg-rose-600" />
          <div className="p-8 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight text-rose-600 flex items-center gap-2">
                <AlertCircle className="w-6 h-6" />
                {t('confirm_delete')}
              </DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <p className="text-slate-600 font-medium leading-relaxed">
                {isRtl ? 'هل أنت متأكد من رغبتك في حذف ملف الشاهد هذا؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete this evidence file? This action cannot be undone.'}
              </p>
            </div>
            <DialogFooter className="gap-3 sm:justify-between pt-4">
              <Button variant="ghost" onClick={() => setIsDeleteEvidenceConfirmOpen(false)} className="flex-1 h-12 font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600">
                {isRtl ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button onClick={confirmDeleteEvidence} className="flex-1 h-12 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg shadow-rose-600/10">
                {t('delete')}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  MoreVertical, 
  Eye, 
  UserPlus, 
  CheckCircle2, 
  X,
  Plus,
  AlertTriangle,
  History,
  Mail,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Inbox,
  Clock,
  LayoutGrid,
  List as ListIcon,
  Star,
  FileText,
  Paperclip,
  MessageSquare,
  Shield
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { mockService } from '@/services/mockService';
import { filesApi, resolveFileUrl } from '@/services/filesApi';
import { incidentFeedbackApi } from '@/services/incidentFeedbackApi';
import { incidentNotesApi } from '@/services/incidentNotesApi';
import { incidentsApi } from '@/services/incidentsApi';
import { lookupOptionsApi } from '@/services/lookupOptionsApi';
import { usersApi } from '@/services/usersApi';
import { SecurityIncident, User, IncidentFeedback, IncidentNote, LookupOption } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const IncidentsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [feedbackList, setFeedbackList] = useState<IncidentFeedback[]>([]);
  const [lookupOptions, setLookupOptions] = useState<LookupOption[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  
  const [selectedIncident, setSelectedIncident] = useState<SecurityIncident | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [incidentNotes, setIncidentNotes] = useState<IncidentNote[]>([]);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState('');
  
  // New Incident Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [newType, setNewType] = useState('other');
  const [newAssignee, setNewAssignee] = useState('');
  const [newAttachments, setNewAttachments] = useState<string[]>([]);
  const [isNewUploading, setIsNewUploading] = useState(false);

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    try {
      const [incidentsData, usersData, feedbackData, lookupOptionsData] = await Promise.all([
        incidentsApi.getIncidents(),
        usersApi.getUsers(),
        incidentFeedbackApi.getIncidentFeedback(),
        lookupOptionsApi.getLookupOptions(),
      ]);
      setIncidents(incidentsData);
      setUsers(usersData);
      setFeedbackList(feedbackData);
      setLookupOptions(lookupOptionsData);
    } catch (error) {
      console.error('Failed to load incidents data', error);
      toast.error(t('failed_to_load_data') || 'Failed to load data');
    }
  };

  const refreshData = async () => {
    try {
      const [incidentsData, feedbackData] = await Promise.all([
        incidentsApi.getIncidents(),
        incidentFeedbackApi.getIncidentFeedback(),
      ]);
      setIncidents(incidentsData);
      setFeedbackList(feedbackData);
    } catch (error) {
      console.error('Failed to refresh incidents data', error);
      toast.error(t('failed_to_load_data') || 'Failed to load data');
    }
  };

  const handleAssign = async () => {
    if (!selectedIncident || !assignUserId) return;
    
    const updated: SecurityIncident = {
      ...selectedIncident,
      assignedTo: assignUserId,
      status: 'open',
      updatedAt: new Date().toISOString()
    };
    
    await incidentsApi.updateIncident(updated.id, updated);
    
    // Add Notification if enabled
    const settings = mockService.getNotificationSettings();
    if (settings.notifyOnAssignment) {
      mockService.addNotification({
        userId: assignUserId,
        titleAr: 'إسناد بلاغ جديد',
        titleEn: 'New Incident Assigned',
        messageAr: `تم إسناد البلاغ: ${selectedIncident.title}`,
        messageEn: `Incident assigned to you: ${selectedIncident.title}`,
        type: 'incident_assignment',
        link: '/tasks'
      });
    }

    toast.success(isRtl ? 'تم إسناد البلاغ بنجاح' : 'Incident assigned successfully');
    setIsAssignOpen(false);
    await refreshData();
  };

  const handleCreateIncident = async () => {
    if (!newTitle || !newDescription) {
      toast.error(isRtl ? 'يرجى إكمال البيانات الأساسية' : 'Please complete basic fields');
      return;
    }

    const newInc: SecurityIncident = {
      id: `INC-${Math.floor(Math.random() * 9000) + 1000}`,
      title: newTitle,
      description: newDescription,
      priority: newPriority as any,
      type: newType,
      status: newAssignee ? 'open' : 'new',
      reporterEmail: 'admin@system.com',
      assignedTo: newAssignee || undefined,
      reportedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachments: newAttachments
    };

    await incidentsApi.createIncident(newInc);
    
    // Add an initial note if it was assigned
    if (newAssignee) {
      const assigneeUser = users.find(u => u.uid === newAssignee);
      const note: IncidentNote = {
        id: Math.random().toString(36).substr(2, 9),
        incidentId: newInc.id,
        authorId: 'admin',
        authorName: 'System Admin',
        content: isRtl 
          ? `تم إنشاء البلاغ وإسناده إلى ${assigneeUser?.displayName || newAssignee}` 
          : `Incident created and assigned to ${assigneeUser?.displayName || newAssignee}`,
        createdAt: new Date().toISOString(),
        attachments: []
      };
      await incidentNotesApi.createIncidentNote(note);

      // Add Notification if enabled
      const settings = mockService.getNotificationSettings();
      if (settings.notifyOnAssignment && newAssignee !== 'none') {
        mockService.addNotification({
          userId: newAssignee,
          titleAr: 'إسناد بلاغ جديد',
          titleEn: 'New Incident Assigned',
          messageAr: `تم إسناد بلاغ جديد لك: ${newTitle}`,
          messageEn: `A new incident has been assigned to you: ${newTitle}`,
          type: 'incident_assignment',
          link: '/tasks'
        });
      }
    }

    toast.success(isRtl ? 'تم إنشاء البلاغ بنجاح' : 'Incident created successfully');
    setIsCreateOpen(false);
    
    // Reset form
    setNewTitle('');
    setNewDescription('');
    setNewPriority('medium');
    setNewType('other');
    setNewAssignee('');
    setNewAttachments([]);
    
    await refreshData();
  };

  const handleViewHistory = async (incident: SecurityIncident) => {
    setSelectedIncident(incident);
    const notes = await incidentNotesApi.getIncidentNotes();
    setIncidentNotes(notes.filter(note => note.incidentId === incident.id));
    setIsHistoryOpen(true);
  };

  const handleViewAttachment = async (value: string) => {
    try {
      await filesApi.openFile(value);
    } catch (error) {
      console.error('Failed to open incident attachment', error);
      setPreviewFile(value);
      setIsPreviewOpen(true);
    }
  };

  const attachmentLabel = (value: string) => {
    if (!value) return '';
    if (value.startsWith('/uploads/') || value.startsWith('/api/files/') || /^https?:\/\//i.test(value)) {
      const parts = value.split('/');
      return parts[parts.length - 1].replace(/^\d+-[a-f0-9]+-/, '');
    }
    return value;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'low': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'open': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'investigating': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'resolved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'closed': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new': return isRtl ? 'جديد' : 'New';
      case 'open': return isRtl ? 'مفتوح' : 'Open';
      case 'investigating': return isRtl ? 'قيد التحقيق' : 'Investigating';
      case 'resolved': return isRtl ? 'تم الحل' : 'Resolved';
      case 'closed': return isRtl ? 'مغلق' : 'Closed';
      default: return status;
    }
  };

  const filteredIncidents = incidents.filter(i => {
    const matchesSearch = (i.id + i.title + i.reporterEmail).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || i.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || i.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getAssignedUserName = (uid?: string) => {
    if (!uid) return '---';
    const user = users.find(u => u.uid === uid);
    return user ? user.displayName : uid;
  };

  const stats = {
    total: incidents.length,
    new: incidents.filter(i => i.status === 'new').length,
    open: incidents.filter(i => i.status === 'open' || i.status === 'investigating').length,
    closed: incidents.filter(i => i.status === 'closed').length
  };

  return (
    <div className="p-6 space-y-8 max-w-[1600px] mx-auto" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-red-600" />
            {isRtl ? 'البلاغات الأمنية' : 'Security Incidents'}
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            {isRtl ? 'إدارة ومتابعة البلاغات الأمنية المستلمة من النظام والجمهور' : 'Manage and monitor security incidents received from the system and public'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsFeedbackOpen(true)}
            className="border-slate-200 font-bold gap-2 text-slate-600 hover:bg-slate-50"
          >
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            {isRtl ? 'عرض التقييمات' : 'View Feedback'}
          </Button>
          <Button 
            onClick={() => setIsCreateOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-bold gap-2 shadow-lg shadow-red-100 px-6"
          >
            <Plus className="w-4 h-4" />
            {isRtl ? 'إنشاء بلاغ جديد' : 'New Incident'}
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: isRtl ? 'إجمالي البلاغات' : 'Total Incidents', value: stats.total, icon: ShieldAlert, color: 'text-slate-600', bg: 'bg-slate-50', trend: '+12%' },
          { label: isRtl ? 'بلاغات جديدة' : 'New Incidents', value: stats.new, icon: Inbox, color: 'text-indigo-600', bg: 'bg-indigo-50', trend: 'Critical' },
          { label: isRtl ? 'قيد المعالجة' : 'In Transit', value: stats.open, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', trend: 'Active' },
          { label: isRtl ? 'بلاغات مغلقة' : 'Closed', value: stats.closed, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: 'Completed' }
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-sm overflow-hidden group">
            <CardContent className="p-0">
              <div className="p-5 flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{stat.value}</h3>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-wider">{stat.trend}</span>
                  </div>
                </div>
                <div className={cn("p-3 rounded-2xl transition-transform group-hover:scale-110 duration-300", stat.bg)}>
                  <stat.icon className={cn("w-6 h-6", stat.color)} />
                </div>
              </div>
              <div className="h-1 w-full bg-slate-50 relative overflow-hidden">
                <div 
                  className={cn("absolute inset-0 h-full", stat.color.replace('text', 'bg'))} 
                  style={{ width: `${(stat.value / (stats.total || 1)) * 100}%` }} 
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters & Actions */}
      <Card className="border-none shadow-sm overflow-visible">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-80">
                <Search className={cn("absolute top-3 w-4 h-4 text-slate-400", isRtl ? "right-3" : "left-3")} />
                <Input 
                  placeholder={isRtl ? 'البحث بالرقم، العنوان، أو البريد...' : 'Search by ID, title, or email...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={cn("h-11 border-slate-200 bg-slate-50/50", isRtl ? "pr-10" : "pl-10")}
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px] h-11 border-slate-200 font-bold bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <SelectValue placeholder={t('status')}>
                      {statusFilter === 'all' ? t('all_statuses') : getStatusLabel(statusFilter)}
                    </SelectValue>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all_statuses')}</SelectItem>
                  <SelectItem value="new">{t('new')}</SelectItem>
                  <SelectItem value="open">{t('open')}</SelectItem>
                  <SelectItem value="investigating">{t('investigating')}</SelectItem>
                  <SelectItem value="resolved">{t('resolved')}</SelectItem>
                  <SelectItem value="closed">{t('closed')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[150px] h-11 border-slate-200 font-bold bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
                    <SelectValue placeholder={t('priority')}>
                      {priorityFilter === 'all' 
                        ? t('all_priorities')
                        : t(priorityFilter)
                      }
                    </SelectValue>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all_priorities')}</SelectItem>
                  <SelectItem value="critical">{t('critical')}</SelectItem>
                  <SelectItem value="high">{t('high')}</SelectItem>
                  <SelectItem value="medium">{t('medium')}</SelectItem>
                  <SelectItem value="low">{t('low')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-full md:w-auto">
              <Button 
                variant={viewMode === 'table' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setViewMode('table')}
                className="flex-1 md:flex-none font-bold gap-2 rounded-lg"
              >
                <ListIcon className="w-4 h-4" />
                {t('table')}
              </Button>
              <Button 
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setViewMode('grid')}
                className="flex-1 md:flex-none font-bold gap-2 rounded-lg"
              >
                <LayoutGrid className="w-4 h-4" />
                {t('grid')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Incidents Content */}
      <AnimatePresence mode="wait">
        {viewMode === 'table' ? (
          <motion.div
            key="table"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="border-none shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-[100px] font-black uppercase tracking-widest text-[11px] h-14">{t('incident_id')}</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[11px] h-14">{t('title_reporter')}</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[11px] h-14 text-center">{t('priority')}</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[11px] h-14 text-center">{t('status')}</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[11px] h-14">{t('assigned_to')}</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[11px] h-14">{t('reported_at')}</TableHead>
                    <TableHead className="w-[80px] h-14"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIncidents.length > 0 ? (
                    filteredIncidents.map((incident) => (
                      <TableRow key={incident.id} className="group hover:bg-slate-50/50 transition-colors border-slate-100">
                        <TableCell className="font-mono font-black text-slate-400 group-hover:text-red-500 transition-colors">
                          {incident.id}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-700 leading-tight">{incident.title}</span>
                            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3" />
                              {incident.reporterEmail}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn(
                            "px-2 py-1 rounded-lg text-[11px] font-bold border uppercase tracking-wider",
                            getPriorityColor(incident.priority)
                          )}>
                            {incident.priority}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn(
                            "px-2 py-1 rounded-lg text-[11px] font-bold border uppercase tracking-wider",
                            getStatusColor(incident.status)
                          )}>
                            {getStatusLabel(incident.status)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200">
                              <UserPlus className="w-3 h-3 text-slate-400" />
                            </div>
                            <span className="text-[13px] font-bold text-slate-600">
                              {getAssignedUserName(incident.assignedTo)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-400 text-[12px] font-medium">
                          {format(new Date(incident.reportedAt), 'yyyy/MM/dd HH:mm')}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900 transition-colors">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              }
                            />
                            <DropdownMenuContent align={isRtl ? 'end' : 'start'} className="w-48 font-bold p-1">
                              <DropdownMenuItem onClick={() => { setSelectedIncident(incident); setIsDetailsOpen(true); }} className="gap-2 cursor-pointer focus:bg-slate-100 rounded-lg">
                                <Eye className="w-4 h-4 text-blue-500" />
                                {isRtl ? 'عرض التفاصيل' : 'View Details'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setSelectedIncident(incident); setIsAssignOpen(true); }} className="gap-2 cursor-pointer focus:bg-slate-100 rounded-lg">
                                <UserPlus className="w-4 h-4 text-indigo-500" />
                                {isRtl ? 'إسناد البلاغ' : 'Assign Incident'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleViewHistory(incident)} className="gap-2 cursor-pointer focus:bg-slate-100 rounded-lg">
                                <History className="w-4 h-4 text-slate-500" />
                                {isRtl ? 'سجل الإجراءات' : 'Action History'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3 opacity-20">
                          <ShieldAlert className="w-16 h-16" />
                          <p className="font-black text-xl uppercase tracking-widest">{isRtl ? 'لا توجد بلاغات حالياً' : 'No Incidents Found'}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredIncidents.map((incident) => (
              <Card key={incident.id} className="border-none shadow-sm group hover:shadow-xl transition-all duration-300 relative overflow-hidden bg-white/80 backdrop-blur-sm">
                <div className={cn("absolute top-0 right-0 w-24 h-24 blur-3xl opacity-10", getStatusColor(incident.status).replace('bg-', 'bg-'))} />
                <CardHeader className="p-5 pb-2">
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-mono font-black text-[11px] text-slate-300 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100 group-hover:text-red-500 group-hover:border-red-100 transition-all">
                      {incident.id}
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-lg text-[9px] font-black border uppercase tracking-wider",
                      getPriorityColor(incident.priority)
                    )}>
                      {incident.priority}
                    </span>
                  </div>
                  <CardTitle className="text-base font-black text-slate-800 leading-tight min-h-[40px] tracking-tight group-hover:text-red-600 transition-colors">
                    {incident.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0 space-y-4">
                  <p className="text-xs text-slate-400 font-medium line-clamp-2 min-h-[32px]">
                    {incident.description}
                  </p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex -space-x-2 rtl:space-x-reverse">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-400">
                        <UserPlus className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {format(new Date(incident.reportedAt), 'yyyy/MM/dd')}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 h-9 rounded-xl font-bold text-xs border-slate-100 hover:bg-slate-50 gap-2"
                      onClick={() => { setSelectedIncident(incident); setIsDetailsOpen(true); }}
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-500" />
                      {isRtl ? 'عرض' : 'View'}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-9 w-10 px-0 rounded-xl font-bold text-xs border-slate-100 hover:bg-slate-50 flex items-center justify-center transition-colors hover:text-slate-900"
                      onClick={() => handleViewHistory(incident)}
                    >
                      <History className="w-3.5 h-3.5" />
                    </Button>
                    <Button 
                      className="flex-1 h-9 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 gap-2"
                      onClick={() => { setSelectedIncident(incident); setIsAssignOpen(true); }}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      {isRtl ? 'إسناد' : 'Assign'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-xl border-none shadow-2xl p-0 overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
          {selectedIncident && (
            <>
              <div className="h-1.5 bg-gradient-to-r from-red-600 via-red-400 to-red-600" />
              <div className="p-8 space-y-8">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-sm text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100 uppercase tracking-widest">{selectedIncident.id}</span>
                      <span className={cn("px-2 py-1 rounded-lg text-[10px] font-black border uppercase tracking-wider", getStatusColor(selectedIncident.status))}>
                        {getStatusLabel(selectedIncident.status)}
                      </span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-2">{selectedIncident.title}</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{isRtl ? 'تاريخ البلاغ' : 'Reported At'}</p>
                    <p className="font-bold text-slate-700">{format(new Date(selectedIncident.reportedAt), 'yyyy/MM/dd HH:mm')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      {isRtl ? 'المخبر' : 'Reporter'}
                    </p>
                    <p className="font-bold text-slate-900 truncate">{selectedIncident.reporterEmail}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {isRtl ? 'الأولوية' : 'Priority'}
                    </p>
                    <div className="flex items-center gap-2">
                       <div className={cn("w-2 h-2 rounded-full", selectedIncident.priority === 'critical' ? 'bg-red-500 pulse' : 'bg-orange-500')} />
                       <p className="font-black text-slate-900 uppercase tracking-wider">{selectedIncident.priority}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                   <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2">
                     <ShieldAlert className="w-3.5 h-3.5" />
                     {isRtl ? 'وصف الحادث' : 'Incident Description'}
                   </h4>
                   <div className="p-6 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                     <p className="text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">{selectedIncident.description}</p>
                   </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center border border-indigo-200">
                      <UserPlus className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{isRtl ? 'المسؤول الحالي' : 'Current Assignee'}</p>
                      <p className="font-bold text-indigo-900">{getAssignedUserName(selectedIncident.assignedTo)}</p>
                    </div>
                  </div>
                  {(!selectedIncident.assignedTo || selectedIncident.status === 'new') && (
                    <Button onClick={() => { setIsDetailsOpen(false); setIsAssignOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 font-bold rounded-xl h-10 px-6">
                      {isRtl ? 'إسناد المهمة' : 'Assign Task'}
                    </Button>
                  )}
                </div>

                <DialogFooter className="pt-4 mt-0">
                  <Button variant="outline" onClick={() => setIsDetailsOpen(false)} className="w-full h-12 rounded-xl font-bold border-slate-200 hover:bg-slate-50">
                    {isRtl ? 'إغلاق' : 'Close'}
                  </Button>
                </DialogFooter>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="max-w-md bg-white border-none shadow-2xl p-0" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="h-1.5 bg-indigo-600" />
          <div className="p-8 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">
                {isRtl ? 'إسناد البلاغ للمختص' : 'Assign Incident'}
              </DialogTitle>
              <DialogDescription className="font-medium text-slate-500">
                {isRtl ? 'اختر المستخدم الذي سيتولى التحقيق في هذا البلاغ ومعالجته.' : 'Select the user who will handle investigation and resolution.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'رقم البلاغ' : 'Incident ID'}</p>
                <p className="font-mono font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded w-fit">{selectedIncident?.id}</p>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'اختر المستخدم' : 'Select User'}</p>
                <Select value={assignUserId} onValueChange={setAssignUserId}>
                  <SelectTrigger className="h-12 border-slate-200 bg-slate-50/50 font-bold">
                    <SelectValue>
                      {assignUserId 
                        ? (users.find(u => u.uid === assignUserId)?.displayName || assignUserId)
                        : (isRtl ? 'ابحث عن مستخدم...' : 'Search for a user...')}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="font-bold">
                    {users.map(u => (
                      <SelectItem key={u.uid} value={u.uid}>
                        <div className="flex items-center gap-2 py-1">
                          <img src={resolveFileUrl(u.photoURL || '') || u.photoURL} alt="" className="w-5 h-5 rounded-full" />
                          <span>{u.displayName}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-6 sm:justify-between gap-3">
              <Button variant="ghost" onClick={() => setIsAssignOpen(false)} className="flex-1 h-12 font-bold rounded-xl">{isRtl ? 'إلغاء' : 'Cancel'}</Button>
              <Button 
                onClick={handleAssign} 
                disabled={!assignUserId}
                className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/10"
              >
                {isRtl ? 'تأكيد الإسناد' : 'Confirm Assignment'}
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

      {/* History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-2xl bg-white border-none shadow-2xl p-0 h-[80vh] flex flex-col" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="h-1.5 bg-slate-900" />
          <div className="p-8 space-y-6 overflow-y-auto flex-1">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                <Shield className="w-6 h-6 text-red-500" />
                {isRtl ? 'سجل الإجراءات والتحديثات' : 'Action History & Updates'}
              </DialogTitle>
              <DialogDescription className="font-bold text-red-600 font-mono">
                #{selectedIncident?.id}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Incident Context */}
              <div className="bg-slate-50 p-4 rounded-xl space-y-2">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">{isRtl ? 'تفاصيل البلاغ الأصلية' : 'Original Incident Details'}</h4>
                <p className="text-sm font-bold text-slate-700">{selectedIncident?.title}</p>
                <p className="text-xs text-slate-500 line-clamp-2 italic">{selectedIncident?.description}</p>
                {selectedIncident?.attachments && selectedIncident.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedIncident.attachments.map((file, idx) => (
                      <button 
                        key={idx} 
                        onClick={() => handleViewAttachment(file)}
                        className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-[10px] font-bold border border-blue-100 hover:bg-blue-100 transition-colors"
                      >
                        <Paperclip className="w-2.5 h-2.5" />
                        {attachmentLabel(file)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* History Timeline */}
              <div className="space-y-4">
                <h4 className="text-sm font-black text-slate-900 border-b pb-2 flex items-center justify-between">
                  <span>{isRtl ? 'سجل التحديثات' : 'Updates History'}</span>
                  <Badge variant="outline" className="text-[10px]">{incidentNotes.length}</Badge>
                </h4>
                
                {incidentNotes.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs italic bg-slate-50/50 rounded-xl border border-dashed">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    {isRtl ? 'لا توجد إجراءات مسجلة بعد' : 'No action history recorded yet'}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {incidentNotes.map((note) => (
                      <div key={note.id} className="relative border-r-2 border-slate-100 pr-4 rtl:border-r-0 rtl:border-l-2 rtl:pl-4 py-1">
                        <div className="absolute -right-1.5 top-2 w-3 h-3 rounded-full bg-slate-200 rtl:-right-auto rtl:-left-1.5" />
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-black text-slate-900">{note.authorName}</span>
                          <span className="text-[10px] text-slate-400 font-mono italic">{format(new Date(note.createdAt), 'yyyy/MM/dd HH:mm')}</span>
                        </div>
                        <p className="text-sm text-slate-600 bg-white p-3 rounded-lg border border-slate-100 shadow-sm leading-relaxed">
                          {note.content}
                        </p>
                        {note.attachments && note.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {note.attachments.map((file, idx) => (
                              <button 
                                key={idx} 
                                onClick={() => handleViewAttachment(file)}
                                className="flex items-center gap-1.5 bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold border border-slate-200 hover:bg-slate-200 transition-colors"
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
            <Button onClick={() => setIsHistoryOpen(false)} className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg">
              {isRtl ? 'إغلاق السجل' : 'Close History'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Incident Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl bg-white border-none shadow-2xl p-0 overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="bg-slate-900 border-b border-slate-800 p-8">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                {isRtl ? 'تقديم بلاغ جديد' : 'Report New Incident'}
              </DialogTitle>
              <DialogDescription className="text-slate-400 font-medium mt-1">
                {isRtl ? 'أدخل تفاصيل البلاغ الأمني وقم بإسناده فوراً إذا لزم الأمر' : 'Enter security incident details and assign it immediately if needed'}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto bg-slate-50/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase text-slate-400 tracking-widest">{isRtl ? 'عنوان البلاغ' : 'Incident Title'} <span className="text-red-500">*</span></Label>
                <Input 
                  value={newTitle} 
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={isRtl ? 'مثال: محاولة دخول غير مصرح بها' : 'e.g. Unauthorized access attempt'}
                  className="bg-white border-slate-200 h-12 font-bold"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase text-slate-400 tracking-widest">{isRtl ? 'تصنيف البلاغ' : 'Category'}</Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger className="h-12 bg-white border-slate-200 font-bold">
                    <SelectValue>
                      {isRtl 
                        ? { access_control: 'التحكم بالوصول', malware: 'برمجيات خبيثة', data_breach: 'تسريب بيانات', phishing: 'اصطياد إلكتروني', hardware: 'أعطال أجهزة', other: 'أخرى' }[newType as any] || newType
                        : { access_control: 'Access Control', malware: 'Malware', data_breach: 'Data Breach', phishing: 'Phishing', hardware: 'Hardware Failure', other: 'Other' }[newType as any] || newType
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {lookupOptions.filter(o => o.category === 'incident_type' && o.isActive).map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {isRtl ? option.labelAr : option.labelEn}
                      </SelectItem>
                    ))}
                    <SelectItem value="other">{isRtl ? 'أخرى' : 'Other'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase text-slate-400 tracking-widest">{isRtl ? 'الأولوية' : 'Priority'}</Label>
                <div className="grid grid-cols-4 gap-2">
                  {['low', 'medium', 'high', 'critical'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setNewPriority(p)}
                      className={cn(
                        "h-10 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border",
                        newPriority === p 
                          ? p === 'critical' ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-200' :
                            p === 'high' ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-200' :
                            p === 'medium' ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' :
                            'bg-slate-700 border-slate-700 text-white shadow-lg shadow-slate-200'
                          : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase text-slate-400 tracking-widest">{isRtl ? 'إسناد إلى' : 'Assign To'}</Label>
                <Select value={newAssignee} onValueChange={setNewAssignee}>
                  <SelectTrigger className="h-12 bg-white border-slate-200 font-bold">
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-slate-400" />
                      <SelectValue>
                        {newAssignee === 'none' || !newAssignee 
                          ? (isRtl ? 'غير محدد' : 'Unassigned')
                          : (users.find(u => u.uid === newAssignee)?.displayName || newAssignee)}
                      </SelectValue>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{isRtl ? 'غير محدد' : 'Unassigned'}</SelectItem>
                    {users.map(u => (
                      <SelectItem key={u.uid} value={u.uid}>{u.displayName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase text-slate-400 tracking-widest">{isRtl ? 'وصف البلاغ' : 'Incident Description'} <span className="text-red-500">*</span></Label>
              <Textarea 
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder={isRtl ? 'اشرح تفاصيل ما حدث...' : 'Describe what happened in detail...'}
                className="min-h-[120px] bg-white border-slate-200 font-medium resize-none"
              />
            </div>

            <div className="space-y-3">
               <Label className="text-[11px] font-black uppercase text-slate-400 tracking-widest">{isRtl ? 'المرفقات' : 'Attachments'}</Label>
               <div className="flex flex-wrap gap-3">
                 {newAttachments.map((file, idx) => (
                   <div key={idx} className="flex items-center gap-2 bg-white border border-slate-200 pl-3 pr-1 py-1 rounded-xl shadow-sm">
                     <span className="text-xs font-bold text-slate-600">{attachmentLabel(file)}</span>
                     <Button 
                       variant="ghost" 
                       size="icon" 
                       className="h-6 w-6 text-red-500 hover:bg-red-50"
                       onClick={() => setNewAttachments(prev => prev.filter((_, i) => i !== idx))}
                     >
                       <X className="w-3.5 h-3.5" />
                     </Button>
                   </div>
                 ))}
                 <label className={cn(
                   "border-dashed border-2 h-10 border-slate-300 text-slate-400 hover:text-slate-600 hover:border-slate-400 font-bold bg-white inline-flex items-center gap-2 px-4 rounded-md cursor-pointer text-sm",
                   isNewUploading && "opacity-60 pointer-events-none"
                 )}>
                   {isNewUploading ? <Clock className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                   {isRtl ? 'إضافة ملف' : 'Add File'}
                   <input
                     type="file"
                     className="hidden"
                     onChange={async (e) => {
                       const file = e.target.files?.[0];
                       if (!file) return;
                       setIsNewUploading(true);
                       const uploaded = await filesApi.uploadFile(file).catch((error: any) => {
                         console.error('Failed to upload incident attachment', error);
                         return null;
                       });
                       setIsNewUploading(false);
                       e.target.value = '';
                       if (!uploaded) { toast.error(isRtl ? 'فشل رفع الملف' : 'Upload failed'); return; }
                       setNewAttachments(prev => [...prev, uploaded.url]);
                     }}
                   />
                 </label>
               </div>
            </div>
          </div>

          <DialogFooter className="p-8 bg-white border-t border-slate-100 gap-3">
            <Button 
              variant="ghost" 
              onClick={() => setIsCreateOpen(false)}
              className="font-bold text-slate-500 h-12 px-8"
            >
              {isRtl ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button 
              onClick={handleCreateIncident}
              className="bg-slate-900 hover:bg-slate-800 text-white font-black h-12 shadow-xl shadow-slate-200 px-12 rounded-xl"
            >
              {isRtl ? 'إرسال البلاغ' : 'Submit Incident'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
        <DialogContent className="max-w-3xl bg-white border-none shadow-2xl p-0 overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="bg-slate-900 p-8">
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
              <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
              {isRtl ? 'تقييمات المبلغين' : 'Reporter Feedback'}
            </h2>
            <p className="text-slate-400 font-medium text-sm mt-1">
              {isRtl ? 'الآراء والتقييمات المستلمة من المبلغين بعد إغلاق بلاغاتهم' : 'Opinions and ratings received from reporters after closing their incidents'}
            </p>
          </div>

          <CardContent className="p-8 max-h-[60vh] overflow-y-auto">
            {feedbackList.length > 0 ? (
              <div className="space-y-4">
                {feedbackList.map((feedback) => {
                  const incident = incidents.find(i => i.id === feedback.incidentId);
                  return (
                    <div key={feedback.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50/10 transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                             {feedback.incidentId}
                          </span>
                          <span className="text-xs font-bold text-slate-600">{incident?.title}</span>
                        </div>
                        <div className="flex items-center gap-0.5 text-amber-500">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className={cn("w-3.5 h-3.5", s <= feedback.rating ? "fill-current" : "opacity-20")} />
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-slate-700 font-medium leading-relaxed italic">"{feedback.comment}"</p>
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'بواسطة' : 'By'}: {incident?.reporterEmail}</span>
                          <span className="text-[10px] font-bold text-slate-400">{format(new Date(feedback.submittedAt), 'yyyy/MM/dd')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 opacity-20 space-y-4">
                 <Star className="w-16 h-16 mx-auto" />
                 <p className="font-black text-xl uppercase tracking-widest">{isRtl ? 'لا توجد تقييمات حالياً' : 'No Feedback Yet'}</p>
              </div>
            )}
          </CardContent>

          <DialogFooter className="p-8 pt-4 border-t border-slate-100 bg-slate-50/50">
            <Button onClick={() => setIsFeedbackOpen(false)} className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl">
              {isRtl ? 'العودة للقائمة' : 'Back to List'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IncidentsPage;

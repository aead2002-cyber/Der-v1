import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { mockService } from '../services/mockService';
import { NotificationLog, User } from '../types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Search, Filter, RefreshCcw, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<NotificationLog[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const isRtl = i18n.language === 'ar';

  useEffect(() => {
    const data = mockService.getNotificationLogs();
    setLogs(data);
    setUsers(mockService.getUsers());
  }, []);

  useEffect(() => {
    let result = [...logs];

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(log => 
        log.subject.toLowerCase().includes(lowerSearch) || 
        log.body.toLowerCase().includes(lowerSearch) ||
        log.recipientName.toLowerCase().includes(lowerSearch) ||
        log.recipientEmail.toLowerCase().includes(lowerSearch)
      );
    }

    if (typeFilter !== 'all') {
      result = result.filter(log => log.type === typeFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter(log => log.status === statusFilter);
    }

    if (userFilter !== 'all') {
      result = result.filter(log => log.recipientId === userFilter);
    }

    if (dateFrom) {
      result = result.filter(log => new Date(log.sentAt) >= new Date(dateFrom));
    }

    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      result = result.filter(log => new Date(log.sentAt) <= endOfDay);
    }

    setFilteredLogs(result);
  }, [logs, searchTerm, typeFilter, statusFilter, userFilter, dateFrom, dateTo]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 gap-1"><CheckCircle2 className="w-3 h-3" /> {isRtl ? 'تم الإرسال' : 'Sent'}</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" /> {isRtl ? 'فشل' : 'Failed'}</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="gap-1 bg-amber-500 text-white hover:bg-amber-600"><Clock className="w-3 h-3" /> {isRtl ? 'قيد الانتظار' : 'Pending'}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'assignment':
        return isRtl ? 'تكليف بمهمة' : 'Assignment';
      case 'expiry_reminder':
        return isRtl ? 'تذكير بانتهاء الصلاحية' : 'Expiry Reminder';
      case 'overdue_alert':
        return isRtl ? 'تنبيه تأخير' : 'Overdue Alert';
      default:
        return type;
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setStatusFilter('all');
    setUserFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#1e293b] flex items-center gap-2">
            <Bell className="w-8 h-8 text-blue-600" />
            {isRtl ? 'متابعة الإشعارات' : 'Notifications Monitoring'}
          </h2>
          <p className="text-[#64748b] mt-1">
            {isRtl ? 'مراقبة وتتبع جميع الإشعارات المرسلة من النظام' : 'Monitor and track all notifications sent by the system'}
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setLogs(mockService.getNotificationLogs())}
          className="gap-2"
        >
          <RefreshCcw className="w-4 h-4" />
          {isRtl ? 'تحديث' : 'Refresh'}
        </Button>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3 overflow-hidden">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            {isRtl ? 'فلاتر البحث' : 'Search Filters'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{isRtl ? 'بحث عام' : 'General Search'}</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground rtl:left-auto rtl:right-3" />
                <Input
                  placeholder={isRtl ? 'ابحث في الموضوع أو النص...' : 'Search in subject or body...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 rtl:pl-3 rtl:pr-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{isRtl ? 'نوع الإشعار' : 'Notification Type'}</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={isRtl ? 'الكل' : 'All'}>
                    {(() => {
                      const labels: Record<string, { ar: string; en: string }> = {
                        all: { ar: 'الكل', en: 'All' },
                        assignment: { ar: 'تكليف بمهمة', en: 'Assignment' },
                        expiry_reminder: { ar: 'تذكير بانتهاء الصلاحية', en: 'Expiry Reminder' },
                        overdue_alert: { ar: 'تنبيه تأخير', en: 'Overdue Alert' }
                      };
                      return labels[typeFilter] ? (isRtl ? labels[typeFilter].ar : labels[typeFilter].en) : typeFilter;
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRtl ? 'الكل' : 'All'}</SelectItem>
                  <SelectItem value="assignment">{isRtl ? 'تكليف بمهمة' : 'Assignment'}</SelectItem>
                  <SelectItem value="expiry_reminder">{isRtl ? 'تذكير بانتهاء الصلاحية' : 'Expiry Reminder'}</SelectItem>
                  <SelectItem value="overdue_alert">{isRtl ? 'تنبيه تأخير' : 'Overdue Alert'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{isRtl ? 'الحالة' : 'Status'}</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={isRtl ? 'الكل' : 'All'}>
                    {(() => {
                      const labels: Record<string, { ar: string; en: string }> = {
                        all: { ar: 'الكل', en: 'All' },
                        sent: { ar: 'تم الإرسال', en: 'Sent' },
                        failed: { ar: 'فشل', en: 'Failed' },
                        pending: { ar: 'قيد الانتظار', en: 'Pending' }
                      };
                      return labels[statusFilter] ? (isRtl ? labels[statusFilter].ar : labels[statusFilter].en) : statusFilter;
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRtl ? 'الكل' : 'All'}</SelectItem>
                  <SelectItem value="sent">{isRtl ? 'تم الإرسال' : 'Sent'}</SelectItem>
                  <SelectItem value="failed">{isRtl ? 'فشل' : 'Failed'}</SelectItem>
                  <SelectItem value="pending">{isRtl ? 'قيد الانتظار' : 'Pending'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{isRtl ? 'المستلم' : 'Recipient'}</label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={isRtl ? 'الكل' : 'All'}>
                    {userFilter === 'all'
                      ? (isRtl ? 'الكل' : 'All')
                      : (users.find(u => u.uid === userFilter)?.displayName || userFilter)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRtl ? 'الكل' : 'All'}</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.uid} value={user.uid}>{user.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{isRtl ? 'من تاريخ' : 'From Date'}</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{isRtl ? 'إلى تاريخ' : 'To Date'}</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            
            <div className="lg:col-span-2 flex items-end">
              <Button 
                variant="ghost" 
                onClick={clearFilters}
                className="text-[#64748b] hover:text-blue-600"
              >
                {isRtl ? 'إعادة تعيين الفلاتر' : 'Reset Filters'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-[#f8fafc]">
              <TableRow>
                <TableHead className="font-bold">{isRtl ? 'المستلم' : 'Recipient'}</TableHead>
                <TableHead className="font-bold">{isRtl ? 'النوع' : 'Type'}</TableHead>
                <TableHead className="font-bold">{isRtl ? 'الموضوع' : 'Subject'}</TableHead>
                <TableHead className="font-bold">{isRtl ? 'الحالة' : 'Status'}</TableHead>
                <TableHead className="font-bold">{isRtl ? 'تاريخ الإرسال' : 'Sent At'}</TableHead>
                <TableHead className="font-bold">{isRtl ? 'ملاحظات' : 'Notes'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-[#64748b]">
                    {isRtl ? 'لا توجد إشعارات تطابق فلاتر البحث' : 'No notifications match the search filters'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-gray-50 transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-[#1e293b]">{log.recipientName}</span>
                        <span className="text-xs text-[#64748b]">{log.recipientEmail}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{getTypeLabel(log.type)}</span>
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <div className="flex flex-col">
                        <span className="font-medium text-[#1e293b] truncate" title={log.subject}>
                          {log.subject}
                        </span>
                        <span className="text-xs text-[#64748b] truncate" title={log.body}>
                          {log.body}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(log.status)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-[#64748b]">
                        {new Date(log.sentAt).toLocaleString(i18n.language === 'ar' ? 'ar-SA' : 'en-US')}
                      </span>
                    </TableCell>
                    <TableCell>
                      {log.errorMessage && (
                        <span className="text-xs text-rose-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {log.errorMessage}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { notificationsApi } from '@/services/notificationsApi';
import { usersApi } from '@/services/usersApi';
import { Notification, User } from '../types';
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
import { Bell, Search, Filter, RefreshCcw, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const isRtl = i18n.language === 'ar';

  const loadData = async () => {
    try {
      const [notificationRows, userRows] = await Promise.all([
        notificationsApi.getNotifications(),
        usersApi.getUsers(),
      ]);
      setNotifications(notificationRows);
      setUsers(userRows);
    } catch (error) {
      console.error('Failed to load notifications', error);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    let result = [...notifications];

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter((notification) => {
        const recipient = users.find(u => u.uid === notification.userId);
        return (
          notification.titleAr.toLowerCase().includes(lowerSearch) ||
          notification.titleEn.toLowerCase().includes(lowerSearch) ||
          notification.messageAr.toLowerCase().includes(lowerSearch) ||
          notification.messageEn.toLowerCase().includes(lowerSearch) ||
          (recipient?.displayName || '').toLowerCase().includes(lowerSearch) ||
          (recipient?.email || '').toLowerCase().includes(lowerSearch)
        );
      });
    }

    if (typeFilter !== 'all') {
      result = result.filter(notification => notification.type === typeFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter(notification => {
        if (statusFilter === 'read') return notification.isRead;
        if (statusFilter === 'unread') return !notification.isRead;
        return true;
      });
    }

    if (userFilter !== 'all') {
      result = result.filter(notification => notification.userId === userFilter);
    }

    if (dateFrom) {
      result = result.filter(notification => new Date(notification.createdAt) >= new Date(dateFrom));
    }

    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      result = result.filter(notification => new Date(notification.createdAt) <= endOfDay);
    }

    setFilteredNotifications(result);
  }, [notifications, users, searchTerm, typeFilter, statusFilter, userFilter, dateFrom, dateTo]);

  const getStatusBadge = (isRead: boolean) => {
    if (isRead) {
      return <Badge className="bg-emerald-500 hover:bg-emerald-600 gap-1"><CheckCircle2 className="w-3 h-3" /> {isRtl ? 'مقروء' : 'Read'}</Badge>;
    }

    return <Badge variant="secondary" className="gap-1 bg-amber-500 text-white hover:bg-amber-600"><Clock className="w-3 h-3" /> {isRtl ? 'غير مقروء' : 'Unread'}</Badge>;
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'procedure_assignment':
        return isRtl ? 'إسناد إجراء' : 'Procedure Assignment';
      case 'incident_assignment':
        return isRtl ? 'إسناد بلاغ' : 'Incident Assignment';
      case 'expiry_reminder':
        return isRtl ? 'تذكير بانتهاء الصلاحية' : 'Expiry Reminder';
      case 'overdue_alert':
        return isRtl ? 'تنبيه تأخير' : 'Overdue Alert';
      case 'general':
        return isRtl ? 'عام' : 'General';
      case 'security':
        return isRtl ? 'أمني' : 'Security';
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
            {isRtl ? 'مراقبة وتتبع جميع الإشعارات المسجلة في النظام' : 'Monitor and track all notifications recorded in the system'}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => { void loadData(); }}
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
                  placeholder={isRtl ? 'ابحث في العنوان أو النص...' : 'Search in title or message...'}
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
                  <SelectValue placeholder={isRtl ? 'الكل' : 'All'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRtl ? 'الكل' : 'All'}</SelectItem>
                  <SelectItem value="procedure_assignment">{isRtl ? 'إسناد إجراء' : 'Procedure Assignment'}</SelectItem>
                  <SelectItem value="incident_assignment">{isRtl ? 'إسناد بلاغ' : 'Incident Assignment'}</SelectItem>
                  <SelectItem value="expiry_reminder">{isRtl ? 'تذكير بانتهاء الصلاحية' : 'Expiry Reminder'}</SelectItem>
                  <SelectItem value="overdue_alert">{isRtl ? 'تنبيه تأخير' : 'Overdue Alert'}</SelectItem>
                  <SelectItem value="general">{isRtl ? 'عام' : 'General'}</SelectItem>
                  <SelectItem value="security">{isRtl ? 'أمني' : 'Security'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{isRtl ? 'الحالة' : 'Status'}</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={isRtl ? 'الكل' : 'All'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRtl ? 'الكل' : 'All'}</SelectItem>
                  <SelectItem value="read">{isRtl ? 'مقروء' : 'Read'}</SelectItem>
                  <SelectItem value="unread">{isRtl ? 'غير مقروء' : 'Unread'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{isRtl ? 'المستلم' : 'Recipient'}</label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={isRtl ? 'الكل' : 'All'} />
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
                <TableHead className="font-bold">{isRtl ? 'العنوان' : 'Title'}</TableHead>
                <TableHead className="font-bold">{isRtl ? 'الحالة' : 'Status'}</TableHead>
                <TableHead className="font-bold">{isRtl ? 'تاريخ الإنشاء' : 'Created At'}</TableHead>
                <TableHead className="font-bold">{isRtl ? 'الرابط' : 'Link'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNotifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-[#64748b]">
                    {isRtl ? 'لا توجد إشعارات تطابق فلاتر البحث' : 'No notifications match the search filters'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredNotifications.map((notification) => {
                  const recipient = users.find(u => u.uid === notification.userId);
                  return (
                    <TableRow key={notification.id} className="hover:bg-gray-50 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-[#1e293b]">{recipient?.displayName || notification.userId}</span>
                          <span className="text-xs text-[#64748b]">{recipient?.email || ''}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{getTypeLabel(notification.type)}</span>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <div className="flex flex-col">
                          <span className="font-medium text-[#1e293b] truncate" title={isRtl ? notification.titleAr : notification.titleEn}>
                            {isRtl ? notification.titleAr : notification.titleEn}
                          </span>
                          <span className="text-xs text-[#64748b] truncate" title={isRtl ? notification.messageAr : notification.messageEn}>
                            {isRtl ? notification.messageAr : notification.messageEn}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(notification.isRead)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-[#64748b]">
                          {new Date(notification.createdAt).toLocaleString(i18n.language === 'ar' ? 'ar-SA' : 'en-US')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-[#64748b]">{notification.link || '—'}</span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

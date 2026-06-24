import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  History,
  Search,
  Calendar,
  Info,
  Filter,
  X,
  Download,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AuditLog, User } from '@/types';
import { auditLogsApi } from '@/services/auditLogsApi';
import { usersApi } from '@/services/usersApi';
import { frameworksApi } from '@/services/frameworksApi';
import { policiesApi } from '@/services/policiesApi';
import { policyItemsApi } from '@/services/policyItemsApi';
import { standardsApi } from '@/services/standardsApi';
import { standardClassificationsApi } from '@/services/standardClassificationsApi';
import { proceduresApi } from '@/services/proceduresApi';
import { evidenceApi } from '@/services/evidenceApi';
import { commitmentsApi } from '@/services/commitmentsApi';
import { incidentsApi } from '@/services/incidentsApi';
import { risksApi } from '@/services/risksApi';
import { changeRequestsApi } from '@/services/changeRequestsApi';
import { resolveFileUrl } from '@/services/filesApi';
import { EntityLookupData, getEntityDisplayName } from '@/lib/progressHelpers';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const ACTION_STYLES: Record<string, string> = {
  create: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  update: 'bg-blue-50 text-blue-700 border-blue-200',
  delete: 'bg-rose-50 text-rose-700 border-rose-200',
  status_change: 'bg-amber-50 text-amber-700 border-amber-200',
  evidence_add: 'bg-violet-50 text-violet-700 border-violet-200',
  comment_add: 'bg-slate-50 text-slate-700 border-slate-200',
  assignment: 'bg-cyan-50 text-cyan-700 border-cyan-200',
};

const ENTITY_NAME_KEYS = [
  'nameAr',
  'nameEn',
  'titleAr',
  'titleEn',
  'displayName',
  'displayNameEn',
  'email',
  'name',
  'title',
] as const;

const parseMaybeJson = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  const parsed = parseMaybeJson(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }

  return parsed as Record<string, unknown>;
};

const normalizeReadableText = (value: unknown): string | null => {
  if (value == null) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return null;
};

const getReadableNameFromPayload = (payload: unknown): string | null => {
  const record = asRecord(payload);
  if (!record) {
    return null;
  }

  for (const key of ENTITY_NAME_KEYS) {
    const candidate = normalizeReadableText(record[key]);
    if (candidate) {
      return candidate;
    }
  }

  return null;
};

const isFallbackName = (value: string | null | undefined): boolean => {
  if (!value) {
    return true;
  }

  const normalized = value.trim().toLowerCase();
  return (
    normalized === 'unnamed' ||
    normalized === 'بدون اسم' ||
    normalized.startsWith('بدون اسم#') ||
    normalized.startsWith('unnamed#')
  );
};

const formatEntityDisplayName = (name: string | null | undefined, entityId: string): string => {
  const trimmedName = normalizeReadableText(name);
  if (trimmedName && !isFallbackName(trimmedName)) {
    return `${trimmedName} #${entityId}`;
  }

  return entityId;
};

export default function AuditTrailPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const dateLocale = isRtl ? ar : enUS;

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [lookupData, setLookupData] = useState<EntityLookupData>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      const [
        auditLogs,
        loadedUsers,
        frameworks,
        policies,
        policyItems,
        standards,
        standardClassifications,
        procedures,
        evidence,
        commitments,
        incidents,
        risks,
        changeRequests,
      ] = await Promise.all([
        auditLogsApi.getAuditLogs(),
        usersApi.getUsers(),
        frameworksApi.getFrameworks(),
        policiesApi.getPolicies(),
        policyItemsApi.getPolicyItems(),
        standardsApi.getStandards(),
        standardClassificationsApi.getStandardClassifications(),
        proceduresApi.getProcedures(),
        evidenceApi.getEvidence(),
        commitmentsApi.getCommitments(),
        incidentsApi.getIncidents(),
        risksApi.getRisks(),
        changeRequestsApi.getChangeRequests(),
      ]);

      if (!isMounted) return;
      setLogs(auditLogs);
      setUsers(loadedUsers);
      setLookupData({
        frameworks,
        policies,
        policyItems,
        standards,
        standardClassifications,
        procedures,
        evidence,
        users: loadedUsers,
        commitments,
        incidents,
        risks,
        changeRequests,
      });
    };

    loadData().catch(error => {
      console.error('Failed to load audit trail data', error);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Derive option lists from the data itself so they stay accurate.
  const distinctActions = useMemo(() => Array.from(new Set(logs.map(l => l.action))).sort(), [logs]);
  const distinctEntities = useMemo(() => Array.from(new Set(logs.map(l => l.entityType))).sort(), [logs]);
  const distinctUsers = useMemo(() => {
    const map = new Map<string, string>();
    logs.forEach(l => { if (l.userId) map.set(l.userId, l.userName || l.userId); });
    return Array.from(map.entries()).map(([uid, name]) => ({ uid, name }));
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const fromMs = dateFrom ? new Date(dateFrom).getTime() : -Infinity;
    const toMs = dateTo ? new Date(dateTo).getTime() + 86400000 : Infinity;
    return [...logs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .filter(log => {
      if (actionFilter !== 'all' && log.action !== actionFilter) return false;
      if (entityFilter !== 'all' && log.entityType !== entityFilter) return false;
      if (userFilter !== 'all' && log.userId !== userFilter) return false;
      const ts = new Date(log.timestamp).getTime();
      if (ts < fromMs || ts > toMs) return false;
      if (q) {
        const auditName =
          getReadableNameFromPayload((log as unknown as Record<string, unknown>).afterJson) ??
          getReadableNameFromPayload(log.newValue) ??
          getReadableNameFromPayload((log as unknown as Record<string, unknown>).beforeJson) ??
          getReadableNameFromPayload(log.oldValue) ??
          getEntityDisplayName(log.entityType, log.entityId, isRtl, lookupData) ??
          '';
        const blob = `${log.userName} ${log.entityType} ${log.action} ${log.entityId} ${auditName}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [logs, searchTerm, actionFilter, entityFilter, userFilter, dateFrom, dateTo, isRtl, lookupData]);

  const toggleExpanded = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpanded(next);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setActionFilter('all');
    setEntityFilter('all');
    setUserFilter('all');
    setDateFrom('');
    setDateTo('');
  };
  const hasActiveFilters = searchTerm || actionFilter !== 'all' || entityFilter !== 'all' || userFilter !== 'all' || dateFrom || dateTo;

  const exportCsv = () => {
    const rows = [
      ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity ID', 'Entity Name', 'Old Value', 'New Value'],
      ...filteredLogs.map(l => [
        l.timestamp,
        l.userName,
        l.action,
        l.entityType,
        l.entityId,
        formatEntityDisplayName(
          getReadableNameFromPayload((l as unknown as Record<string, unknown>).afterJson) ??
            getReadableNameFromPayload(l.newValue) ??
            getReadableNameFromPayload((l as unknown as Record<string, unknown>).beforeJson) ??
            getReadableNameFromPayload(l.oldValue) ??
            getEntityDisplayName(l.entityType, l.entityId, isRtl, lookupData),
          l.entityId,
        ),
        l.oldValue ? JSON.stringify(l.oldValue) : '',
        l.newValue ? JSON.stringify(l.newValue) : '',
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `audit-trail-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const actionLabel = (action: string) => {
    const map: Record<string, string> = {
      create: isRtl ? 'إضافة' : 'Create',
      update: isRtl ? 'تعديل' : 'Update',
      delete: isRtl ? 'حذف' : 'Delete',
      status_change: isRtl ? 'تغيير حالة' : 'Status Change',
      evidence_add: isRtl ? 'إضافة شاهد' : 'Evidence Add',
      comment_add: isRtl ? 'إضافة تعليق' : 'Comment',
      assignment: isRtl ? 'إسناد' : 'Assignment',
    };
    return map[action] || action;
  };

  const entityLabel = (type: string) => {
    const map: Record<string, string> = {
      framework: isRtl ? 'إطار عمل' : 'Framework',
      policy: isRtl ? 'سياسة' : 'Policy',
      policy_item: isRtl ? 'بند' : 'Policy Item',
      standard: isRtl ? 'معيار' : 'Standard',
      standard_classification: isRtl ? 'تصنيف معيار' : 'Classification',
      procedure: isRtl ? 'إجراء' : 'Procedure',
      evidence: isRtl ? 'شاهد' : 'Evidence',
      user: isRtl ? 'مستخدم' : 'User',
      commitment: isRtl ? 'التزام' : 'Commitment',
      incident: isRtl ? 'بلاغ' : 'Incident',
      risk: isRtl ? 'خطر' : 'Risk',
      comment: isRtl ? 'تعليق' : 'Comment',
    };
    return map[type] || type;
  };

  const userById = useMemo(() => {
    const m = new Map<string, User>();
    users.forEach(u => m.set(u.uid, u));
    return m;
  }, [users]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-primary">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-main">{t('audit_trail')}</h1>
            <p className="text-text-muted mt-0.5 text-[13px]">
              {isRtl
                ? `سجل كامل لجميع العمليات (${filteredLogs.length} من ${logs.length})`
                : `Complete activity log (${filteredLogs.length} of ${logs.length})`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowFilters(v => !v)} className="rounded-lg h-10 px-4 font-bold border-border-subtle">
            <Filter className="w-4 h-4 mr-1.5" />
            {isRtl ? 'فلاتر' : 'Filters'}
            {hasActiveFilters && <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold ml-2">!</span>}
          </Button>
          <Button variant="outline" onClick={exportCsv} className="rounded-lg h-10 px-4 font-bold border-border-subtle">
            <Download className="w-4 h-4 mr-1.5" />
            {isRtl ? 'تصدير CSV' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* Search + filters */}
      <div className="bg-white rounded-2xl border border-border-subtle shadow-sm p-5 space-y-4">
        <div className="relative">
          <Search className={cn('absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400', isRtl ? 'right-3' : 'left-3')} />
          <Input
            className={cn('rounded-lg border-border-subtle bg-slate-50/50 h-11', isRtl ? 'pr-10' : 'pl-10')}
            placeholder={isRtl ? 'ابحث في المستخدم، الكيان، الإجراء، أو الاسم...' : 'Search user, entity, action, or name...'}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-3 border-t border-border-subtle">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{isRtl ? 'الإجراء' : 'Action'}</label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="rounded-lg border-border-subtle h-10"><SelectValue>{actionFilter === 'all' ? (isRtl ? 'الكل' : 'All') : actionLabel(actionFilter)}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRtl ? 'الكل' : 'All'}</SelectItem>
                  {distinctActions.map(a => (<SelectItem key={a} value={a}>{actionLabel(a)}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{isRtl ? 'نوع الكيان' : 'Entity'}</label>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="rounded-lg border-border-subtle h-10"><SelectValue>{entityFilter === 'all' ? (isRtl ? 'الكل' : 'All') : entityLabel(entityFilter)}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRtl ? 'الكل' : 'All'}</SelectItem>
                  {distinctEntities.map(e => (<SelectItem key={e} value={e}>{entityLabel(e)}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{isRtl ? 'المستخدم' : 'User'}</label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="rounded-lg border-border-subtle h-10"><SelectValue>{userFilter === 'all' ? (isRtl ? 'الكل' : 'All') : (distinctUsers.find(u => u.uid === userFilter)?.name || userFilter)}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRtl ? 'الكل' : 'All'}</SelectItem>
                  {distinctUsers.map(u => (<SelectItem key={u.uid} value={u.uid}>{u.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{isRtl ? 'من تاريخ' : 'From'}</label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="rounded-lg border-border-subtle h-10" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{isRtl ? 'إلى تاريخ' : 'To'}</label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="rounded-lg border-border-subtle h-10" />
            </div>
            {hasActiveFilters && (
              <div className="sm:col-span-2 lg:col-span-5 flex justify-end">
                <Button variant="ghost" onClick={clearFilters} className="text-rose-600 hover:bg-rose-50 rounded-lg h-9 px-3 font-bold text-[12px]">
                  <X className="w-3.5 h-3.5 mr-1" />
                  {isRtl ? 'مسح الفلاتر' : 'Clear filters'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Timeline / Table */}
      <div className="bg-white rounded-2xl border border-border-subtle shadow-sm overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-16 text-text-muted">
            <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-bold text-[14px]">{t('no_logs_found') || 'No matching logs'}</p>
          </div>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {filteredLogs.map(log => {
              const u = userById.get(log.userId);
              const initials = (log.userName || '?').trim().split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase();
              const entityName = formatEntityDisplayName(
                getReadableNameFromPayload((log as unknown as Record<string, unknown>).afterJson) ??
                  getReadableNameFromPayload(log.newValue) ??
                  getReadableNameFromPayload((log as unknown as Record<string, unknown>).beforeJson) ??
                  getReadableNameFromPayload(log.oldValue) ??
                  getEntityDisplayName(log.entityType, log.entityId, isRtl, lookupData),
                log.entityId,
              );
              const isExpanded = expanded.has(log.id);
              const hasDiff = log.oldValue !== undefined || log.newValue !== undefined;
              const actionStyle = ACTION_STYLES[log.action] || 'bg-slate-50 text-slate-700 border-slate-200';

              return (
                <li key={log.id} className="hover:bg-slate-50/40 transition-colors">
                  <div className="flex items-start gap-3 px-5 py-4">
                    {/* Avatar */}
                    <div className="shrink-0">
                      {u?.photoURL ? (
                        <img
                          src={resolveFileUrl(u.photoURL) || u.photoURL}
                          alt={log.userName}
                          className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[12px] font-bold text-blue-600 border-2 border-white shadow-sm">
                          {initials}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-[13px] text-text-main">{log.userName}</span>
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border', actionStyle)}>
                          {actionLabel(log.action)}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-50 text-slate-600 border border-slate-200">
                          {entityLabel(log.entityType)}
                        </span>
                      </div>

                      <div className="text-[13px] text-text-main">
                        <span className="font-medium">{entityName}</span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-text-muted font-medium">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(log.timestamp), 'PPpp', { locale: dateLocale })}
                        </span>
                        {hasDiff && (
                          <button
                            type="button"
                            onClick={() => toggleExpanded(log.id)}
                            className="flex items-center gap-1 text-primary font-bold hover:underline"
                          >
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            {isRtl ? 'تفاصيل التغيير' : 'Diff details'}
                          </button>
                        )}
                      </div>

                      {isExpanded && hasDiff && (
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div className="rounded-lg bg-rose-50/40 border border-rose-100 p-3">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700 mb-1">{isRtl ? 'قبل' : 'Before'}</div>
                            <pre className="text-[11px] font-mono whitespace-pre-wrap break-words text-rose-900/80 max-h-[160px] overflow-auto">
                              {log.oldValue !== undefined ? JSON.stringify(log.oldValue, null, 2) : '—'}
                            </pre>
                          </div>
                          <div className="rounded-lg bg-emerald-50/40 border border-emerald-100 p-3">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1">{isRtl ? 'بعد' : 'After'}</div>
                            <pre className="text-[11px] font-mono whitespace-pre-wrap break-words text-emerald-900/80 max-h-[160px] overflow-auto">
                              {log.newValue !== undefined ? JSON.stringify(log.newValue, null, 2) : '—'}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

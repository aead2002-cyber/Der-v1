import React from 'react';
import { BarChart3, Bell, FileText, History, Scale, Files, CalendarDays, ClipboardList } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getLegalAuditLogs, getLegalCases, getLegalDashboardSummary, getLegalInvestigationSessions, getLegalInvestigations, getLegalSummons } from '@/modules/legal/services/legalApi';
import type { LegalAuditLog, LegalCase, LegalDashboardSummary, LegalInvestigation, LegalInvestigationSession, LegalSummons } from '@/modules/legal/types/legal';
import { LegalPageHeader } from '@/modules/legal/components/LegalPageHeader';
import { LegalDataTable } from '@/modules/legal/components/LegalDataTable';
import { LegalStatusBadge } from '@/modules/legal/components/LegalStatusBadge';

const cards = [
  { key: 'activeCases', label: 'عدد القضايا القائمة', icon: Scale },
  { key: 'closedCases', label: 'عدد القضايا المنتهية', icon: FileText },
  { key: 'upcomingCaseSessionsThisWeek', label: 'جلسات هذا الأسبوع', icon: History },
  { key: 'openInvestigations', label: 'التحقيقات المفتوحة', icon: Files },
  { key: 'closedInvestigations', label: 'التحقيقات المنتهية', icon: BarChart3 },
  { key: 'upcomingSummons', label: 'الاستدعاءات القريبة', icon: Bell },
  { key: 'legalDocumentsCount', label: 'الوثائق القانونية', icon: ClipboardList },
] as const satisfies ReadonlyArray<{ key: keyof LegalDashboardSummary; label: string; icon: React.ComponentType<{ className?: string }> }>;

export default function LegalDashboardPage() {
  const [summary, setSummary] = React.useState<LegalDashboardSummary>({
    activeCases: 0,
    closedCases: 0,
    upcomingCaseSessionsThisWeek: 0,
    openInvestigations: 0,
    closedInvestigations: 0,
    upcomingSummons: 0,
    legalDocumentsCount: 0,
  });
  const [cases, setCases] = React.useState<LegalCase[]>([]);
  const [investigations, setInvestigations] = React.useState<LegalInvestigation[]>([]);
  const [caseSessions, setCaseSessions] = React.useState<LegalInvestigationSession[]>([]);
  const [summons, setSummons] = React.useState<LegalSummons[]>([]);
  const [auditLogs, setAuditLogs] = React.useState<LegalAuditLog[]>([]);

  React.useEffect(() => {
    void getLegalDashboardSummary().then(setSummary);
    void getLegalCases().then(setCases);
    void getLegalInvestigations().then(setInvestigations);
    void getLegalSummons().then(setSummons);
    void getLegalAuditLogs().then(setAuditLogs);
    void getLegalInvestigationSessions().then(setCaseSessions);
  }, []);

  const upcomingCaseSessions = React.useMemo(
    () => caseSessions
      .filter(item => !item.investigationId || Boolean(item.sessionDateTime))
      .slice(0, 4),
    [caseSessions]
  );

  const upcomingSummons = React.useMemo(
    () => summons.slice(0, 4),
    [summons]
  );

  return (
    <div className="space-y-6">
      <LegalPageHeader
        title="لوحة التحكم القانونية"
        subtitle="نظرة عامة سريعة على القضايا والتحقيقات والاستدعاءات والوثائق القانونية الجارية."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <Card key={card.key} className="border-slate-200 shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-500">{card.label}</p>
                  <p className="text-3xl font-black text-slate-900">{summary[card.key]}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">الجلسات القادمة</h2>
                <p className="text-sm text-slate-500">الجلسات القانونية المجدولة خلال الفترة القادمة.</p>
              </div>
              <CalendarDays className="h-5 w-5 text-slate-400" />
            </div>
            <div className="space-y-3">
              {upcomingCaseSessions.length > 0 ? upcomingCaseSessions.map(session => (
                <div key={session.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-bold text-slate-900">{session.subject}</p>
                  <p className="mt-1 text-xs text-slate-500">{session.location}</p>
                  <p className="mt-1 text-xs text-slate-500">{session.sessionDateTime}</p>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">لا توجد جلسات قادمة</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">الاستدعاءات القريبة</h2>
                <p className="text-sm text-slate-500">أحدث الاستدعاءات المسجلة في النظام التجريبي.</p>
              </div>
              <Bell className="h-5 w-5 text-slate-400" />
            </div>
            <div className="space-y-3">
              {upcomingSummons.length > 0 ? upcomingSummons.map(item => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-bold text-slate-900">{item.subject}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.location}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.sessionDateTime}</p>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">لا توجد استدعاءات</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="space-y-4 p-5">
            <div>
              <h2 className="text-lg font-black text-slate-900">التحقيقات الحديثة</h2>
              <p className="text-sm text-slate-500">ملخص سريع للتحقيقات المفتوحة والمغلقة.</p>
            </div>
            <LegalDataTable
              rows={investigations}
              defaultPageSize={5}
              pageSizeOptions={[5, 20, 50]}
              searchPlaceholder="بحث في التحقيقات"
              columns={[
                { key: 'number', label: 'رقم التحقيق', sortable: true, render: item => item.investigationNumber, sortValue: item => item.investigationNumber, searchValue: item => item.investigationNumber },
                { key: 'subject', label: 'الموضوع', sortable: true, render: item => item.subject, sortValue: item => item.subject, searchValue: item => item.subject },
                { key: 'status', label: 'الحالة', sortable: true, render: item => <LegalStatusBadge status={item.status === 'OPEN' ? 'مفتوح' : 'مغلق'} />, sortValue: item => item.status, searchValue: item => item.status },
              ]}
            />
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="space-y-4 p-5">
            <div>
              <h2 className="text-lg font-black text-slate-900">سجل العمليات الأخير</h2>
              <p className="text-sm text-slate-500">أحدث العمليات المسجلة في النظام.</p>
            </div>
            <div className="space-y-3">
              {auditLogs.slice(0, 5).map(log => (
                <div key={log.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-bold text-slate-900">{log.userName}</p>
                  <p className="mt-1 text-xs text-slate-500">{log.serviceName} - {log.actionType}</p>
                  <p className="mt-1 text-xs text-slate-500">{log.dateTime}</p>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full rounded-2xl border-slate-200">عرض السجل الكامل</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


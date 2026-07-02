import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { getLegalAuditLogs } from '@/modules/legal/services/legalApi';
import type { LegalAuditLog } from '@/modules/legal/types/legal';
import { LegalPageHeader } from '@/modules/legal/components/LegalPageHeader';
import { LegalDataTable } from '@/modules/legal/components/LegalDataTable';

export default function LegalAuditLogPage() {
  const [logs, setLogs] = React.useState<LegalAuditLog[]>([]);

  React.useEffect(() => {
    void getLegalAuditLogs().then(setLogs);
  }, []);

  return (
    <div className="space-y-6">
      <LegalPageHeader
        title="سجل العمليات"
        subtitle="سجل مبدئي يوضح ما تم على السجلات القانونية داخل النظام."
      />

      <Card className="border-border-subtle shadow-[var(--der3-shadow-card)]">
        <CardContent className="p-5 text-sm leading-7 text-text-muted">
          هذا السجل مؤقت وسيُربط لاحقاً بخدمة التدقيق في الباك اند القانونية.
        </CardContent>
      </Card>

      <LegalDataTable
        rows={logs}
        searchPlaceholder="ابحث باسم المستخدم أو الخدمة أو العملية"
        columns={[
          { key: 'userName', label: 'اسم المستخدم', sortable: true, render: log => log.userName, sortValue: log => log.userName, searchValue: log => log.userName },
          { key: 'actionType', label: 'نوع العملية', sortable: true, render: log => log.actionType, sortValue: log => log.actionType, searchValue: log => log.actionType },
          { key: 'serviceName', label: 'اسم الخدمة', sortable: true, render: log => log.serviceName, sortValue: log => log.serviceName, searchValue: log => log.serviceName },
          { key: 'dateTime', label: 'التاريخ والوقت', sortable: true, render: log => log.dateTime, sortValue: log => log.dateTime, searchValue: log => log.dateTime },
          { key: 'beforeValue', label: 'القيمة قبل التعديل', render: log => log.beforeValue || '-', searchValue: log => log.beforeValue || '' },
          { key: 'afterValue', label: 'القيمة بعد التعديل', render: log => log.afterValue || '-', searchValue: log => log.afterValue || '' },
          { key: 'ipAddress', label: 'عنوان IP', render: log => log.ipAddress || '-', searchValue: log => log.ipAddress || '' },
        ]}
      />
    </div>
  );
}


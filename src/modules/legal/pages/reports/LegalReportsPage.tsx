import React from 'react';
import { Filter, FileDown, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LegalFormModal } from '@/modules/legal/components/LegalFormModal';
import { LegalPageHeader } from '@/modules/legal/components/LegalPageHeader';
import type { LegalReportCard } from '@/modules/legal/types/legal';

const reports: LegalReportCard[] = [
  { id: 'status', title: 'تقرير القضايا حسب الحالة', description: 'ملخص توزيعي للقضايا القائمة والمنتهية داخل النظام.' },
  { id: 'category', title: 'تقرير القضايا حسب النوع', description: 'مراجعة القضايا بحسب التصنيف القانوني والفئة المرتبطة بها.' },
  { id: 'direction', title: 'تقرير القضايا حسب التصنيف', description: 'تحليل مبسط للقضايا الخاصة بالغرفة أو المرفوعة ضدها.' },
  { id: 'supervisor', title: 'تقرير القضايا حسب المشرف', description: 'تجميع الحالات حسب المشرفين القانونيين المرتبطين بها.' },
  { id: 'sessions', title: 'تقرير الجلسات القادمة', description: 'عرض الجلسات القانونية المقررة للأيام القادمة.' },
  { id: 'openInvestigations', title: 'تقرير التحقيقات المفتوحة', description: 'حصر التحقيقات الجارية التي ما زالت قيد المتابعة.' },
  { id: 'closedInvestigations', title: 'تقرير التحقيقات المنتهية', description: 'عرض التحقيقات التي تم إغلاقها خلال الفترة المختارة.' },
  { id: 'summons', title: 'تقرير الاستدعاءات', description: 'متابعة الاستدعاءات المرسلة والمجدولة والملغاة.' },
  { id: 'dateRange', title: 'تقرير حسب نطاق تاريخ محدد', description: 'فلتر زمني مرن لاستخراج مؤشرات قانونية مخصصة.' },
];

export default function LegalReportsPage() {
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  return (
    <div className="space-y-6">
      <LegalPageHeader
        title="التقارير القانونية"
        subtitle="واجهات تقارير تجريبية فقط حتى يتم ربط باك اند التقارير لاحقاً."
        actions={<Button variant="outline" className="rounded-2xl border-slate-200" onClick={() => setFiltersOpen(true)}><Filter className="ms-2 h-4 w-4" />خيارات الفلترة</Button>}
      />

      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600 shadow-sm">
        سيتم تفعيل التصدير بعد ربط الباك اند.
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map(report => (
          <Card key={report.id} className="border-slate-200 shadow-sm">
            <CardContent className="space-y-4 p-5">
              <div>
                <h3 className="text-lg font-black text-slate-900">{report.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{report.description}</p>
              </div>
              <div className="flex gap-2">
                <Button disabled className="flex-1 rounded-2xl bg-slate-900 text-white hover:bg-slate-900"><FileDown className="ms-2 h-4 w-4" />PDF</Button>
                <Button disabled variant="outline" className="flex-1 rounded-2xl border-slate-200"><FileSpreadsheet className="ms-2 h-4 w-4" />Excel</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <LegalFormModal open={filtersOpen} title="خيارات الفلترة" onOpenChange={setFiltersOpen} onSubmit={event => { event.preventDefault(); setFiltersOpen(false); }}>
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
          هذه نافذة placeholder لخيارات الفلاتر وستتصل بخدمة التقارير لاحقاً.
        </div>
      </LegalFormModal>
    </div>
  );
}

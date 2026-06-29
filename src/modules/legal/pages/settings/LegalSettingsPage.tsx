import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getLegalSettings, updateLegalSettings } from '@/modules/legal/services/legalApi';
import type { LegalSettings } from '@/modules/legal/types/legal';
import { LegalPageHeader } from '@/modules/legal/components/LegalPageHeader';
import { toast } from 'sonner';

const reminderOptions = [24, 48, 168, 0] as const;

export default function LegalSettingsPage() {
  const [settings, setSettings] = React.useState<LegalSettings | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [customReminder, setCustomReminder] = React.useState('');

  React.useEffect(() => {
    void getLegalSettings().then(next => {
      setSettings(next);
      if (![24, 48, 168].includes(next.caseReminderHours)) {
        setCustomReminder(String(next.caseReminderHours));
      }
    });
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const nextReminder = settings.caseReminderHours === 0 ? Number(customReminder || 0) : settings.caseReminderHours;
      const next = await updateLegalSettings({ ...settings, caseReminderHours: nextReminder });
      setSettings(next);
      toast.success('تم حفظ الإعدادات مؤقتاً');
    } finally {
      setSaving(false);
    }
  };

  const allowedFiles = settings?.allowedFileTypes.join('، ') || 'PDF، GIF';

  return (
    <div className="space-y-6">
      <LegalPageHeader
        title="الإعدادات القانونية"
        subtitle="إعدادات قانونية تجريبية ستنتقل لاحقاً إلى الباك اند."
        actions={<Button className="rounded-2xl bg-slate-900 px-5 text-white hover:bg-slate-900" onClick={() => void handleSave()} disabled={!settings || saving}>{saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}</Button>}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="space-y-4 p-5">
            <h2 className="text-lg font-black text-slate-900">إعدادات التذكير</h2>
            <div className="space-y-2">
              <Label>مدة التذكير قبل الجلسة</Label>
              <Select
                value={String(settings?.caseReminderHours ?? 24)}
                onValueChange={value => setSettings(prev => prev ? { ...prev, caseReminderHours: Number(value) } : prev)}
              >
                <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reminderOptions.map(option => (
                    <SelectItem key={option} value={String(option)}>{option === 0 ? 'مخصص' : `${option} ساعة`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(settings?.caseReminderHours ?? 24) === 0 ? (
                <Input
                  type="number"
                  min={1}
                  value={customReminder}
                  onChange={event => setCustomReminder(event.target.value)}
                  className="h-11 rounded-2xl border-slate-200"
                  placeholder="أدخل الساعات"
                />
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="space-y-4 p-5">
            <h2 className="text-lg font-black text-slate-900">إعدادات الملفات</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-500">أنواع الملفات المسموحة</p>
                <p className="mt-2 text-lg font-black text-slate-900">{allowedFiles}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-500">الحد الأقصى لحجم الملف</p>
                <p className="mt-2 text-lg font-black text-slate-900">{settings?.maxFileSizeMb ?? 2} MB</p>
              </div>
            </div>
            <p className="text-sm leading-7 text-slate-500">الرفع التجريبي يقبل حالياً ملفات PDF و GIF فقط بحد أقصى 2MB.</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="space-y-4 p-5">
            <h2 className="text-lg font-black text-slate-900">إعدادات الإشعارات</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setSettings(prev => prev ? { ...prev, enableInternalNotifications: !prev.enableInternalNotifications } : prev)} className={`rounded-2xl border px-4 py-3 text-right ${settings?.enableInternalNotifications ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>
                <p className="text-sm font-bold">الإشعارات الداخلية</p>
                <p className={`mt-1 text-xs ${settings?.enableInternalNotifications ? 'text-slate-200' : 'text-slate-500'}`}>تفعيل الإشعارات داخل النظام</p>
              </button>
              <button type="button" onClick={() => setSettings(prev => prev ? { ...prev, enableEmailNotifications: !prev.enableEmailNotifications } : prev)} className={`rounded-2xl border px-4 py-3 text-right ${settings?.enableEmailNotifications ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>
                <p className="text-sm font-bold">إشعارات البريد</p>
                <p className={`mt-1 text-xs ${settings?.enableEmailNotifications ? 'text-slate-200' : 'text-slate-500'}`}>تفعيل الرسائل البريدية</p>
              </button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="space-y-3 p-5">
            <h2 className="text-lg font-black text-slate-900">قوائم النظام placeholder</h2>
            <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-3">تصنيفات القضايا</div>
              <div className="rounded-2xl bg-slate-50 p-3">نتائج الجلسات</div>
              <div className="rounded-2xl bg-slate-50 p-3">أسباب إغلاق القضية</div>
              <div className="rounded-2xl bg-slate-50 p-3">نتائج التحقيق</div>
              <div className="rounded-2xl bg-slate-50 p-3">أدوار الحضور</div>
            </div>
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              الصلاحيات وإعادة الفتح حالياً placeholders فقط.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


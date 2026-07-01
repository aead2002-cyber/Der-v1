import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SearchX, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Logo } from './Logo';

export default function NotFoundPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-8 font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center">
        <Card className="w-full overflow-hidden border-none shadow-2xl shadow-blue-900/5">
          <div className="h-2 bg-slate-900" />
          <CardContent className="px-6 py-10 sm:px-10 sm:py-12">
            <div className="mb-6 flex justify-center">
              <Logo size="lg" />
            </div>

            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <SearchX className="h-8 w-8 text-slate-600" />
            </div>

            <div className="space-y-3 text-center">
              <h1 className="text-2xl font-black tracking-tight text-[#111827]">
                {isRtl ? 'الصفحة غير موجودة' : 'Page Not Found'}
              </h1>
              <p className="mx-auto max-w-lg text-sm leading-6 text-slate-600">
                {isRtl
                  ? 'تعذر العثور على الصفحة المطلوبة. قد يكون الرابط غير صحيح أو تم نقل الصفحة.'
                  : 'The page you requested could not be found. The link may be incorrect or the page may have been moved.'}
              </p>
            </div>

            <div className="mt-8 flex justify-center">
              <Link
                to="/platforms"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>{isRtl ? 'العودة إلى المنصات' : 'Back to Platforms'}</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

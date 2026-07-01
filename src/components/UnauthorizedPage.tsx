import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Logo } from './Logo';

export default function UnauthorizedPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-8 font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center">
        <Card className="w-full overflow-hidden border-none shadow-2xl shadow-blue-900/5">
          <div className="h-2 bg-blue-600" />
          <CardContent className="px-6 py-10 sm:px-10 sm:py-12">
            <div className="mb-6 flex justify-center">
              <Logo size="lg" />
            </div>

            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-rose-50">
              <ShieldAlert className="h-8 w-8 text-rose-600" />
            </div>

            <div className="space-y-3 text-center">
              <h1 className="text-2xl font-black tracking-tight text-[#111827]">
                {t('unauthorized_access') || 'Unauthorized Access'}
              </h1>
              <p className="mx-auto max-w-lg text-sm leading-6 text-slate-600">
                {isRtl
                  ? 'ليس لديك صلاحية للوصول إلى هذه الصفحة أو المنصة. إذا كنت تعتقد أن هذا خطأ، تواصل مع المسؤول.'
                  : 'You do not have permission to access this page or platform. If you believe this is a mistake, contact your administrator.'}
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

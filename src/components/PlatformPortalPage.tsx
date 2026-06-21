import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, CircleDot } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/AuthContext';
import { canAccessPlatform } from '@/lib/platformAccess';

type PlatformKey = 'DER3' | 'RASED';

export default function PlatformPortalPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const email = user?.email || '';

  const der3Allowed = canAccessPlatform(email, 'DER3');
  const rasedAllowed = canAccessPlatform(email, 'RASED');

  const handleGo = (platform: PlatformKey) => {
    if (platform === 'DER3') {
      navigate('/');
      return;
    }
    navigate('/rased');
  };

  const PlatformCard = ({
    title,
    description,
    allowed,
    platform,
    variant,
  }: {
    title: string;
    description: string;
    allowed: boolean;
    platform: PlatformKey;
    variant: 'der3' | 'rased';
  }) => (
    <Card className={`border border-slate-200 shadow-xl shadow-slate-200/60 bg-white ${allowed ? 'hover:-translate-y-0.5 transition-transform' : 'opacity-80'}`}>
      <CardHeader className="pb-3 text-center items-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-2 overflow-hidden">
          {variant === 'der3' ? (
            <img src="/logo-der3.png" alt="DER3" className="w-full h-full object-contain p-2" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CircleDot className="w-5 h-5" />
            </div>
          )}
        </div>
        <CardTitle className="text-xl font-bold">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          type="button"
          onClick={() => handleGo(platform)}
          disabled={!allowed}
          className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
        >
          {allowed ? 'دخول النظام' : 'غير مصرح'}
          <ArrowRight className="w-4 h-4 ml-2 rtl:ml-0 rtl:mr-2" />
        </Button>
        {!allowed && (
          <p className="text-sm text-slate-500 text-center">
            {isRtl ? 'ليس لديك صلاحية الوصول إلى هذه المنصة' : 'You do not have access to this platform'}
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-6 py-10 md:px-10">
      <div className="max-w-5xl mx-auto min-h-[calc(100vh-5rem)] flex flex-col justify-center">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
            الأنظمة الداخلية لغرفة المدينة
          </h1>
          <p className="text-slate-500 text-sm mt-2 break-all">
            {email}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
          <PlatformCard
            title="DER3"
            description={isRtl ? 'المنصة الحالية' : 'Current DER3 platform'}
            allowed={der3Allowed}
            platform="DER3"
            variant="der3"
          />
          <PlatformCard
            title="Rased"
            description={isRtl ? 'عرض توضيحي بسيط للمنصة' : 'Simple demo placeholder for the platform'}
            allowed={rasedAllowed}
            platform="RASED"
            variant="rased"
          />
        </div>
      </div>
    </div>
  );
}

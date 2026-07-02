import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/AuthContext';
import { PLATFORMS } from '@/shared/config/platforms';
import { PlatformCard } from '@/shared/components/PlatformCard';
import { resolvePlatformAccess } from '@/shared/auth/platformAccess';
import type { Platform } from '@/shared/types/platform';
import { PlatformLayout } from '@/shared/layout/PlatformLayout';

export default function PlatformsPage() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const isRtl = i18n.language === 'ar';

  const permittedPlatforms = React.useMemo(() => {
    const platforms = user ? resolvePlatformAccess(user).platforms || [] : [];

    return PLATFORMS.filter(platform => platform.isActive && platforms.includes(platform.code));
  }, [user]);

  const handleSelectPlatform = (platform: Platform) => {
    navigate(platform.route);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F8FAFC] px-4 font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
    <PlatformLayout
      platformTitle="الأنظمة الداخلية لغرفة المدينة"
      platformSubtitle="اختر النظام الذي ترغب بالدخول إليه"
    >
       
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[150px]">
        <svg width="100%" height="150" viewBox="0 0 1440 150" preserveAspectRatio="none" aria-hidden="true" className="absolute inset-0 h-full w-full">
          <path fill="#6F8E3D" d="M0,82 C260,50 520,56 760,80 C1000,104 1210,88 1440,50 L1440,150 L0,150 Z" />
          <path fill="#0B3768" d="M0,100 C280,82 520,88 760,108 C1010,130 1230,112 1440,72 L1440,150 L0,150 Z" />
        </svg>
      </div>
      <div className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-6xl flex-col justify-center px-0 py-4">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {permittedPlatforms.map(platform => (
            <PlatformCard
              key={platform.code}
              platform={platform}
              onClick={() => handleSelectPlatform(platform)}
            />
          ))}
        </div>

        {permittedPlatforms.length === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            {isRtl ? 'لا توجد أنظمة متاحة لهذا المستخدم' : 'No platforms are available for this user'}
          </div>
        )}
      </div>
      
    </PlatformLayout>
    </div>
  );
}

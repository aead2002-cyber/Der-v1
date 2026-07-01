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
    <PlatformLayout
      platformTitle="الأنظمة الداخلية لغرفة المدينة"
      platformSubtitle="اختر النظام الذي ترغب بالدخول إليه"
    >
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
  );
}

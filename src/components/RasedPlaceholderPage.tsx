import React from 'react';
import { useTranslation } from 'react-i18next';
import { Shield } from 'lucide-react';
import { useAuth } from '@/AuthContext';
import { canAccessPlatform } from '@/lib/platformAccess';

export default function RasedPlaceholderPage() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const email = user?.email || '';
  const allowed = canAccessPlatform(email, 'RASED');

  if (!allowed) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">
            {isRtl ? 'ليس لديك صلاحية الوصول إلى Rased' : 'You do not have access to Rased'}
          </h1>
          <p className="text-slate-600 text-sm">
            {user?.email || ''}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-10 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
          <Shield className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-3">Rased</h1>
        <p className="text-slate-600 text-lg">Rased platform placeholder</p>
      </div>
    </div>
  );
}

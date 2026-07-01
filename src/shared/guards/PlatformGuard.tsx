import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/AuthContext';
import type { PlatformCode } from '@/shared/types/platform';

export function PlatformGuard({
  platformCode,
  children,
}: {
  platformCode: PlatformCode;
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const platforms = user?.platforms || [];
  if (!user || !platforms.includes(platformCode)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

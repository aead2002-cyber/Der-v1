import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { ProtectedRoute } from '@/shared/guards/ProtectedRoute';
import LoginPage from '@/components/LoginPage';
import ResetPasswordPage from '@/components/ResetPasswordPage';
import PublicReportPage from '@/components/PublicReportPage';
import PlatformsPage from '@/pages/PlatformsPage';
import { Der3Routes } from '@/modules/der3/routes';
import { LegalRoutes } from '@/modules/legal/routes';
import { useAuth } from '@/AuthContext';

function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <Navigate to={user ? '/platforms' : '/login'} replace />;
}

function LoginRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return user ? <Navigate to="/platforms" replace /> : <LoginPage />;
}

export function AppRoutes() {
  return (
    <>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginRedirect />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/report-incident" element={<PublicReportPage />} />
        <Route
          path="/platforms"
          element={
            <ProtectedRoute>
              <PlatformsPage />
            </ProtectedRoute>
          }
        />
        {Der3Routes()}
        {LegalRoutes()}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-center" />
    </>
  );
}

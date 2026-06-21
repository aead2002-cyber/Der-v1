/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import PoliciesPage from './components/PoliciesPage';
import StandardsPage from './components/StandardsPage';
import AddStandardPage from './components/AddStandardPage';
import ProceduresPage from './components/ProceduresPage';
import AddProcedurePage from './components/AddProcedurePage';
import AuditTrailPage from './components/AuditTrailPage';
import UsersPage from './components/UsersPage';
import AddUserPage from './components/AddUserPage';
import SettingsPage from './components/SettingsPage';
import CommitmentsPage from './components/CommitmentsPage';
import ReportsPage from './components/ReportsPage';
import FrameworksPage from './components/FrameworksPage';
import EvidencePage from './components/EvidencePage';
import PolicyItemsPage from './components/PolicyItemsPage';
import AddPolicyItemPage from './components/AddPolicyItemPage';
import NotificationsPage from './components/NotificationsPage';
import MyTasksPage from './components/MyTasksPage';
import LoginPage from './components/LoginPage';
import IncidentsPage from './components/IncidentsPage';
import RisksPage from './components/RisksPage';
import PublicReportPage from './components/PublicReportPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import PlatformPortalPage from './components/PlatformPortalPage';
import RasedPlaceholderPage from './components/RasedPlaceholderPage';
import { AuthProvider, useAuth } from './AuthContext';
import './i18n';

function ProtectedRoute({
  children,
  permission,
  standalone = false,
}: {
  children: React.ReactNode;
  permission?: string;
  standalone?: boolean;
}) {
  const { user, loading, can } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (permission && !can(permission)) {
    const denied = (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] p-6 text-center">
        <div>
          <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mb-4 mx-auto">
            <span className="text-2xl">🔒</span>
          </div>
          <h2 className="text-xl font-bold text-text-main mb-1">ليس لديك صلاحية الوصول</h2>
          <p className="text-text-muted text-sm max-w-md">
            للوصول إلى هذه الصفحة تحتاج صلاحية: <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[12px]">{permission}</code>. تواصل مع مدير النظام.
          </p>
        </div>
      </div>
    );

    return standalone ? denied : <Layout>{denied}</Layout>;
  }

  return standalone ? <>{children}</> : <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/report-incident" element={<PublicReportPage />} />
          <Route path="/platforms" element={<ProtectedRoute standalone><PlatformPortalPage /></ProtectedRoute>} />
          <Route path="/rased" element={<ProtectedRoute standalone><RasedPlaceholderPage /></ProtectedRoute>} />

          <Route path="/" element={<ProtectedRoute permission="dashboard.view"><Dashboard /></ProtectedRoute>} />
          <Route path="/policies" element={<ProtectedRoute permission="policies.view"><PoliciesPage /></ProtectedRoute>} />
          <Route path="/policy-items" element={<ProtectedRoute permission="policies.policy_items.view"><PolicyItemsPage /></ProtectedRoute>} />
          <Route path="/policy-items/add" element={<ProtectedRoute permission="policies.policy_items.create"><AddPolicyItemPage /></ProtectedRoute>} />
          <Route path="/policy-items/edit/:id" element={<ProtectedRoute permission="policies.policy_items.edit"><AddPolicyItemPage /></ProtectedRoute>} />
          <Route path="/standards" element={<ProtectedRoute permission="standards.view"><StandardsPage /></ProtectedRoute>} />
          <Route path="/standards/add" element={<ProtectedRoute permission="standards.create"><AddStandardPage /></ProtectedRoute>} />
          <Route path="/standards/edit/:id" element={<ProtectedRoute permission="standards.edit"><AddStandardPage /></ProtectedRoute>} />
          <Route path="/frameworks" element={<ProtectedRoute permission="frameworks.view"><FrameworksPage /></ProtectedRoute>} />
          <Route path="/procedures" element={<ProtectedRoute permission="procedures.view"><ProceduresPage /></ProtectedRoute>} />
          <Route path="/procedures/add" element={<ProtectedRoute permission="procedures.create"><AddProcedurePage /></ProtectedRoute>} />
          <Route path="/procedures/edit/:id" element={<ProtectedRoute permission="procedures.edit"><AddProcedurePage /></ProtectedRoute>} />
          <Route path="/procedures/:id/evidence" element={<ProtectedRoute permission="procedures.evidence.view"><EvidencePage /></ProtectedRoute>} />
          <Route path="/incidents" element={<ProtectedRoute permission="incidents.view"><IncidentsPage /></ProtectedRoute>} />
          <Route path="/risks" element={<ProtectedRoute permission="risks.view"><RisksPage /></ProtectedRoute>} />
          <Route path="/audit" element={<ProtectedRoute permission="reports.audit_trail.view"><AuditTrailPage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/my-tasks" element={<ProtectedRoute permission="tasks.my_tasks.view"><MyTasksPage /></ProtectedRoute>} />
          <Route path="/commitments" element={<ProtectedRoute permission="commitments.view"><CommitmentsPage /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute permission="users.view"><UsersPage /></ProtectedRoute>} />
          <Route path="/users/add" element={<ProtectedRoute permission="users.create"><AddUserPage /></ProtectedRoute>} />
          <Route path="/users/edit/:id" element={<ProtectedRoute permission="users.edit"><AddUserPage /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute permission="reports.view"><ReportsPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute permission="settings.general.view"><SettingsPage /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-center" />
      </Router>
    </AuthProvider>
  );
}

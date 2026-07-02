import React from 'react';
import { Navigate, Route } from 'react-router-dom';
import Layout from '@/modules/der3/components/Layout';
import Dashboard from '@/modules/der3/pages/Dashboard';
import PoliciesPage from '@/modules/der3/pages/PoliciesPage';
import StandardsPage from '@/modules/der3/pages/StandardsPage';
import AddStandardPage from '@/modules/der3/pages/AddStandardPage';
import ProceduresPage from '@/modules/der3/pages/ProceduresPage';
import AddProcedurePage from '@/modules/der3/pages/AddProcedurePage';
import AuditTrailPage from '@/modules/der3/pages/AuditTrailPage';
import UsersPage from '@/modules/der3/pages/UsersPage';
import AddUserPage from '@/modules/der3/pages/AddUserPage';
import SettingsPage from '@/modules/der3/pages/SettingsPage';
import CommitmentsPage from '@/modules/der3/pages/CommitmentsPage';
import ReportsPage from '@/modules/der3/pages/ReportsPage';
import FrameworksPage from '@/modules/der3/pages/FrameworksPage';
import EvidencePage from '@/modules/der3/pages/EvidencePage';
import PolicyItemsPage from '@/modules/der3/pages/PolicyItemsPage';
import AddPolicyItemPage from '@/modules/der3/pages/AddPolicyItemPage';
import NotificationsPage from '@/modules/der3/pages/NotificationsPage';
import MyTasksPage from '@/modules/der3/pages/MyTasksPage';
import IncidentsPage from '@/modules/der3/pages/IncidentsPage';
import RisksPage from '@/modules/der3/pages/RisksPage';
import { ProtectedRoute } from '@/shared/guards/ProtectedRoute';
import { PlatformGuard } from '@/shared/guards/PlatformGuard';
import { useAuth } from '@/AuthContext';

 type Der3RouteProps = {
  permission?: string;
  children: React.ReactNode;
};

function Der3Route({ permission, children }: Der3RouteProps) {
  const { can } = useAuth();

  if (permission && !can(permission)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] p-6 text-center">
        <div>
          <div className="mb-4 mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50">
            <span className="text-2xl">🔒</span>
          </div>
          <h2 className="mb-1 text-xl font-bold text-text-main">ليس لديك صلاحية الوصول</h2>
          <p className="max-w-md text-sm text-text-muted">
            للوصول إلى هذه الصفحة تحتاج صلاحية: <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[12px]">{permission}</code>.
          </p>
        </div>
      </div>
    );
  }

  return <Layout>{children}</Layout>;
}

const wrapDer3Page = (permission: string | undefined, page: React.ReactNode) => (
  <ProtectedRoute>
    <PlatformGuard platformCode="DER3">
      <Der3Route permission={permission}>{page}</Der3Route>
    </PlatformGuard>
  </ProtectedRoute>
);

const wrappedRoute = (path: string, permission: string | undefined, page: React.ReactNode) => (
  <Route key={path} path={path} element={wrapDer3Page(permission, page)} />
);

export function Der3Routes() {
  return (
    <>
      <Route path="/dashboard" element={wrapDer3Page('dashboard.view', <Dashboard />)} />
      <Route path="/der3" element={<Navigate to="/der3/dashboard" replace />} />
      <Route path="/der3/dashboard" element={wrapDer3Page('dashboard.view', <Dashboard />)} />
      {wrappedRoute('/policies', 'policies.view', <PoliciesPage />)}
      {wrappedRoute('/der3/policies', 'policies.view', <PoliciesPage />)}
      {wrappedRoute('/policy-items', 'policies.policy_items.view', <PolicyItemsPage />)}
      {wrappedRoute('/der3/policy-items', 'policies.policy_items.view', <PolicyItemsPage />)}
      {wrappedRoute('/policy-items/add', 'policies.policy_items.create', <AddPolicyItemPage />)}
      {wrappedRoute('/der3/policy-items/add', 'policies.policy_items.create', <AddPolicyItemPage />)}
      {wrappedRoute('/policy-items/edit/:id', 'policies.policy_items.edit', <AddPolicyItemPage />)}
      {wrappedRoute('/der3/policy-items/edit/:id', 'policies.policy_items.edit', <AddPolicyItemPage />)}
      {wrappedRoute('/standards', 'standards.view', <StandardsPage />)}
      {wrappedRoute('/der3/standards', 'standards.view', <StandardsPage />)}
      {wrappedRoute('/standards/add', 'standards.create', <AddStandardPage />)}
      {wrappedRoute('/der3/standards/add', 'standards.create', <AddStandardPage />)}
      {wrappedRoute('/standards/edit/:id', 'standards.edit', <AddStandardPage />)}
      {wrappedRoute('/der3/standards/edit/:id', 'standards.edit', <AddStandardPage />)}
      {wrappedRoute('/frameworks', 'frameworks.view', <FrameworksPage />)}
      {wrappedRoute('/der3/frameworks', 'frameworks.view', <FrameworksPage />)}
      {wrappedRoute('/procedures', 'procedures.view', <ProceduresPage />)}
      {wrappedRoute('/der3/procedures', 'procedures.view', <ProceduresPage />)}
      {wrappedRoute('/procedures/add', 'procedures.create', <AddProcedurePage />)}
      {wrappedRoute('/der3/procedures/add', 'procedures.create', <AddProcedurePage />)}
      {wrappedRoute('/procedures/edit/:id', 'procedures.edit', <AddProcedurePage />)}
      {wrappedRoute('/der3/procedures/edit/:id', 'procedures.edit', <AddProcedurePage />)}
      {wrappedRoute('/procedures/:id/evidence', 'procedures.evidence.view', <EvidencePage />)}
      {wrappedRoute('/der3/procedures/:id/evidence', 'procedures.evidence.view', <EvidencePage />)}
      {wrappedRoute('/incidents', 'incidents.view', <IncidentsPage />)}
      {wrappedRoute('/der3/incidents', 'incidents.view', <IncidentsPage />)}
      {wrappedRoute('/risks', 'risks.view', <RisksPage />)}
      {wrappedRoute('/der3/risks', 'risks.view', <RisksPage />)}
      {wrappedRoute('/audit', 'reports.audit_trail.view', <AuditTrailPage />)}
      {wrappedRoute('/der3/audit', 'reports.audit_trail.view', <AuditTrailPage />)}
      {wrappedRoute('/notifications', undefined, <NotificationsPage />)}
      {wrappedRoute('/der3/notifications', undefined, <NotificationsPage />)}
      {wrappedRoute('/my-tasks', 'tasks.my_tasks.view', <MyTasksPage />)}
      {wrappedRoute('/der3/my-tasks', 'tasks.my_tasks.view', <MyTasksPage />)}
      {wrappedRoute('/commitments', 'commitments.view', <CommitmentsPage />)}
      {wrappedRoute('/der3/commitments', 'commitments.view', <CommitmentsPage />)}
      {wrappedRoute('/users', 'users.view', <UsersPage />)}
      {wrappedRoute('/der3/users', 'users.view', <UsersPage />)}
      {wrappedRoute('/users/add', 'users.create', <AddUserPage />)}
      {wrappedRoute('/der3/users/add', 'users.create', <AddUserPage />)}
      {wrappedRoute('/users/edit/:id', 'users.edit', <AddUserPage />)}
      {wrappedRoute('/der3/users/edit/:id', 'users.edit', <AddUserPage />)}
      {wrappedRoute('/reports', 'reports.view', <ReportsPage />)}
      {wrappedRoute('/der3/reports', 'reports.view', <ReportsPage />)}
      {wrappedRoute('/settings', 'settings.general.view', <SettingsPage />)}
      {wrappedRoute('/der3/settings', 'settings.general.view', <SettingsPage />)}
    </>
  );
}

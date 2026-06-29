import React from 'react';
import { Navigate, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/shared/guards/ProtectedRoute';
import { PlatformGuard } from '@/shared/guards/PlatformGuard';
import { LegalLayout } from './layout/LegalLayout';
import LegalDashboardPage from './pages/LegalDashboardPage';
import CasesPage from './pages/cases/CasesPage';
import PartiesPage from './pages/cases/PartiesPage';
import CaseSessionsPage from './pages/cases/CaseSessionsPage';
import InvestigationsPage from './pages/investigations/InvestigationsPage';
import SummonsPage from './pages/investigations/SummonsPage';
import InvestigationSessionsPage from './pages/investigations/InvestigationSessionsPage';
import LegalDocumentsPage from './pages/documents/LegalDocumentsPage';
import LegalReportsPage from './pages/reports/LegalReportsPage';
import LegalAuditLogPage from './pages/reports/LegalAuditLogPage';
import LegalSettingsPage from './pages/settings/LegalSettingsPage';
import EmployeesPage from './pages/employees/EmployeesPage';

const wrapLegalPage = (page: React.ReactNode) => (
  <ProtectedRoute>
    <PlatformGuard platformCode="LEGAL">
      <LegalLayout>{page}</LegalLayout>
    </PlatformGuard>
  </ProtectedRoute>
);

export function LegalRoutes() {
  return (
    <>
      <Route path="/legal" element={<Navigate to="/legal/dashboard" replace />} />
      <Route path="/legal/dashboard" element={wrapLegalPage(<LegalDashboardPage />)} />
      <Route path="/legal/cases" element={wrapLegalPage(<CasesPage />)} />
      <Route path="/legal/parties" element={wrapLegalPage(<PartiesPage />)} />
      <Route path="/legal/case-sessions" element={wrapLegalPage(<CaseSessionsPage />)} />
      <Route path="/legal/investigations" element={wrapLegalPage(<InvestigationsPage />)} />
      <Route path="/legal/employees" element={wrapLegalPage(<EmployeesPage />)} />
      <Route path="/legal/summons" element={wrapLegalPage(<SummonsPage />)} />
      <Route path="/legal/investigation-sessions" element={wrapLegalPage(<InvestigationSessionsPage />)} />
      <Route path="/legal/documents" element={wrapLegalPage(<LegalDocumentsPage />)} />
      <Route path="/legal/reports" element={wrapLegalPage(<LegalReportsPage />)} />
      <Route path="/legal/audit" element={wrapLegalPage(<LegalAuditLogPage />)} />
      <Route path="/legal/settings" element={wrapLegalPage(<LegalSettingsPage />)} />
    </>
  );
}

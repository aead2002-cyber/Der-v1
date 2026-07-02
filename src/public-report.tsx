import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from '@/components/ui/sonner';
import PublicReportPage from './pages/PublicReportPage';
import './index.css';
import './i18n';

// Standalone entry for the public security-incident reporting page.
// Built and deployed independently of the main admin system so the public form
// can live on its own host/port without exposing any protected routes.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PublicReportPage />
    <Toaster position="top-center" />
  </StrictMode>,
);

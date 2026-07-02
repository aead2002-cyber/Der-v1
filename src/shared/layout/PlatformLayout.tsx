import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/AuthContext';
import { PlatformShell, type PlatformShellNavigationItem } from './PlatformShell';

export interface PlatformNavigationItem {
  label: string;
  path: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface PlatformLayoutProps {
  platformTitle: string;
  platformSubtitle: string;
  navigationItems?: PlatformNavigationItem[];
  children: React.ReactNode;
}

export function PlatformLayout({ platformTitle, platformSubtitle, navigationItems = [], children }: PlatformLayoutProps) {
  const { i18n } = useTranslation();
  const location = useLocation();
  const { user, logout } = useAuth();
  const isRtl = i18n.language === 'ar';

  const shellNavigationItems: PlatformShellNavigationItem[] = navigationItems.map(item => ({
    label: item.label,
    path: item.path,
    icon: item.icon,
    isBack: item.path === '/platforms',
  }));

  return (
    <PlatformShell
      platformTitle={platformTitle}
      platformSubtitle={platformSubtitle}
      navigationItems={shellNavigationItems}
      children={children}
      isRtl={isRtl}
      activePath={location.pathname}
      user={user
        ? {
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
          }
        : undefined}
      onLogout={logout}
      headerActions={
        <button
          type="button"
          onClick={logout}
          className="rounded-full border border-border-subtle bg-card px-4 py-2 text-sm font-bold text-text-main shadow-sm hover:bg-background"
        >
          {isRtl ? 'خروج' : 'Logout'}
        </button>
      }
    />
  );
}

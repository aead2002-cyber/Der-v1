import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

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
  const showSidebar = navigationItems.length > 0;
  const displayName = user?.displayName || user?.email || '—';
  const initials = (displayName || '—')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || 'U';

  return (
    <div className="min-h-screen bg-[#f8fafc]" dir="rtl">
      <div className={cn('flex min-h-screen flex-col', showSidebar && 'lg:flex-row')}>
        {showSidebar ? (
          <aside className="border-b border-slate-200 bg-[#0f172a] text-white lg:order-2 lg:w-[300px] lg:border-b-0 lg:border-l lg:border-slate-800">
            <div className="px-6 py-7">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/10">
                  <span className="text-xl font-black">{platformTitle.slice(0, 1)}</span>
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight">{platformTitle}</h1>
                  <p className="text-xs font-medium text-slate-300">{platformSubtitle}</p>
                </div>
              </div>

              <nav className="space-y-1">
                {navigationItems.map((item) => {
                  const active = location.pathname === item.path;
                  const Icon = item.icon;
                  const isBack = item.path === '/platforms';
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        'flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200',
                        active ? 'bg-white text-slate-950 shadow-lg shadow-black/10' : 'text-slate-200 hover:bg-white/10 hover:text-white',
                        isBack && 'mt-3 border-t border-white/10 pt-4'
                      )}
                    >
                      <span className="flex items-center gap-3">
                        {Icon ? <Icon className={cn('h-4 w-4', active ? 'text-slate-950' : 'text-slate-300')} /> : null}
                        <span>{item.label}</span>
                      </span>
                      {isBack ? (isRtl ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />) : null}
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11 border border-white/10">
                    <AvatarImage src={user?.photoURL} alt={displayName} />
                    <AvatarFallback className="bg-white/10 text-sm font-black text-white">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">{displayName}</p>
                    <p className="truncate text-xs text-slate-300">{user?.email}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="mt-4 w-full justify-start gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-slate-100 hover:bg-white/10 hover:text-white"
                  onClick={logout}
                >
                  <span>تسجيل الخروج</span>
                </Button>
              </div>
            </div>
          </aside>
        ) : null}

        <div className="flex min-h-screen flex-1 flex-col lg:order-1">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="flex flex-col gap-4 px-6 py-4 lg:px-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">{platformTitle}</p>
                  <h2 className="mt-1 text-lg font-black text-slate-900">{platformSubtitle}</h2>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 sm:flex">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.photoURL} alt={displayName} />
                      <AvatarFallback className="bg-slate-900 text-[10px] font-black text-white">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="text-right leading-tight">
                      <p className="max-w-[180px] truncate text-sm font-bold text-slate-900">{displayName}</p>
                      <p className="max-w-[180px] truncate text-[11px] text-slate-500">{user?.email}</p>
                    </div>
                  </div>
                  <Button variant="outline" className="rounded-full border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50" onClick={logout}>
                    <span className="ms-2">خروج</span>
                  </Button>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

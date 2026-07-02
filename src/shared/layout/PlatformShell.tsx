import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ChevronDown, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export interface PlatformShellNavigationItem {
  key?: string;
  label: string;
  path: string;
  icon?: React.ComponentType<{ className?: string }>;
  section?: string;
  children?: PlatformShellNavigationItem[];
  isBack?: boolean;
  badge?: React.ReactNode;
}

export interface PlatformShellNavigationGroup {
  label?: string;
  items: PlatformShellNavigationItem[];
}

export interface PlatformShellUser {
  displayName?: string;
  email?: string;
  photoURL?: string;
}

export interface PlatformShellProps {
  platformTitle: string;
  platformSubtitle?: string;
  logo?: React.ReactNode;
  navigationItems?: PlatformShellNavigationItem[];
  navigationGroups?: PlatformShellNavigationGroup[];
  expandedItemKeys?: string[];
  onToggleExpandedItem?: (key: string) => void;
  children: React.ReactNode;
  isRtl?: boolean;
  activePath?: string;
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
  user?: PlatformShellUser;
  headerTitle?: React.ReactNode;
  headerSubtitle?: React.ReactNode;
  headerActions?: React.ReactNode;
  sidebarFooter?: React.ReactNode;
  sidebarExtra?: React.ReactNode;
  mobileEnabled?: boolean;
}

export function PlatformShell({
  platformTitle,
  platformSubtitle,
  logo,
  navigationItems = [],
  navigationGroups,
  expandedItemKeys,
  onToggleExpandedItem,
  children,
  isRtl = false,
  activePath,
  onNavigate,
  onLogout,
  user,
  headerTitle,
  headerSubtitle,
  headerActions,
  sidebarFooter,
  sidebarExtra,
  mobileEnabled = false,
}: PlatformShellProps) {
  const sidebarSide = isRtl ? 'right' : 'left';
  const [mobileOpen, setMobileOpen] = useState(false);
  const displayName = user?.displayName || user?.email || '';
  const initials =
    (displayName || 'U')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase() || 'U';

  const groups = useMemo<PlatformShellNavigationGroup[]>(() => {
    if (navigationGroups?.length) {
      return navigationGroups;
    }

    if (navigationItems.length) {
      return [{ items: navigationItems }];
    }

    return [];
  }, [navigationGroups, navigationItems]);

  const getItemKey = (item: PlatformShellNavigationItem) => item.key ?? item.path ?? item.label;

  const resolveIsActive = (path: string) => activePath === path || activePath?.startsWith(`${path}/`);

  const isItemActive = (item: PlatformShellNavigationItem): boolean => {
    if (resolveIsActive(item.path)) {
      return true;
    }

    return item.children?.some(child => isItemActive(child)) ?? false;
  };

  const initialExpandedKeys = useMemo(() => {
    const keys = new Set<string>();

    const visitItems = (items: PlatformShellNavigationItem[]) => {
      items.forEach(item => {
        if (item.children?.length) {
          keys.add(getItemKey(item));
          visitItems(item.children);
        }
      });
    };

    groups.forEach(group => visitItems(group.items));

    return keys;
  }, [groups]);

  const [localExpandedKeys, setLocalExpandedKeys] = useState<Set<string>>(() => initialExpandedKeys);

  useEffect(() => {
    if (expandedItemKeys === undefined) {
      setLocalExpandedKeys(new Set(initialExpandedKeys));
    }
  }, [expandedItemKeys, initialExpandedKeys]);

  useEffect(() => {
    setMobileOpen(false);
  }, [activePath]);

  const isItemExpanded = (item: PlatformShellNavigationItem): boolean => {
    if (!item.children?.length) {
      return false;
    }

    const key = getItemKey(item);
    const childIsActive = item.children.some(child => isItemActive(child));

    if (expandedItemKeys !== undefined) {
      return expandedItemKeys.includes(key) || childIsActive;
    }

    return localExpandedKeys.has(key) || childIsActive;
  };

  const handleToggleExpandedItem = (item: PlatformShellNavigationItem) => {
    const key = getItemKey(item);

    if (onToggleExpandedItem) {
      onToggleExpandedItem(key);
    }

    if (expandedItemKeys === undefined) {
      setLocalExpandedKeys(prev => {
        const next = new Set(prev);

        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }

        return next;
      });
    }
  };

  const handleNavigate = (path: string) => {
    onNavigate?.(path);
    setMobileOpen(false);
  };

  const renderNavItem = (item: PlatformShellNavigationItem, depth = 0) => {
    const active = isItemActive(item);
    const Icon = item.icon;
    const hasChildren = (item.children || []).length > 0;
    const expanded = isItemExpanded(item);
    const paddingClass = depth === 0 ? 'px-6' : depth === 1 ? 'px-10' : 'px-12';
    const itemClassName = cn(
      'flex items-center justify-between gap-3 py-2.5 text-sm font-medium transition-all duration-200 border-l-4 outline-none',
      paddingClass,
      active
        ? 'bg-white/5 text-white border-blue-600'
        : 'border-transparent text-[#94a3b8] hover:bg-white/5 hover:text-white'
    );

    const content = (
      <>
        <span className="flex min-w-0 items-center gap-3">
          {Icon ? <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-white' : 'text-[#94a3b8]')} /> : null}
          <span className="truncate">{item.label}</span>
          {item.badge ? <span className="shrink-0">{item.badge}</span> : null}
        </span>
        {item.isBack ? (isRtl ? <ArrowLeft className="h-4 w-4 shrink-0" /> : <ArrowRight className="h-4 w-4 shrink-0" />) : null}
      </>
    );

    const itemControl = onNavigate ? (
      <button type="button" onClick={() => handleNavigate(item.path)} className={cn(itemClassName, hasChildren ? 'rounded-r-none' : '')}>
        {content}
      </button>
    ) : (
      <Link to={item.path} onClick={() => setMobileOpen(false)} className={cn(itemClassName, hasChildren ? 'rounded-r-none' : '')}>
        {content}
      </Link>
    );

    return (
      <div key={getItemKey(item)} className="space-y-0.5">
        {depth === 0 && item.section ? (
          <div className="px-6 pt-4 pb-1 text-[10px] font-black uppercase tracking-widest text-[#475569]">
            {item.section}
          </div>
        ) : null}

        <div className="flex items-stretch">
          {itemControl}
          {hasChildren ? (
            <button
              type="button"
              aria-expanded={expanded}
              aria-label={expanded ? `Collapse ${item.label}` : `Expand ${item.label}`}
              onClick={() => handleToggleExpandedItem(item)}
              className={cn(
                'flex w-10 items-center justify-center border-l border-white/10 bg-transparent text-white/70 transition-colors hover:bg-white/5 hover:text-white',
                active ? 'bg-white/5 text-white' : ''
              )}
            >
              <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', expanded && 'rotate-180')} />
            </button>
          ) : null}
        </div>

        {hasChildren && expanded ? (
          <div className="space-y-0.5 border-l border-white/10 bg-black/15 py-1">
            {item.children!.map(child => renderNavItem(child, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  const renderNavigation = () => (
    <nav className="space-y-1">
      {groups.map((group, groupIndex) => (
        <div key={group.label ?? `group-${groupIndex}`} className="space-y-1">
          {group.label ? (
            <div className="px-6 pt-4 pb-1 text-[10px] font-black uppercase tracking-widest text-[#475569]">
              {group.label}
            </div>
          ) : null}
          {group.items.map(item => (
            <React.Fragment key={getItemKey(item)}>{renderNavItem(item)}</React.Fragment>
          ))}
        </div>
      ))}
    </nav>
  );

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="px-6 py-7">
        <div className="mb-6 flex items-center gap-3">
          {logo ? (
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/10">
              {logo}
            </div>
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/10">
              <span className="text-xl font-black">{platformTitle.slice(0, 1)}</span>
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black tracking-tight">{platformTitle}</h1>
            {platformSubtitle ? <p className="truncate text-xs font-medium text-sidebar-foreground">{platformSubtitle}</p> : null}
          </div>
        </div>

        {sidebarExtra ? <div className="mb-5">{sidebarExtra}</div> : null}

        {groups.length > 0 ? renderNavigation() : null}
      </div>

      <div className="mt-auto p-4">
        {user ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11 border border-white/10">
                <AvatarImage src={user.photoURL} alt={displayName || platformTitle} />
                <AvatarFallback className="bg-white/10 text-sm font-black text-white">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{displayName || platformTitle}</p>
                {user.email ? <p className="truncate text-xs text-sidebar-foreground">{user.email}</p> : null}
              </div>
            </div>

            {onLogout ? (
              <Button
                variant="ghost"
                className="mt-4 w-full justify-start gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-white hover:bg-white/10 hover:text-white"
                onClick={onLogout}
              >
                <span>{isRtl ? 'تسجيل الخروج' : 'Logout'}</span>
              </Button>
            ) : null}
          </div>
        ) : null}

        {sidebarFooter ? <div className="mt-4">{sidebarFooter}</div> : null}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className={cn('flex min-h-screen flex-col', mobileEnabled && 'lg:flex-row')}>
        <aside
          className={cn(
            'border-b border-border-subtle bg-sidebar text-white lg:w-[300px] lg:border-b-0',
            mobileEnabled ? 'hidden lg:block' : '',
            sidebarSide === 'right' ? 'lg:order-2 lg:border-l lg:border-border-subtle' : 'lg:order-1 lg:border-r lg:border-border-subtle'
          )}
        >
          {renderSidebarContent()}
        </aside>

        <div className={cn('flex min-h-screen flex-1 flex-col', sidebarSide === 'right' ? 'lg:order-1' : 'lg:order-2')}>
          <header className="sticky top-0 z-20 border-b border-border-subtle bg-card/90 backdrop-blur">
            <div className="flex flex-col gap-4 px-6 py-4 lg:px-8">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  {mobileEnabled ? (
                    <div className="lg:hidden">
                      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                        <SheetTrigger render={<Button variant="ghost" size="icon-sm" className="rounded-full border border-border-subtle bg-background/90 text-text-main shadow-sm hover:bg-muted" />}>
                          <Menu className="h-4 w-4" />
                          <span className="sr-only">Open navigation</span>
                        </SheetTrigger>
                        <SheetContent side={sidebarSide} className="w-[min(320px,85vw)] border-none bg-sidebar p-0 text-white">
                          {renderSidebarContent()}
                        </SheetContent>
                      </Sheet>
                    </div>
                  ) : null}

                  <div className="min-w-0">
                    {headerTitle ? (
                      <div>{headerTitle}</div>
                    ) : (
                      <p className="text-xs font-bold uppercase tracking-[0.24em] text-text-muted">{platformTitle}</p>
                    )}
                    {headerSubtitle ? (
                      <div className="mt-1">{headerSubtitle}</div>
                    ) : platformSubtitle ? (
                      <h2 className="mt-1 text-lg font-black text-text-main">{platformSubtitle}</h2>
                    ) : null}
                  </div>
                </div>
                {headerActions ? <div className="flex items-center gap-3">{headerActions}</div> : null}
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

export default PlatformShell;

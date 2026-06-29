import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShieldCheck, 
  FileText, 
  Users, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Globe,
  Bell,
  History,
  ChevronDown,
  ChevronRight,
  UserRound,
  Lock,
  Camera,
  Check,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/AuthContext';
import { filesApi, resolveFileUrl } from '@/services/filesApi';
import { notificationsApi } from '@/services/notificationsApi';
import { PasswordRulesList, isPasswordValid } from './shared/PasswordRules';
import { Notification } from '@/types';
import { stripPlatformPrefix } from '@/shared/layout/platformRouting';

import { Logo } from './Logo';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const currentPath = stripPlatformPrefix(location.pathname);
  const { user, logout, updateProfile, can } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [expandedItems, setExpandedItems] = React.useState<string[]>([]);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);

  // Profile Dialog State
  const [isProfileDialogOpen, setIsProfileDialogOpen] = React.useState(false);
  const [profileData, setProfileData] = React.useState({
    displayName: '',
    displayNameEn: '',
    photoURL: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  useEffect(() => {
    if (user) {
      setProfileData(prev => ({
        ...prev,
        displayName: user.displayName || '',
        displayNameEn: (user as any).displayNameEn || '',
        photoURL: user.photoURL || ''
      }));
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (profileData.newPassword) {
      if (!isPasswordValid(profileData.newPassword)) {
        toast.error(isRtl ? 'كلمة المرور لا تستوفي الشروط' : 'Password does not meet requirements');
        return;
      }
      if (profileData.newPassword !== profileData.confirmPassword) {
        toast.error(t('passwords_do_not_match'));
        return;
      }
    }

    setIsSavingProfile(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      updateProfile({
        displayName: profileData.displayName,
        displayNameEn: profileData.displayNameEn,
        photoURL: profileData.photoURL
      } as any);

      toast.success(t('profile_updated_success'));
      setIsProfileDialogOpen(false);
      setProfileData(prev => ({ ...prev, newPassword: '', confirmPassword: '' }));
    } catch (error) {
      toast.error(t('error_updating_profile'));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('select_image_file') || 'Please select an image file');
      return;
    }
    const uploaded = await filesApi.uploadFile(file);
    if (!uploaded) {
      toast.error(t('upload_failed') || 'Upload failed');
      return;
    }
    setProfileData(prev => ({ ...prev, photoURL: uploaded.url }));
  };

  const isRtl = i18n.language === 'ar';

  useEffect(() => {
    if (user) {
      const updateNotifications = async () => {
        try {
          const all = await notificationsApi.getNotifications();
          const mine = all.filter(n => n.userId === user.uid);
          setNotifications(mine);
          setUnreadCount(mine.filter(n => !n.isRead).length);
        } catch (error) {
          console.error('Failed to load notifications', error);
        }
      };
      
      void updateNotifications();
      const interval = setInterval(() => {
        void updateNotifications();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleMarkAsRead = async (id: string) => {
    const target = notifications.find(n => n.id === id);
    if (!target || target.isRead) return;

    try {
      await notificationsApi.updateNotification(id, { isRead: true });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (user) {
      const unread = notifications.filter(n => !n.isRead);
      try {
        await Promise.all(unread.map(n => notificationsApi.updateNotification(n.id, { isRead: true })));
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      } catch (error) {
        console.error('Failed to mark all notifications as read', error);
      }
    }
  };

  useEffect(() => {
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language, isRtl]);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
  };

  // Per-route permission map — must stay in sync with App.tsx ProtectedRoute keys.
  const NAV_PERMS: Record<string, string> = {
    '/dashboard': 'dashboard.view',
    '/my-tasks': 'tasks.my_tasks.view',
    '/frameworks': 'frameworks.view',
    '/policies': 'policies.view',
    '/policy-items': 'policies.policy_items.view',
    '/standards': 'standards.view',
    '/procedures': 'procedures.view',
    '/commitments': 'commitments.view',
    '/incidents': 'incidents.view',
    '/risks': 'risks.view',
    '/reports': 'reports.view',
    '/audit': 'reports.audit_trail.view',
    '/users': 'users.view',
  };
  const visible = (href?: string) => !href || !NAV_PERMS[href] || can(NAV_PERMS[href]);

  const rawNavGroups = [
    {
      title: isRtl ? 'الرئيسية' : 'Main',
      items: [
        { name: t('dashboard'), href: '/dashboard', emoji: '📊' },
        { name: t('my_tasks'), href: '/my-tasks', emoji: '✅' },
      ]
    },
    {
      title: isRtl ? 'الحوكمة والالتزام' : 'GRC & Compliance',
      items: [
        {
          name: isRtl ? 'الامتثال والحوكمة' : 'Compliance & Governance',
          id: 'compliance',
          emoji: '⚖️',
          children: [
            { name: t('frameworks'), href: '/frameworks', emoji: '🛡️' },
            { name: t('policies'), href: '/policies', emoji: '📜' },
            { name: t('policy_items'), href: '/policy-items', emoji: '📑' },
            { name: t('standards'), href: '/standards', emoji: '📋' },
            { name: t('procedures'), href: '/procedures', emoji: '✅' },
          ]
        },
        { name: t('commitments') || 'Commitments', href: '/commitments', emoji: '🤝' },
        { name: isRtl ? 'البلاغات' : 'Incidents', href: '/incidents', emoji: '🚨' },
      ]
    },
    {
      title: isRtl ? 'إدارة المخاطر' : 'Risk Management',
      items: [
        { name: isRtl ? 'إدارة المخاطر' : 'Risk Management', href: '/risks', emoji: '⚠️' },
      ]
    },
    {
      title: isRtl ? 'التقارير والمراقبة' : 'Reports & Monitoring',
      items: [
        { name: t('reports'), href: '/reports', emoji: '📑' },
        {
          name: t('monitoring'),
          id: 'monitoring',
          emoji: '🔍',
          children: [
            { name: t('audit_trail'), href: '/audit', emoji: '🕒' },
            { name: t('notifications_monitoring'), href: '/notifications', emoji: '🔔' },
          ]
        },
      ]
    },
    {
      title: isRtl ? 'الإدارة' : 'Administration',
      items: [
        { name: t('users'), href: '/users', emoji: '👤' },
      ]
    }
  ];

  // Filter out items the user can't access; drop sub-menus that end up empty;
  // drop groups whose items array becomes empty.
  const navGroups = rawNavGroups
    .map(g => ({
      ...g,
      items: g.items
        .map((it: any) =>
          it.children
            ? { ...it, children: it.children.filter((c: any) => visible(c.href)) }
            : it
        )
        .filter((it: any) => (it.children ? it.children.length > 0 : visible(it.href))),
    }))
    .filter(g => g.items.length > 0);

  const navItems = navGroups.flatMap(g => g.items);

  useEffect(() => {
    navItems.forEach(item => {
      if (item.children && item.children.some(child => child.href === currentPath)) {
        if (!expandedItems.includes(item.id || item.name)) {
          setExpandedItems(prev => [...prev, item.id || item.name]);
        }
      }
    });
  }, [currentPath]);

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId) 
        : [...prev, itemId]
    );
  };

  const getActiveItemName = () => {
    for (const item of navItems) {
      if (item.href === currentPath) return item.name;
      if (item.children) {
        const child = item.children.find(c => c.href === currentPath);
        if (child) return child.name;
      }
    }
    return t('dashboard');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#0f172a] text-[#94a3b8]">
      <div className="bg-white px-4 py-3 flex items-center justify-center">
        <Logo
          size="lg"
          containerClassName="w-auto h-16"
          className="w-auto h-full object-contain"
        />
      </div>
      
      <nav className="flex-1 px-0 py-2 space-y-6 overflow-y-auto no-scrollbar pb-8">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <h3 className="px-6 text-[10px] font-black uppercase tracking-widest text-[#475569] mb-2">
              {group.title}
            </h3>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const itemId = item.id || item.name;
                if (item.children) {
                  const isExpanded = expandedItems.includes(itemId);
                  const isChildActive = item.children.some(c => currentPath === c.href);
                  
                  return (
                    <div key={itemId} className="space-y-0.5">
                      <button
                        onClick={() => toggleExpand(itemId)}
                        className={cn(
                          "w-full flex items-center justify-between px-6 py-2.5 transition-all duration-200 text-sm font-medium border-l-4 border-transparent outline-none",
                          isChildActive ? "text-white bg-white/5" : "hover:text-white hover:bg-white/5"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg leading-none">{item.emoji}</span>
                          <span>{item.name}</span>
                        </div>
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="w-3 h-3 text-[#475569]" />
                        </motion.div>
                      </button>
                      
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="overflow-hidden bg-black/20"
                          >
                            {item.children.map((child) => {
                              const isActive = currentPath === child.href;
                              return (
                                <Link
                                  key={child.name}
                                  to={child.href}
                                  className={cn(
                                    "flex items-center gap-3 px-12 py-2 transition-all duration-200 text-[13px] font-medium border-l-4",
                                    isActive 
                                      ? "text-white border-blue-600 bg-white/5" 
                                      : "hover:text-white hover:bg-white/5 border-transparent"
                                  )}
                                >
                                  <span className="text-base leading-none opacity-70 group-hover:opacity-100">{child.emoji}</span>
                                  <span>{child.name}</span>
                                </Link>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                }
                const isActive = currentPath === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 px-6 py-2.5 transition-all duration-200 text-sm font-medium border-l-4",
                      isActive 
                        ? "bg-white/5 text-white border-blue-600" 
                        : "hover:text-white hover:bg-white/5 border-transparent"
                    )}
                  >
                    <span className="text-lg leading-none">{item.emoji}</span>
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 mt-auto space-y-0.5">
        <Link to="/settings" className="flex items-center gap-3 px-6 py-2 text-sm font-medium hover:text-white transition-colors">
          <span>⚙️</span>
          <span>{t('settings')}</span>
        </Link>
        <Button 
          variant="ghost" 
          className="w-full justify-start text-[#94a3b8] hover:text-white hover:bg-white/5 gap-3 px-6 h-11"
          onClick={logout}
        >
          <LogOut className="w-4 h-4" />
          <span className="font-medium text-sm">{t('logout')}</span>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-[240px] fixed inset-y-0 z-50">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300 min-h-screen",
        isRtl ? "lg:mr-[240px]" : "lg:ml-[240px]"
      )}>
        {/* Header */}
        <header className="sticky top-0 z-40 w-full bg-white border-b border-[#e2e8f0] h-16 flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden" />}>
                <Menu className="w-6 h-6" />
              </SheetTrigger>
              <SheetContent side={isRtl ? "right" : "left"} className="p-0 w-[240px] border-none">
                <SidebarContent />
              </SheetContent>
            </Sheet>
            
            <h1 className="text-lg font-bold text-[#1e293b]">
              {getActiveItemName()}
            </h1>
          </div>

          <div className="flex items-center gap-6">
            <span 
              className="text-[13px] font-bold text-blue-600 cursor-pointer hover:underline"
              onClick={toggleLanguage}
            >
              {i18n.language === 'ar' ? 'English' : 'العربية'}
            </span>
            
            <DropdownMenu>
              <DropdownMenuTrigger nativeButton={false} render={
                <div className="relative cursor-pointer hover:bg-slate-50 p-2 rounded-full transition-colors">
                  <Bell className="w-5 h-5 text-[#64748b]" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white shadow-sm animate-pulse"></span>
                  )}
                </div>
              } />
              <DropdownMenuContent align={isRtl ? "start" : "end"} className="w-80 p-0 overflow-hidden shadow-2xl border-slate-100">
                <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-black text-[13px] uppercase tracking-wider text-slate-800">
                    {t('notifications')}
                    {unreadCount > 0 && <span className="ml-2 bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-[10px]">{unreadCount}</span>}
                  </h3>
                  {unreadCount > 0 && (
                    <button 
                      onClick={handleMarkAllAsRead}
                      className="text-[10px] font-bold text-blue-600 hover:underline"
                    >
                      {t('mark_all_as_read')}
                    </button>
                  )}
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((n) => (
                      <div 
                        key={n.id} 
                        className={cn(
                          "p-4 border-b border-slate-50 transition-colors cursor-default",
                          !n.isRead ? "bg-blue-50/30" : "hover:bg-slate-50/50"
                        )}
                        onClick={() => !n.isRead && handleMarkAsRead(n.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "w-2 h-2 rounded-full mt-1.5 shrink-0",
                            !n.isRead ? "bg-blue-600" : "bg-transparent"
                          )} />
                          <div className="space-y-1">
                            <p className={cn(
                              "text-[13px] leading-tight",
                              !n.isRead ? "font-black text-slate-900" : "font-medium text-slate-600"
                            )}>
                              {isRtl ? n.titleAr : n.titleEn}
                            </p>
                            <p className="text-[12px] text-slate-500 font-medium">
                              {isRtl ? n.messageAr : n.messageEn}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                              {new Date(n.createdAt).toLocaleTimeString(isRtl ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center bg-white">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Bell className="w-6 h-6 text-slate-300" />
                      </div>
                      <p className="text-xs font-bold text-slate-400">
                        {t('no_new_notifications')}
                      </p>
                    </div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger nativeButton={true} render={<button className="w-8 h-8 rounded-full bg-[#e2e8f0] border border-[#e2e8f0] cursor-pointer overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 flex items-center justify-center" />}>
                <Avatar className="w-full h-full">
                  <AvatarImage src={resolveFileUrl(user?.photoURL || '') || user?.photoURL} />
                  <AvatarFallback className="bg-[#e2e8f0] text-[#1e293b] text-[10px] font-bold">
                    {(isRtl ? user?.displayName : ((user as any)?.displayNameEn || user?.displayName))?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isRtl ? "start" : "end"} className="w-56 mt-2">
                <div className="px-2 py-1.5 flex flex-col border-b border-border mb-1">
                  <span className="font-bold text-sm">{isRtl ? user?.displayName : ((user as any)?.displayNameEn || user?.displayName)}</span>
                  <span className="text-[10px] text-muted-foreground">{user?.email}</span>
                </div>
                <DropdownMenuItem nativeButton={false} onClick={() => setIsProfileDialogOpen(true)}>
                  <UserRound className="w-4 h-4 mr-2" />
                  {t('profile')}
                </DropdownMenuItem>
                <DropdownMenuItem nativeButton={false} render={<Link to="/settings" />}>
                  <Settings className="w-4 h-4 mr-2" />
                  {t('settings')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-rose-600" onClick={logout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>

      {/* Profile Management Dialog */}
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="h-1.5 bg-blue-600 w-full" />
          <form onSubmit={handleUpdateProfile}>
            <div className="p-8 space-y-6">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                  <UserRound className="w-6 h-6 text-blue-600" />
                  {t('profile_management')}
                </DialogTitle>
              </DialogHeader>

              <div className="flex flex-col items-center gap-4 py-4">
                <div className="relative group">
                  <Avatar className="w-24 h-24 border-4 border-slate-100 shadow-md transition-transform group-hover:scale-105">
                    <AvatarImage src={resolveFileUrl(profileData.photoURL || '') || profileData.photoURL} />
                    <AvatarFallback className="bg-slate-200 text-slate-500 text-2xl font-black">
                      {profileData.displayName?.split(' ').map(n => n[0]).join('') || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <label 
                    htmlFor="profile-photo" 
                    className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white cursor-pointer shadow-lg hover:bg-blue-700 transition-colors border-2 border-white"
                  >
                    <Camera className="w-4 h-4" />
                    <input 
                      id="profile-photo" 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={handlePhotoChange}
                    />
                  </label>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  {t('click_to_change_photo')}
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                    {isRtl ? 'الاسم بالعربي' : 'Arabic Name'}
                  </Label>
                  <Input
                    value={profileData.displayName}
                    readOnly
                    className="rounded-xl border-slate-200 h-11 bg-slate-50 cursor-not-allowed opacity-70"
                    placeholder={isRtl ? 'الاسم بالعربي' : 'Arabic name'}
                  />
                  <p className="text-[10px] text-slate-400 font-medium">
                    {t('display_name_readonly_hint')}
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                    {isRtl ? 'الاسم بالإنجليزي' : 'English Name'}
                  </Label>
                  <Input
                    value={profileData.displayNameEn}
                    onChange={e => setProfileData(prev => ({ ...prev, displayNameEn: e.target.value }))}
                    className="rounded-xl border-slate-200 h-11 focus:ring-blue-600"
                    placeholder="e.g., Ahmed Al-Shehri"
                    dir="ltr"
                  />
                  <p className="text-[10px] text-slate-400 font-medium">
                    {isRtl ? 'يُعرض هذا الاسم عند تبديل اللغة إلى الإنجليزية' : 'Shown when switching the interface to Arabic-fallback or English'}
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500">{t('new_password')}</Label>
                  <div className="relative">
                    <Lock className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400", isRtl ? "right-3" : "left-3")} />
                    <Input 
                      type={showPassword ? "text" : "password"}
                      value={profileData.newPassword}
                      onChange={e => setProfileData(prev => ({ ...prev, newPassword: e.target.value }))}
                      className={cn("rounded-xl border-slate-200 h-11 focus:ring-blue-600", isRtl ? "pr-10 pl-10" : "pl-10 pr-10")}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors", isRtl ? "left-3" : "right-3")}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium tracking-tight">
                    {t('leave_empty_to_keep')}
                  </p>
                  {profileData.newPassword && (
                    <PasswordRulesList value={profileData.newPassword} />
                  )}
                </div>

                {profileData.newPassword && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid gap-2"
                  >
                    <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500">{t('confirm_password')}</Label>
                    <div className="relative">
                      <Lock className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400", isRtl ? "right-3" : "left-3")} />
                      <Input 
                        type={showConfirmPassword ? "text" : "password"}
                        value={profileData.confirmPassword}
                        onChange={e => setProfileData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className={cn("rounded-xl border-slate-200 h-11 focus:ring-blue-600", isRtl ? "pr-10 pl-10" : "pl-10 pr-10")}
                        placeholder="••••••••"
                        required={!!profileData.newPassword}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors", isRtl ? "left-3" : "right-3")}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            <DialogFooter className="p-8 pt-0 gap-3 sm:justify-start">
              <Button 
                type="submit" 
                disabled={isSavingProfile}
                className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 shadow-lg shadow-blue-600/20"
              >
                {isSavingProfile ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    {t('save_changes')}
                  </>
                )}
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsProfileDialogOpen(false)}
                className="flex-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold h-11"
              >
                {t('cancel')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

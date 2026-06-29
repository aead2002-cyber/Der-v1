import React from 'react';
import { PlatformLayout, PlatformNavigationItem } from '@/shared/layout/PlatformLayout';
import { LayoutDashboard, Gavel, Users, CalendarRange, Search, BellRing, Files, ScrollText, ClipboardList, Settings, ArrowLeft } from 'lucide-react';

const navigationItems: PlatformNavigationItem[] = [
  { label: 'لوحة التحكم', path: '/legal/dashboard', icon: LayoutDashboard },
  { label: 'القضايا', path: '/legal/cases', icon: Gavel },
  { label: 'الأطراف والجهات', path: '/legal/parties', icon: Users },
  { label: 'جلسات القضايا', path: '/legal/case-sessions', icon: CalendarRange },
  { label: 'التحقيقات', path: '/legal/investigations', icon: Search },
  { label: 'الاستدعاءات', path: '/legal/summons', icon: BellRing },
  { label: 'جلسات التحقيق', path: '/legal/investigation-sessions', icon: ScrollText },
  { label: 'الوثائق القانونية', path: '/legal/documents', icon: Files },
  { label: 'التقارير', path: '/legal/reports', icon: ClipboardList },
  { label: 'سجل العمليات', path: '/legal/audit', icon: Files },
  { label: 'الإعدادات', path: '/legal/settings', icon: Settings },
  { label: 'العودة للمنصات', path: '/platforms', icon: ArrowLeft },
];

export function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlatformLayout
      platformTitle="القانونية"
      platformSubtitle="نظام إدارة القضايا والتحقيقات والعقود"
      navigationItems={navigationItems}
    >
      {children}
    </PlatformLayout>
  );
}

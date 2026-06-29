import type { Platform } from '@/shared/types/platform';

export const PLATFORMS: Platform[] = [
  {
    code: 'DER3',
    nameAr: 'درع',
    nameEn: 'DER3',
    descriptionAr: 'نظام إدارة الأمن السيبراني والحوكمة والالتزام',
    route: '/der3',
    logoUrl: '/der3-logo.png',
    isActive: true,
  },
  {
    code: 'LEGAL',
    nameAr: 'القانونية',
    nameEn: 'Legal',
    descriptionAr: 'نظام إدارة القضايا والتحقيقات والعقود والوثائق القانونية',
    route: '/legal',
    isActive: true,
  },
];

export const getPlatformByCode = (code: string): Platform | undefined =>
  PLATFORMS.find(platform => platform.code === code);

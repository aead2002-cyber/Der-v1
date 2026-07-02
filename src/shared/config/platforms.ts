import type { Platform } from '@/shared/types/platform';
import { der3PlatformConfig } from '@/modules/der3/platform.config';
import { legalPlatformConfig } from '@/modules/legal/platform.config';

export const PLATFORMS: Platform[] = [
  {
    code: der3PlatformConfig.id,
    nameAr: der3PlatformConfig.nameAr,
    nameEn: der3PlatformConfig.nameEn,
    descriptionAr: der3PlatformConfig.descriptionAr,
    route: der3PlatformConfig.routePrefix,
    logoUrl: der3PlatformConfig.logoUrl,
    isActive: der3PlatformConfig.enabled,
  },
  {
    code: legalPlatformConfig.id,
    nameAr: legalPlatformConfig.nameAr,
    nameEn: legalPlatformConfig.nameEn,
    descriptionAr: legalPlatformConfig.descriptionAr,
    route: legalPlatformConfig.routePrefix,
    isActive: legalPlatformConfig.enabled,
  },
];

export const getPlatformByCode = (code: string): Platform | undefined =>
  PLATFORMS.find(platform => platform.code === code);
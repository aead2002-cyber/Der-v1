import type { PlatformCode } from '@/shared/types/platform';
import type { User } from '@/types';

/**
 * TEMPORARY platform access mapping.
 * Remove once backend-provided platform authorization is available.
 */
const TEMPORARY_PLATFORM_ACCESS: Record<string, PlatformCode[]> = {
  'alhnoof@mcci.org.sa': ['DER3', 'LEGAL'],
  'ahmad_eid@mcci.org.sa': ['DER3'],
};

export const getTemporaryPlatformAccess = (email: string): PlatformCode[] => {
  const normalized = email.trim().toLowerCase();
  return TEMPORARY_PLATFORM_ACCESS[normalized] || ['DER3'];
};

export const applyTemporaryPlatformAccess = (user: User): User => {
  const platforms = user.platforms?.length ? user.platforms : getTemporaryPlatformAccess(user.email);
  return { ...user, platforms };
};

export const resolvePlatformAccess = (user: User): User => {
  return Object.prototype.hasOwnProperty.call(user, 'platforms') ? user : applyTemporaryPlatformAccess(user);
};

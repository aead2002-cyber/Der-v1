export type PlatformKey = 'DER3' | 'RASED';

const PLATFORM_ACCESS: Record<string, PlatformKey[]> = {
  'alhnoof@mcci.org.sa': ['DER3'],
  'ahmad_eid@mcci.org.sa': ['DER3'],
};

export function getUserPlatforms(email: string): PlatformKey[] {
  const normalized = email.trim().toLowerCase();
  return PLATFORM_ACCESS[normalized] || [];
}

export function canAccessPlatform(email: string, platform: PlatformKey): boolean {
  return getUserPlatforms(email).includes(platform);
}

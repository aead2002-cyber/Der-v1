const PLATFORM_PREFIXES = ['/der3', '/legal'] as const;

export const stripPlatformPrefix = (pathname: string): string => {
  for (const prefix of PLATFORM_PREFIXES) {
    if (pathname === prefix) return '/';
    if (pathname.startsWith(`${prefix}/`)) {
      return pathname.slice(prefix.length) || '/';
    }
  }
  return pathname || '/';
};

export const getPlatformBasePath = (pathname: string): string => {
  if (pathname.startsWith('/der3')) return '/der3';
  if (pathname.startsWith('/legal')) return '/legal';
  return '';
};

export const buildPlatformHref = (pathname: string, path: string): string => {
  const base = getPlatformBasePath(pathname);
  return `${base}${path}`;
};

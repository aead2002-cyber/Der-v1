export type PlatformCode = 'DER3' | 'LEGAL';

export interface Platform {
  code: PlatformCode;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  route: string;
  logoUrl?: string;
  isActive: boolean;
}

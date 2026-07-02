export interface ModulePlatformConfig {
  id: 'LEGAL';
  nameAr: string;
  nameEn: string;
  routePrefix: '/legal';
  enabled: boolean;
  accessKey: 'LEGAL';
  descriptionAr: string;
}

export const legalPlatformConfig: ModulePlatformConfig = {
  id: 'LEGAL',
  nameAr: 'القانونية',
  nameEn: 'Legal',
  routePrefix: '/legal',
  enabled: true,
  accessKey: 'LEGAL',
  descriptionAr: 'نظام إدارة القضايا والتحقيقات والعقود والوثائق القانونية',
};

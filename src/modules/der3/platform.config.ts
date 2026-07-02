export interface ModulePlatformConfig {
  id: 'DER3';
  nameAr: string;
  nameEn: string;
  routePrefix: '/der3';
  enabled: boolean;
  accessKey: 'DER3';
  descriptionAr: string;
  logoUrl: string;
}

export const der3PlatformConfig: ModulePlatformConfig = {
  id: 'DER3',
  nameAr: 'درع',
  nameEn: 'DER3',
  routePrefix: '/der3',
  enabled: true,
  accessKey: 'DER3',
  descriptionAr: 'نظام إدارة الأمن السيبراني والحوكمة والالتزام',
  logoUrl: '/der3-logo.png',
};

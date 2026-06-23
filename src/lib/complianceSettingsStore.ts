import { ComplianceSettings } from '@/types';
import { defaultComplianceSettings } from './progressHelpers';

const COMPLIANCE_SETTINGS_KEY = 'der3_compliance_settings';

const cloneDefaultComplianceSettings = (): ComplianceSettings => ({
  thresholds: defaultComplianceSettings.thresholds.map(threshold => ({ ...threshold })),
  systemLogo: defaultComplianceSettings.systemLogo,
});

export const getComplianceSettings = (): ComplianceSettings => {
  if (typeof window === 'undefined') {
    return cloneDefaultComplianceSettings();
  }

  const raw = window.localStorage.getItem(COMPLIANCE_SETTINGS_KEY);
  if (!raw) {
    return cloneDefaultComplianceSettings();
  }

  return JSON.parse(raw) as ComplianceSettings;
};

export const saveComplianceSettings = (settings: ComplianceSettings): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(COMPLIANCE_SETTINGS_KEY, JSON.stringify(settings));
};

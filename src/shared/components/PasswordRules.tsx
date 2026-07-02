import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PasswordRule {
  key: string;
  labelAr: string;
  labelEn: string;
  test: (pw: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { key: 'length', labelAr: '8 ط®ط§ظ†ط§طھ ط¹ظ„ظ‰ ط§ظ„ط£ظ‚ظ„', labelEn: 'At least 8 characters', test: pw => pw.length >= 8 },
  { key: 'uppercase', labelAr: 'ط­ط±ظپ ظƒط¨ظٹط± ظˆط§ط­ط¯ ط¹ظ„ظ‰ ط§ظ„ط£ظ‚ظ„ (A-Z)', labelEn: 'At least one uppercase letter (A-Z)', test: pw => /[A-Z]/.test(pw) },
  { key: 'lowercase', labelAr: 'ط­ط±ظپ طµط؛ظٹط± ظˆط§ط­ط¯ ط¹ظ„ظ‰ ط§ظ„ط£ظ‚ظ„ (a-z)', labelEn: 'At least one lowercase letter (a-z)', test: pw => /[a-z]/.test(pw) },
  { key: 'digit', labelAr: 'ط±ظ‚ظ… ظˆط§ط­ط¯ ط¹ظ„ظ‰ ط§ظ„ط£ظ‚ظ„ (0-9)', labelEn: 'At least one digit (0-9)', test: pw => /[0-9]/.test(pw) },
  { key: 'symbol', labelAr: 'ط±ظ…ط² ظˆط§ط­ط¯ ط¹ظ„ظ‰ ط§ظ„ط£ظ‚ظ„ (!@#$â€¦)', labelEn: 'At least one symbol (!@#$â€¦)', test: pw => /[^A-Za-z0-9]/.test(pw) }
];

export const isPasswordValid = (pw: string): boolean =>
  PASSWORD_RULES.every(r => r.test(pw));

interface Props {
  value: string;
  className?: string;
}

export function PasswordRulesList({ value, className }: Props) {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  return (
    <ul className={cn('grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] mt-2', className)}>
      {PASSWORD_RULES.map(r => {
        const ok = r.test(value);
        return (
          <li
            key={r.key}
            className={cn(
              'flex items-center gap-1.5 transition-colors',
              ok ? 'text-emerald-600' : 'text-rose-500'
            )}
          >
            <span
              className={cn(
                'w-4 h-4 rounded-full flex items-center justify-center shrink-0',
                ok ? 'bg-emerald-100' : 'bg-rose-100'
              )}
            >
              {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            </span>
            <span className="font-medium">{isRtl ? r.labelAr : r.labelEn}</span>
          </li>
        );
      })}
    </ul>
  );
}

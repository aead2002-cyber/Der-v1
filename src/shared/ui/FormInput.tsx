import * as React from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface FormInputProps extends React.ComponentProps<typeof Input> {
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  errorText?: React.ReactNode;
  containerClassName?: string;
  labelClassName?: string;
}

export function FormInput({
  label,
  helperText,
  errorText,
  containerClassName,
  labelClassName,
  className,
  id,
  ...props
}: FormInputProps) {
  const inputId = id || React.useId();

  return (
    <div className={cn('space-y-1.5', containerClassName)}>
      {label ? (
        <label htmlFor={inputId} className={cn('text-[12px] font-bold text-text-main', labelClassName)}>
          {label}
        </label>
      ) : null}
      <Input id={inputId} className={className} aria-invalid={!!errorText || undefined} {...props} />
      {errorText ? (
        <p className="text-[11px] font-medium text-input-error">{errorText}</p>
      ) : helperText ? (
        <p className="text-[11px] text-text-muted">{helperText}</p>
      ) : null}
    </div>
  );
}

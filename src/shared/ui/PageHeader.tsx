import * as React from 'react';

import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  className,
  titleClassName,
  descriptionClassName,
}: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col md:flex-row md:items-center justify-between gap-4', className)}>
      <div>
        <h1 className={cn('text-2xl font-bold text-text-main', titleClassName)}>{title}</h1>
        {description ? (
          <p className={cn('text-text-muted mt-1', descriptionClassName)}>{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

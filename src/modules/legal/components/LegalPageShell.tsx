import React from 'react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { PageHeader } from '@/shared/ui/PageHeader';

interface LegalPageShellProps {
  title: string;
  description: string;
  actionLabel?: string;
  children: React.ReactNode;
}

export function LegalPageShell({ title, description, actionLabel, children }: LegalPageShellProps) {
  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-border-subtle shadow-[var(--der3-shadow-card)]">
        <PageHeader
          title={title}
          description={description}
          actions={actionLabel ? <Button disabled className="rounded-full px-5">{actionLabel}</Button> : undefined}
          className="items-start gap-4 p-6 lg:items-end"
          titleClassName="text-3xl font-black tracking-tight text-text-main"
          descriptionClassName="max-w-3xl text-sm leading-7 text-text-muted"
        />
      </Card>
      {children}
    </div>
  );
}

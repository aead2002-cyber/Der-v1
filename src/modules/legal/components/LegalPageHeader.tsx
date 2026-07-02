import React from 'react';
import { Card } from '@/shared/ui/Card';
import { PageHeader } from '@/shared/ui/PageHeader';

export function LegalPageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <Card className="rounded-3xl border-border-subtle shadow-[var(--der3-shadow-card)]">
      <PageHeader
        title={title}
        description={subtitle}
        actions={actions}
        className="items-start gap-4 p-6 lg:items-end"
        titleClassName="text-3xl font-black tracking-tight text-text-main"
        descriptionClassName="mt-3 max-w-3xl text-sm leading-7 text-text-muted"
      />
    </Card>
  );
}

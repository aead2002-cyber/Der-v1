import React from 'react';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';

export default function LegalSectionPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader
        title={title}
        description={description}
        className="items-start gap-3"
        titleClassName="text-3xl font-black tracking-tight text-text-main"
        descriptionClassName="mt-3 text-sm leading-7 text-text-muted"
      />

      <EmptyState
        title="سيتم ربط هذه الصفحة بباك اند القانونية في المرحلة القادمة"
        description="هذه مساحة placeholder للمرحلة التالية من الربط الخلفي."
      />
    </div>
  );
}

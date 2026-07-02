import React from 'react';
import { FileText } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';

export function LegalEmptyState({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel?: string; onAction?: () => void; }) {
  return (
    <Card className="rounded-3xl border border-dashed border-border-subtle bg-card p-8 text-center shadow-[var(--der3-shadow-card)]">
      <FileText className="mx-auto mb-3 h-10 w-10 text-text-muted/40" />
      <h3 className="text-lg font-black text-text-main">{title}</h3>
      <p className="mt-2 text-sm text-text-muted">{description}</p>
      {actionLabel ? <Button type="button" onClick={onAction} className="mt-4 rounded-full px-5">{actionLabel}</Button> : null}
    </Card>
  );
}

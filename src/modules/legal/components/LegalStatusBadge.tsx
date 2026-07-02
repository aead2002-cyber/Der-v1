import React from 'react';
import { Badge } from '@/shared/ui/Badge';
import { cn } from '@/lib/utils';

export function LegalStatusBadge({ status, className }: { status: string; className?: string }) {
  const normalized = status.toLowerCase();
  const tone = normalized.includes('active') || normalized.includes('open') || normalized.includes('مفتوح') || normalized.includes('قائمة') || normalized.includes('نشط')
    ? 'border-success/20 bg-success/10 text-success'
    : normalized.includes('closed') || normalized.includes('مغلق') || normalized.includes('مغلقة') || normalized.includes('inactive')
      ? 'border-border-subtle bg-background text-text-muted'
      : 'border-primary/15 bg-primary/10 text-primary';
  return (
    <Badge variant="outline" className={cn('rounded-full px-3 py-1 text-xs font-bold', tone, className)}>
      {status}
    </Badge>
  );
}

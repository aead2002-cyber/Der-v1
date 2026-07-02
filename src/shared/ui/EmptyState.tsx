import * as React from 'react';
import { FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface EmptyStateProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Card className="p-8 text-center">
      <FileText className="mx-auto mb-3 h-10 w-10 text-text-muted/30" />
      <div className="text-sm font-bold text-text-main">{title}</div>
      {description ? <p className="mt-1 text-sm text-text-muted">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </Card>
  );
}

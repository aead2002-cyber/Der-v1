import * as React from 'react';
import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ErrorStateProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actionLabel?: React.ReactNode;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  actionLabel = 'Try again',
  onRetry,
}: ErrorStateProps) {
  return (
    <Card className="p-8 text-center border-danger-border bg-danger-background">
      <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-danger" />
      <div className="text-sm font-bold text-text-main">{title}</div>
      {description ? <p className="mt-1 text-sm text-text-muted">{description}</p> : null}
      {onRetry ? (
        <div className="mt-4 flex justify-center">
          <Button onClick={onRetry} className="bg-danger hover:bg-danger/90 text-white font-bold">
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

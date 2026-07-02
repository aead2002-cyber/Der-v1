import * as React from 'react';
import { Loader2 } from 'lucide-react';

import { Card } from '@/components/ui/card';

interface LoadingStateProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
}

export function LoadingState({
  title = 'Loading',
  description,
}: LoadingStateProps) {
  return (
    <Card className="p-8 text-center">
      <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
      <div className="text-sm font-bold text-text-main">{title}</div>
      {description ? <p className="mt-1 text-sm text-text-muted">{description}</p> : null}
    </Card>
  );
}

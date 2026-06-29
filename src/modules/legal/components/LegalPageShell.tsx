import React from 'react';
import { Button } from '@/components/ui/button';

interface LegalPageShellProps {
  title: string;
  description: string;
  actionLabel?: string;
  children: React.ReactNode;
}

export function LegalPageShell({ title, description, actionLabel, children }: LegalPageShellProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">{title}</h1>
          <p className="max-w-3xl text-sm leading-7 text-slate-600">{description}</p>
        </div>
        {actionLabel ? (
          <Button disabled className="rounded-full bg-slate-900 px-5 text-white hover:bg-slate-900">
            {actionLabel}
          </Button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

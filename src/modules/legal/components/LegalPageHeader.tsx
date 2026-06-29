import React from 'react';

export function LegalPageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">{title}</h1>
        {subtitle ? <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{subtitle}</p> : null}
      </div>
      {actions ? <div>{actions}</div> : null}
    </div>
  );
}

import React from 'react';

export default function LegalSectionPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">{title}</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
      </div>

      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 shadow-sm">
        <div className="rounded-2xl bg-slate-50 p-6 text-center">
          <p className="text-sm font-bold text-slate-900">
            سيتم ربط هذه الصفحة بباك اند القانونية في المرحلة القادمة
          </p>
        </div>
      </div>
    </div>
  );
}

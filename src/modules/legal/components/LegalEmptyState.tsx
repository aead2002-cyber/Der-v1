import React from 'react';

export function LegalEmptyState({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel?: string; onAction?: () => void; }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
      <h3 className="text-lg font-black text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      {actionLabel ? (
        <button type="button" onClick={onAction} className="mt-4 rounded-full bg-slate-900 px-5 py-2 text-sm font-bold text-white">{actionLabel}</button>
      ) : null}
    </div>
  );
}

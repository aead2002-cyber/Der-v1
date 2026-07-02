import React from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Edit2, Trash2, Plus, Calendar, User, FileText, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Procedure, Policy, Standard, User as UserType } from '@/types';
import { cn } from '@/lib/utils';

interface AccordionProps {
  roots: Procedure[];
  childrenByParent: Map<string, Procedure[]>;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  procedureCodes: Map<string, string>;
  isRtl: boolean;
  t: (key: string) => string;
  policies: Policy[];
  standards: Standard[];
  users: UserType[];
  onAddSub: (parentId: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  /** Hook the accordion to permissions so we don't show actions the user can't perform. */
  can?: (key: string) => boolean;
  getStatusBadge: (status: string) => React.ReactNode;
  getImportanceBadge: (importance: string) => React.ReactNode;
}

function ProcNode({
  proc,
  depth,
  ...rest
}: AccordionProps & { proc: Procedure; depth: number }) {
  const {
    childrenByParent,
    expandedIds,
    toggleExpand,
    procedureCodes,
    isRtl,
    policies,
    standards,
    users,
    onAddSub,
    onEdit,
    onDelete,
    getStatusBadge,
    getImportanceBadge,
    can,
  } = rest;
  const allow = (key: string) => !can || can(key);

  const children = childrenByParent.get(proc.id) || [];
  const hasChildren = children.length > 0;
  const isOpen = expandedIds.has(proc.id);
  const code = procedureCodes.get(proc.id) || '';
  const Chevron = isOpen ? ChevronDown : isRtl ? ChevronLeft : ChevronRight;

  const policy = policies.find(p => p.id === proc.policyId);
  const standard = standards.find(s => s.id === proc.standardId);

  const clampWeight = (w: any): number => {
    const n = typeof w === 'number' ? w : 1;
    if (!Number.isFinite(n)) return 1;
    return Math.max(1, Math.min(10, Math.round(n)));
  };
  const effectiveWeightOf = (p: Procedure): number => {
    const kids = childrenByParent.get(p.id) || [];
    if (kids.length === 0) return clampWeight((p as any).weight);
    return kids.reduce((sum, k) => sum + effectiveWeightOf(k), 0);
  };
  const procWeight = effectiveWeightOf(proc);

  return (
    <div className={cn('border border-border-subtle rounded-xl overflow-hidden bg-white', depth > 0 && 'mt-2')}>
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50/70 transition-colors',
          isOpen && 'bg-slate-50/40 border-b border-border-subtle'
        )}
        onClick={() => hasChildren && toggleExpand(proc.id)}
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); if (hasChildren) toggleExpand(proc.id); }}
          className={cn(
            'flex items-center justify-center w-7 h-7 rounded-md transition-colors shrink-0',
            hasChildren ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'bg-slate-100 text-slate-300 cursor-default'
          )}
          disabled={!hasChildren}
        >
          <Chevron className="w-4 h-4" />
        </button>

        <div className="font-mono text-[11px] font-bold px-2 py-1 rounded text-primary bg-primary/10 shrink-0">
          {code}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-bold text-text-main text-sm break-words whitespace-normal leading-relaxed">
            {isRtl ? proc.nameAr : proc.nameEn}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {policy && (
              <span className="text-[11px] text-text-muted">{isRtl ? policy.nameAr : policy.nameEn}</span>
            )}
            {standard && (
              <span className="text-[11px] text-text-muted">• {isRtl ? standard.nameAr : standard.nameEn}</span>
            )}
            {hasChildren && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-50 border border-violet-100 text-[10px] font-bold text-violet-700">
                <FileText className="w-3 h-3" />
                {children.length} {isRtl ? 'فرعي' : 'children'}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border',
              hasChildren
                ? 'bg-violet-50 text-violet-700 border-violet-100'
                : 'bg-amber-50 text-amber-700 border-amber-100'
            )}
            title={hasChildren
              ? (isRtl ? 'الوزن المحسوب من الأبناء' : 'Computed from children')
              : (isRtl ? 'وزن الإجراء' : 'Procedure weight')}
          >
            <Scale className="w-3 h-3" />
            {procWeight}
            {hasChildren && <span className="opacity-70">∑</span>}
          </div>
          {getImportanceBadge(proc.importance)}
          {getStatusBadge(proc.status)}
        </div>

        <div className="flex items-center gap-1 text-[12px] text-text-muted shrink-0">
          <Calendar className="w-3.5 h-3.5" />
          {proc.endDate}
        </div>

        <div className="flex items-center gap-1 shrink-0" title={(proc.assignedTo || []).map(uid => users.find(u => u.uid === uid)?.displayName || uid).join(', ')}>
          <User className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-[12px] font-medium text-text-main">{(proc.assignedTo || []).length}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {allow('procedures.add_sub') && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onAddSub(proc.id)}
              className="h-7 w-7 text-emerald-600 hover:bg-emerald-50"
              title={isRtl ? 'إضافة إجراء فرعي' : 'Add sub-procedure'}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          )}
          {allow('procedures.edit') && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(proc.id)}
              className="h-7 w-7 text-blue-600 hover:bg-blue-50"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
          )}
          {allow('procedures.delete') && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(proc.id)}
              className="h-7 w-7 text-rose-600 hover:bg-rose-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {hasChildren && isOpen && (
        <div className={cn('px-4 py-3 bg-slate-50/30 space-y-2', isRtl ? 'border-r-2 border-primary/20' : 'border-l-2 border-primary/20')}>
          {children.map(child => (
            <ProcNode key={child.id} {...rest} roots={[]} proc={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ProceduresAccordion(props: AccordionProps) {
  const { roots, isRtl } = props;
  if (roots.length === 0) {
    return (
      <div className="text-center py-12 text-text-muted">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
        {isRtl ? 'لا توجد إجراءات' : 'No procedures'}
      </div>
    );
  }
  return (
    <div className="p-4 space-y-3">
      {roots.map(root => (
        <ProcNode key={root.id} {...props} proc={root} depth={0} />
      ))}
    </div>
  );
}

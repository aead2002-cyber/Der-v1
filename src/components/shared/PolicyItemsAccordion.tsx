import React from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Edit2, Trash2, Plus, Link2, Shield, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { mockService, getStandardItemIds } from '@/services/mockService';
import { PolicyItem, Policy, Framework, Standard } from '@/types';
import { cn } from '@/lib/utils';

interface AccordionViewProps {
  roots: PolicyItem[];
  childrenByParent: Map<string, PolicyItem[]>;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  itemCodes: Map<string, string>;
  isRtl: boolean;
  t: (key: string) => string;
  policies: Policy[];
  frameworks: Framework[];
  standards: Standard[];
  getPolicyName: (id: string) => string;
  navigate: (to: string) => void;
  handleDelete: (id: string) => void;
  setSelectedParentId: (id: string | null) => void;
  setQuickAddData: (d: any) => void;
  setIsQuickAddOpen: (b: boolean) => void;
  setLinkSelected: (s: Set<string>) => void;
  setLinkDialogItem: (it: PolicyItem | null) => void;
}

function ItemNode({
  item,
  depth,
  childrenByParent,
  expandedIds,
  toggleExpand,
  itemCodes,
  isRtl,
  t,
  policies,
  frameworks,
  standards,
  getPolicyName,
  navigate,
  handleDelete,
  setSelectedParentId,
  setQuickAddData,
  setIsQuickAddOpen,
  setLinkSelected,
  setLinkDialogItem,
}: AccordionViewProps & { item: PolicyItem; depth: number }) {
  const children = childrenByParent.get(item.id) || [];
  const hasChildren = children.length > 0;
  const isOpen = expandedIds.has(item.id);
  const code = itemCodes.get(item.id) || '';
  const progress = mockService.getPolicyItemProgress(item.id);
  const stdCount = standards.filter(s => getStandardItemIds(s).includes(item.id)).length;

  const policy = policies.find(p => p.id === item.policyId);
  const framework = policy ? frameworks.find(f => f.id === policy.frameworkId) : null;
  const Chevron = isOpen ? ChevronDown : isRtl ? ChevronLeft : ChevronRight;

  return (
    <div className={cn('border border-border-subtle rounded-xl overflow-hidden bg-white', depth > 0 && 'mt-2')}>
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50/70 transition-colors',
          isOpen && 'bg-slate-50/40 border-b border-border-subtle'
        )}
        onClick={() => hasChildren && toggleExpand(item.id)}
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); if (hasChildren) toggleExpand(item.id); }}
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
            {isRtl ? item.nameAr : item.nameEn}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {framework && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-100">
                {isRtl ? framework.nameAr : framework.nameEn}
              </div>
            )}
            <div className="flex items-center gap-1 text-[11px] text-text-muted">
              <Shield className="w-3 h-3" />
              {getPolicyName(item.policyId)}
            </div>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50/60 border border-blue-100 text-[10px] font-bold text-blue-700">
              <Shield className="w-3 h-3" />
              {stdCount} {isRtl ? 'معيار' : 'std'}
            </div>
            {hasChildren && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-50 border border-violet-100 text-[10px] font-bold text-violet-700">
                <FileText className="w-3 h-3" />
                {children.length} {isRtl ? 'فرعي' : 'children'}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={cn('h-full transition-all duration-500', progress === 100 ? 'bg-emerald-500' : 'bg-primary')}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[11px] font-bold text-text-main w-9 text-right">{progress}%</span>
        </div>

        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedParentId(item.id);
              setQuickAddData({
                nameAr: '',
                nameEn: '',
                descriptionAr: '',
                descriptionEn: '',
                order: 0,
                policyId: item.policyId,
              });
              setIsQuickAddOpen(true);
            }}
            className="h-7 w-7 text-emerald-600 hover:bg-emerald-50"
            title={isRtl ? 'إضافة بند فرعي' : 'Add sub-item'}
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const linked = standards.filter(s => getStandardItemIds(s).includes(item.id)).map(s => s.id);
              setLinkSelected(new Set(linked));
              setLinkDialogItem(item);
            }}
            className="h-7 w-7 text-violet-600 hover:bg-violet-50"
            title={isRtl ? 'ربط معايير' : 'Link standards'}
          >
            <Link2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/policy-items/edit/${item.id}`)}
            className="h-7 w-7 text-blue-600 hover:bg-blue-50"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(item.id)}
            className="h-7 w-7 text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {hasChildren && isOpen && (
        <div className={cn('px-4 py-3 bg-slate-50/30 space-y-2', isRtl ? 'border-r-2 border-primary/20' : 'border-l-2 border-primary/20')}>
          {children.map(child => (
            <ItemNode
              key={child.id}
              {...{
                item: child,
                depth: depth + 1,
                childrenByParent,
                expandedIds,
                toggleExpand,
                itemCodes,
                isRtl,
                t,
                policies,
                frameworks,
                standards,
                getPolicyName,
                navigate,
                handleDelete,
                setSelectedParentId,
                setQuickAddData,
                setIsQuickAddOpen,
                setLinkSelected,
                setLinkDialogItem,
                roots: [],
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function AccordionView(props: AccordionViewProps) {
  const { roots, isRtl } = props;

  if (roots.length === 0) {
    return (
      <div className="text-center py-12 text-text-muted">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
        {isRtl ? 'لا توجد بنود' : 'No items'}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {roots.map(root => (
        <ItemNode key={root.id} {...props} item={root} depth={0} />
      ))}
    </div>
  );
}

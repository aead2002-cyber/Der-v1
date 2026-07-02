import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Plus, Edit2, Trash2, Save, X, Search, Lock, Check, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { permissionGroupsApi } from '@/modules/der3/services/permissionGroupsApi';
import { PermissionGroup } from '@/types';
import { PERMISSION_SERVICES, permKey } from '@/permissions';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function PermissionGroupsManager() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [editing, setEditing] = useState<PermissionGroup | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PermissionGroup | null>(null);
  const [search, setSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const refresh = async () => {
    try {
      setGroups(await permissionGroupsApi.getPermissionGroups());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (isRtl ? 'طھط¹ط°ط± طھط­ظ…ظٹظ„ ط§ظ„ظ…ط¬ظ…ظˆط¹ط§طھ' : 'Failed to load groups'));
    }
  };

  useEffect(() => { refresh(); }, []);

  const startCreate = () => {
    setEditing({
      id: Math.random().toString(36).slice(2, 11),
      nameAr: '',
      nameEn: '',
      isSystem: false,
      permissions: [],
    });
  };

  const startEdit = (g: PermissionGroup) => setEditing({ ...g, permissions: [...g.permissions] });

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.nameAr.trim() || !editing.nameEn.trim()) {
      toast.error(isRtl ? 'ظٹط±ط¬ظ‰ طھط¹ط¨ط¦ط© ط§ظ„ط§ط³ظ… ط¨ط§ظ„ط¹ط±ط¨ظٹ ظˆط§ظ„ط¥ظ†ط¬ظ„ظٹط²ظٹ' : 'Please provide both names');
      return;
    }
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const payload = {
        ...editing,
        nameAr: editing.nameAr.trim(),
        nameEn: editing.nameEn.trim(),
        updatedAt: now,
      };
      if (groups.some(g => g.id === editing.id)) {
        await permissionGroupsApi.updatePermissionGroup(editing.id, payload);
      } else {
        await permissionGroupsApi.createPermissionGroup({
          ...payload,
          createdAt: payload.createdAt || now,
        });
      }
      toast.success(isRtl ? 'ط·ع¾ط¸â€¦ ط·آ­ط¸ظ¾ط·آ¸ ط·آ§ط¸â€‍ط¸â€¦ط·آ¬ط¸â€¦ط¸ث†ط·آ¹ط·آ©' : 'Group saved');
      setEditing(null);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (isRtl ? 'طھط¹ط°ط± ط­ظپط¸ ط§ظ„ظ…ط¬ظ…ظˆط¹ط©' : 'Failed to save group'));
    } finally {
      setIsSaving(false);
    }
    return;
    toast.success(isRtl ? 'طھظ… ط­ظپط¸ ط§ظ„ظ…ط¬ظ…ظˆط¹ط©' : 'Group saved');
    setEditing(null);
    refresh();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setIsSaving(true);
    try {
      await permissionGroupsApi.deletePermissionGroup(confirmDelete.id);
      toast.success(isRtl ? 'ط·ع¾ط¸â€¦ ط·آ­ط·آ°ط¸ظ¾ ط·آ§ط¸â€‍ط¸â€¦ط·آ¬ط¸â€¦ط¸ث†ط·آ¹ط·آ©' : 'Group deleted');
      setConfirmDelete(null);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (isRtl ? 'طھط¹ط°ط± ط­ط°ظپ ط§ظ„ظ…ط¬ظ…ظˆط¹ط©' : 'Failed to delete group'));
    } finally {
      setIsSaving(false);
    }
    return;
    const ok = true;
    if (ok) {
      toast.success(isRtl ? 'طھظ… ط­ط°ظپ ط§ظ„ظ…ط¬ظ…ظˆط¹ط©' : 'Group deleted');
    } else {
      toast.error(isRtl ? 'ظ„ط§ ظٹظ…ظƒظ† ط­ط°ظپ ط§ظ„ظ…ط¬ظ…ظˆط¹ط§طھ ط§ظ„ط§ظپطھط±ط§ط¶ظٹط©' : 'Built-in groups cannot be deleted');
    }
    setConfirmDelete(null);
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            {isRtl ? 'ط§ظ„ظ…ط¬ظ…ظˆط¹ط§طھ ظˆط§ظ„طµظ„ط§ط­ظٹط§طھ' : 'Groups & Permissions'}
          </h3>
          <p className="text-[12px] text-text-muted mt-1">
            {isRtl
              ? 'طھط¹ط±ظٹظپ ظ…ط¬ظ…ظˆط¹ط§طھ ط§ظ„طµظ„ط§ط­ظٹط§طھ ظˆطھط¹طٹظٹظ† ط§ظ„طµظ„ط§ط­ظٹط§طھ ظ„ظƒظ„ ظ…ط¬ظ…ظˆط¹ط©. ظٹظڈظ…ظƒظ† ط¥ط³ظ†ط§ط¯ ظƒظ„ ظ…ط³طھط®ط¯ظ… ط¥ظ„ظ‰ ظ…ط¬ظ…ظˆط¹ط© ظˆط§ط­ط¯ط©.'
              : 'Define permission groups and assign permissions to each. Each user can belong to one group.'}
          </p>
        </div>
        <Button onClick={startCreate} className="bg-primary text-white font-bold rounded-lg h-10 px-5">
          <Plus className="w-4 h-4 mr-1" />
          {isRtl ? 'ط¥ط¶ط§ظپط© ظ…ط¬ظ…ظˆط¹ط©' : 'Add Group'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map(g => {
          const totalKeys = totalPermissionCount();
          return (
            <div key={g.id} className="bg-white rounded-2xl border border-border-subtle shadow-sm p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-text-main truncate">{isRtl ? g.nameAr : g.nameEn}</h4>
                    {g.isSystem && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5">
                        <Lock className="w-2.5 h-2.5" />
                        {isRtl ? 'ط§ظپطھط±ط§ط¶ظٹط©' : 'Built-in'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-text-muted mt-1 font-mono">{g.id}</p>
                </div>
                <div className="inline-flex items-center rounded-lg border border-border-subtle bg-white shadow-sm overflow-hidden divide-x divide-border-subtle rtl:divide-x-reverse">
                  <button type="button" title={t('edit')} onClick={() => startEdit(g)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50/60">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    title={g.isSystem ? (isRtl ? 'ظ„ط§ ظٹظ…ظƒظ† ط­ط°ظپ ط§ظ„ظ…ط¬ظ…ظˆط¹ط§طھ ط§ظ„ط§ظپطھط±ط§ط¶ظٹط©' : 'Built-in groups cannot be deleted') : t('delete')}
                    onClick={() => !g.isSystem && setConfirmDelete(g)}
                    disabled={g.isSystem}
                    className={cn(
                      'w-8 h-8 flex items-center justify-center transition-colors',
                      g.isSystem ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50/60'
                    )}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="text-[11px] text-text-muted font-medium">
                {g.permissions.length} / {totalKeys} {isRtl ? 'طµظ„ط§ط­ظٹط©' : 'permissions'}
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${totalKeys === 0 ? 0 : Math.round((g.permissions.length / totalKeys) * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Editor dialog */}
      <Dialog open={!!editing} onOpenChange={v => { if (!v) setEditing(null); }}>
        <DialogContent className="sm:max-w-[920px] max-h-[90vh] overflow-hidden flex flex-col rounded-2xl border-none shadow-2xl" dir={isRtl ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              {editing?.isSystem
                ? (isRtl ? 'طھط¹ط¯ظٹظ„ طµظ„ط§ط­ظٹط§طھ ظ…ط¬ظ…ظˆط¹ط© ط§ظپطھط±ط§ط¶ظٹط©' : 'Edit Built-in Group')
                : editing && groups.some(g => g.id === editing.id)
                  ? (isRtl ? 'طھط¹ط¯ظٹظ„ ظ…ط¬ظ…ظˆط¹ط©' : 'Edit Group')
                  : (isRtl ? 'ط¥ط¶ط§ظپط© ظ…ط¬ظ…ظˆط¹ط©' : 'Add Group')}
            </DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-text-main">{isRtl ? 'ط§ظ„ط§ط³ظ… ط¨ط§ظ„ط¹ط±ط¨ظٹ' : 'Arabic Name'} <span className="text-red-500">*</span></label>
                  <Input
                    value={editing.nameAr}
                    onChange={e => setEditing({ ...editing, nameAr: e.target.value })}
                    disabled={editing.isSystem}
                    className="rounded-lg h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-text-main">{isRtl ? 'ط§ظ„ط§ط³ظ… ط¨ط§ظ„ط¥ظ†ط¬ظ„ظٹط²ظٹ' : 'English Name'} <span className="text-red-500">*</span></label>
                  <Input
                    value={editing.nameEn}
                    onChange={e => setEditing({ ...editing, nameEn: e.target.value })}
                    dir="ltr"
                    disabled={editing.isSystem}
                    className="rounded-lg h-10"
                  />
                </div>
              </div>

              <PermissionMatrix
                selected={editing.permissions}
                onChange={next => setEditing({ ...editing, permissions: next })}
                search={search}
                onSearchChange={setSearch}
                isRtl={isRtl}
              />
            </div>
          )}

          <DialogFooter className="border-t border-border-subtle pt-3">
            <Button variant="outline" onClick={() => setEditing(null)} className="rounded-lg h-10 px-5 font-bold">
              <X className="w-4 h-4 mr-1" />
              {t('cancel')}
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-primary text-white rounded-lg h-10 px-6 font-bold">
              <Save className="w-4 h-4 mr-1" />
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!confirmDelete} onOpenChange={v => { if (!v) setConfirmDelete(null); }}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl border-none shadow-2xl" dir={isRtl ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{isRtl ? 'طھط£ظƒظٹط¯ ط§ظ„ط­ط°ظپ' : 'Confirm Delete'}</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-text-muted leading-relaxed">
            {isRtl
              ? `ظ‡ظ„ ط£ظ†طھ ظ…طھط£ظƒط¯ ظ…ظ† ط­ط°ظپ ط§ظ„ظ…ط¬ظ…ظˆط¹ط© "${confirmDelete?.nameAr || ''}"طں ط§ظ„ظ…ط³طھط®ط¯ظ…ظˆظ† ط§ظ„ظ…ط¹ظٹظ‘ظ†ظˆظ† ظ„ظ‡ط§ ط³ظٹظپظ‚ط¯ظˆظ† طµظ„ط§ط­ظٹط§طھظ‡ظ….`
              : `Delete group "${confirmDelete?.nameEn || ''}"? Users assigned to it will lose their permissions.`}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)} className="rounded-lg h-10 px-5 font-bold">
              {t('cancel')}
            </Button>
            <Button onClick={handleDelete} disabled={isSaving} className="bg-rose-600 hover:bg-rose-700 text-white rounded-lg h-10 px-6 font-bold">
              <Trash2 className="w-4 h-4 mr-1" />
              {t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function totalPermissionCount(): number {
  let n = 0;
  PERMISSION_SERVICES.forEach(s => s.screens.forEach(sc => n += sc.actions.length));
  return n;
}

function PermissionMatrix({
  selected,
  onChange,
  search,
  onSearchChange,
  isRtl,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
  search: string;
  onSearchChange: (v: string) => void;
  isRtl: boolean;
}) {
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggle = (key: string) => {
    const next = new Set(selectedSet);
    if (next.has(key)) next.delete(key); else next.add(key);
    onChange(Array.from(next));
  };

  const toggleScreen = (keys: string[]) => {
    const allSelected = keys.every(k => selectedSet.has(k));
    const next = new Set(selectedSet);
    if (allSelected) keys.forEach(k => next.delete(k));
    else keys.forEach(k => next.add(k));
    onChange(Array.from(next));
  };

  const toggleService = (svcKeys: string[]) => {
    const allSelected = svcKeys.every(k => selectedSet.has(k));
    const next = new Set(selectedSet);
    if (allSelected) svcKeys.forEach(k => next.delete(k));
    else svcKeys.forEach(k => next.add(k));
    onChange(Array.from(next));
  };

  const q = search.trim().toLowerCase();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 sticky top-0 bg-white py-2 z-10">
        <div className="relative flex-1">
          <Search className={cn('absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none', isRtl ? 'right-3' : 'left-3')} />
          <Input
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={isRtl ? 'ط§ط¨ط­ط« ظپظٹ ط§ظ„طµظ„ط§ط­ظٹط§طھ...' : 'Search permissions...'}
            className={cn('rounded-lg h-10', isRtl ? 'pr-9' : 'pl-9')}
          />
        </div>
        <div className="text-[12px] font-bold text-text-muted">
          {selected.length} {isRtl ? 'ظ…ظپط¹ظ‘ظ„ط©' : 'enabled'}
        </div>
      </div>

      <div className="space-y-3">
        {PERMISSION_SERVICES.map(svc => {
          const screensWithKeys = svc.screens.map(scr => ({
            scr,
            keys: scr.actions.map(a => permKey(svc.id, scr.id, a.key)),
          }));
          const svcKeys = screensWithKeys.flatMap(s => s.keys);
          const visibleScreens = q
            ? screensWithKeys.filter(({ scr }) =>
                (isRtl ? svc.labelAr : svc.labelEn).toLowerCase().includes(q) ||
                (isRtl ? scr.labelAr : scr.labelEn).toLowerCase().includes(q) ||
                scr.actions.some(a => (isRtl ? a.labelAr : a.labelEn).toLowerCase().includes(q) || a.key.toLowerCase().includes(q))
              )
            : screensWithKeys;
          if (visibleScreens.length === 0) return null;
          const svcSelectedCount = svcKeys.filter(k => selectedSet.has(k)).length;
          const allSvc = svcSelectedCount === svcKeys.length && svcKeys.length > 0;

          return (
            <div key={svc.id} className="border border-border-subtle rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleService(svcKeys)}
                    className="flex items-center justify-center w-5 h-5 rounded text-primary"
                    title={allSvc ? (isRtl ? 'ط¥ظ„ط؛ط§ط، ط§ظ„ظƒظ„' : 'Unselect all') : (isRtl ? 'طھط­ط¯ظٹط¯ ط§ظ„ظƒظ„' : 'Select all')}
                  >
                    {allSvc ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-400" />}
                  </button>
                  <h4 className="font-bold text-[13px] text-text-main">{isRtl ? svc.labelAr : svc.labelEn}</h4>
                </div>
                <span className="text-[11px] font-bold text-text-muted">
                  {svcSelectedCount} / {svcKeys.length}
                </span>
              </div>
              <div className="divide-y divide-border-subtle">
                {visibleScreens.map(({ scr, keys }) => {
                  const selectedCount = keys.filter(k => selectedSet.has(k)).length;
                  const allScr = selectedCount === keys.length && keys.length > 0;
                  return (
                    <div key={scr.id} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleScreen(keys)}
                            className="flex items-center justify-center w-5 h-5 rounded text-primary"
                          >
                            {allScr ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-300" />}
                          </button>
                          <span className="text-[12px] font-bold text-text-main">{isRtl ? scr.labelAr : scr.labelEn}</span>
                        </div>
                        <span className="text-[10px] text-text-muted font-mono">{selectedCount}/{keys.length}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
                        {scr.actions.map(a => {
                          const key = permKey(svc.id, scr.id, a.key);
                          const on = selectedSet.has(key);
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => toggle(key)}
                              className={cn(
                                'flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[12px] font-medium transition-all text-start',
                                on
                                  ? 'border-primary bg-blue-50/60 text-primary'
                                  : 'border-border-subtle bg-white text-text-muted hover:border-slate-300'
                              )}
                              title={key}
                            >
                              <span className={cn(
                                'inline-flex items-center justify-center w-4 h-4 rounded border',
                                on ? 'bg-primary border-primary text-white' : 'border-slate-300 bg-white'
                              )}>
                                {on && <Check className="w-3 h-3" />}
                              </span>
                              <span className="truncate">{isRtl ? a.labelAr : a.labelEn}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

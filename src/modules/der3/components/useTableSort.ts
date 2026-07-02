import { useState, useMemo } from 'react';

export type SortDir = 'asc' | 'desc';
export type SortState = { key: string; dir: SortDir } | null;

export function useTableSort(initial: SortState = null) {
  const [sort, setSort] = useState<SortState>(initial);

  const toggle = (key: string) => {
    setSort(prev => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  };

  const sortedRows = <T,>(rows: T[], getValue: (row: T, key: string) => any): T[] => {
    if (!sort) return rows;
    const out = [...rows];
    out.sort((a, b) => {
      const va = getValue(a, sort.key);
      const vb = getValue(b, sort.key);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') {
        return sort.dir === 'asc' ? va - vb : vb - va;
      }
      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      const cmp = sa.localeCompare(sb);
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return out;
  };

  return { sort, toggle, sortedRows };
}

// Stable memoized wrapper for components that prefer a hook returning a sorted list.
export function useSorted<T>(rows: T[], getValue: (row: T, key: string) => any, sort: SortState): T[] {
  return useMemo(() => {
    if (!sort) return rows;
    const out = [...rows];
    out.sort((a, b) => {
      const va = getValue(a, sort.key);
      const vb = getValue(b, sort.key);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') {
        return sort.dir === 'asc' ? va - vb : vb - va;
      }
      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      const cmp = sa.localeCompare(sb);
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return out;
  }, [rows, sort, getValue]);
}

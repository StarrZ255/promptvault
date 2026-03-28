import { useState, useCallback } from 'react';

export function useSelection(allIds: string[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected(s => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => setSelected(new Set(allIds)), [allIds]);
  const clear = useCallback(() => setSelected(new Set()), []);

  return { selected, toggle, selectAll, clear, count: selected.size };
}

import { useEffect, useRef, useCallback } from 'react';
import type { Prompt } from '../types';

export function useAutoSave(
  prompt: Prompt | null,
  onSave: (id: string, data: Partial<Prompt>) => Promise<void>
) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const pendingRef = useRef<Partial<Prompt>>({});
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const scheduleAutoSave = useCallback((data: Partial<Prompt>) => {
    if (!prompt) return;
    pendingRef.current = { ...pendingRef.current, ...data };
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (Object.keys(pendingRef.current).length > 0) {
        await onSaveRef.current(prompt.id, pendingRef.current);
        pendingRef.current = {};
      }
    }, 800);
  }, [prompt]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        clearTimeout(debounceRef.current);
        if (prompt && Object.keys(pendingRef.current).length > 0) {
          onSaveRef.current(prompt.id, pendingRef.current);
          pendingRef.current = {};
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [prompt]);

  return { scheduleAutoSave };
}

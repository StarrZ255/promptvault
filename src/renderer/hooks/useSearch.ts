import { useState, useEffect, useCallback, useRef } from 'react';
import type { Prompt, SearchFilter } from '../types';

export function useSearch(filter: SearchFilter) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchPrompts = useCallback(async (f: SearchFilter) => {
    setLoading(true);
    try {
      const results = await window.vault.search.query(f);
      setPrompts(results as Prompt[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    const delay = filter.query ? 150 : 0;
    debounceRef.current = setTimeout(() => fetchPrompts(filter), delay);
    return () => clearTimeout(debounceRef.current);
  }, [filter, fetchPrompts]);

  return { prompts, loading, refresh: () => fetchPrompts(filter) };
}

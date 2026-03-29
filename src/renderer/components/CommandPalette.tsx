import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../App';
import { useToast } from './Toast';

export default function CommandPalette() {
  const { setShowCommandPalette, setFilter, t } = useApp();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowCommandPalette(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [setShowCommandPalette]);

  const commands = [
    { id: 'import', label: t('commands.import'), icon: '📂', keywords: 'import json', action: () => { setShowCommandPalette(false); window.vault.window.openImport(); } },
    { id: 'export', label: t('commands.export'), icon: '💾', keywords: 'export hide save sauvegarder', action: async () => { const p = await window.vault.export.toJson(); if (p) toast(t('toasts.exported', { path: p })); setShowCommandPalette(false); } },
    { id: 'capture', label: t('commands.capture'), icon: '⚡', keywords: 'capture quick nouveau', action: () => { setShowCommandPalette(false); window.vault.window.openQuickCapture(); } },
    { id: 'favorites', label: t('commands.favorites'), icon: '⭐', keywords: 'favoris starred', action: () => { setFilter({ favorites: true }); setShowCommandPalette(false); } },
    { id: 'all', label: t('commands.all'), icon: '🗄️', keywords: 'tout voir all', action: () => { setFilter({ sortBy: 'updated_at' }); setShowCommandPalette(false); } },
  ];

  const filtered = commands.filter(c =>
    !query || c.label.toLowerCase().includes(query.toLowerCase()) || c.keywords.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-24 bg-black/60 backdrop-blur-md"
      onClick={() => setShowCommandPalette(false)}>
      <motion.div initial={{ opacity: 0, y: -20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden shadow-primary/10">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
          <span className="text-muted text-lg">⌘</span>
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            placeholder={t('placeholders.search_commands')}
            className="flex-1 bg-transparent text-sm font-bold text-text placeholder-muted focus:outline-none" />
          <kbd className="text-[10px] font-black text-white/20 bg-white/5 px-2 py-1 rounded-lg border border-white/5">ESC</kbd>
        </div>
        <div className="py-2 max-h-80 overflow-y-auto no-scrollbar">
          {filtered.map(cmd => (
            <button key={cmd.id} onClick={cmd.action}
              className="w-full text-left px-6 py-3.5 flex items-center gap-4 hover:bg-primary/10 hover:text-primary transition-all text-sm font-bold group">
              <span className="text-xl group-hover:scale-110 transition-transform">{cmd.icon}</span>
              <span className="tracking-tight">{cmd.label}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-6 py-10 text-center text-sm font-bold text-muted uppercase tracking-widest opacity-30">{t('no_results')}</div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

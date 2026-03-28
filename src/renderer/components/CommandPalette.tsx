import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../App';
import { useToast } from './Toast';

export default function CommandPalette() {
  const { setShowCommandPalette, setFilter } = useApp();
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
    { id: 'import', label: 'Importer un fichier JSON', icon: '📂', keywords: 'import json', action: () => { setShowCommandPalette(false); window.vault.window.openImport(); } },
    { id: 'export', label: 'Exporter tout en JSON', icon: '💾', keywords: 'export sauvegarder', action: async () => { const p = await window.vault.export.toJson(); if (p) toast(`Exporté : ${p}`); setShowCommandPalette(false); } },
    { id: 'capture', label: 'Capture rapide (Alt+N)', icon: '⚡', keywords: 'capture rapide nouveau', action: () => { setShowCommandPalette(false); window.vault.window.openQuickCapture(); } },
    { id: 'favorites', label: 'Afficher les favoris', icon: '⭐', keywords: 'favoris', action: () => { setFilter({ favorites: true }); setShowCommandPalette(false); } },
    { id: 'all', label: 'Tous les prompts', icon: '🗄️', keywords: 'tout voir tous', action: () => { setFilter({ sortBy: 'updated_at' }); setShowCommandPalette(false); } },
  ];

  const filtered = commands.filter(c =>
    !query || c.label.toLowerCase().includes(query.toLowerCase()) || c.keywords.includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-24 bg-black/50 backdrop-blur-sm"
      onClick={() => setShowCommandPalette(false)}>
      <motion.div initial={{ opacity: 0, y: -20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-surface border border-border rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <span className="text-muted">⌘</span>
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher une commande…"
            className="flex-1 bg-transparent text-sm text-text placeholder-muted focus:outline-none" />
          <kbd className="text-xs text-muted bg-bg px-2 py-0.5 rounded">Esc</kbd>
        </div>
        <div className="py-2 max-h-64 overflow-y-auto">
          {filtered.map(cmd => (
            <button key={cmd.id} onClick={cmd.action}
              className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 text-sm text-text">
              <span>{cmd.icon}</span>
              <span>{cmd.label}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted">Aucune commande trouvée</div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

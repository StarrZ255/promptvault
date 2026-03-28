import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../App';
import { useSearch } from '../hooks/useSearch';
import { useSelection } from '../hooks/useSelection';
import PromptCard from './PromptCard';
import { useToast } from './Toast';
import type { Prompt } from '../types';

export default function PromptList() {
  const { filter, setSelectedPrompt, selectedPrompt, themes, refreshThemes } = useApp();
  const [searchInput, setSearchInput] = useState('');
  const [isGrid, setIsGrid] = useState(true);
  const { prompts, refresh } = useSearch({ ...filter, query: searchInput });
  const { selected, toggle, selectAll, clear, count } = useSelection(prompts.map(p => p.id));
  const { toast } = useToast();

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.ctrlKey && e.key === 'a') { e.preventDefault(); selectAll(); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [selectAll]);

  const handleDeleteSelected = async () => {
    if (!window.confirm(`Supprimer ${count} prompt${count > 1 ? 's' : ''} ? Cette action est irréversible.`)) return;
    const result = await window.vault.prompts.deleteBatch(Array.from(selected)) as { deleted: number };
    toast(`${result.deleted} prompt${result.deleted > 1 ? 's' : ''} supprimé${result.deleted > 1 ? 's' : ''}`);
    clear();
    refresh();
    refreshThemes();
  };

  const handleNewPrompt = () => {
    const blank: Prompt = {
      id: 'new', title: '', body: '', theme: 'autre', tags: [], target_ai: [],
      type: 'task', variables: [], rating: 0, is_favorite: 0, is_builtin: 0,
      locked: 0, lang: 'fr', use_count: 0, sha256: '',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    setSelectedPrompt(blank);
  };

  return (
    <div className="relative flex flex-col flex-1 min-w-0 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
        <input
          id="search-input" type="text" value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="Rechercher… (titre, contenu, tags)"
          className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text placeholder-muted focus:outline-none focus:border-primary"
        />
        <button onClick={() => setIsGrid(g => !g)} className="p-2 text-muted hover:text-text" title={isGrid ? 'Vue liste' : 'Vue grille'}>
          {isGrid ? '☰' : '⊞'}
        </button>
        <button onClick={handleNewPrompt} className="px-3 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/80">
          + Nouveau
        </button>
      </div>

      <div className={`flex-1 overflow-y-auto p-4 ${isGrid ? 'grid grid-cols-2 xl:grid-cols-3 gap-3 content-start' : 'flex flex-col gap-2'}`}>
        <AnimatePresence mode="popLayout">
          {prompts.map(p => (
            <PromptCard
              key={p.id} prompt={p}
              theme={themes.find(t => t.id === p.theme)}
              isSelected={selected.has(p.id)}
              isActive={selectedPrompt?.id === p.id}
              onSelect={toggle}
              onClick={setSelectedPrompt}
            />
          ))}
        </AnimatePresence>
        {prompts.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center h-48 text-muted">
            <span className="text-4xl mb-2">🗂️</span>
            <p className="text-sm">Aucun prompt trouvé</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {count > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-surface border border-border rounded-xl px-4 py-3 shadow-2xl z-50"
          >
            <span className="text-sm text-text font-medium">{count} prompt{count > 1 ? 's' : ''} sélectionné{count > 1 ? 's' : ''}</span>
            <button onClick={handleDeleteSelected} className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600">Supprimer</button>
            <button onClick={clear} className="px-3 py-1.5 border border-border text-sm rounded-lg hover:bg-white/5">Annuler</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

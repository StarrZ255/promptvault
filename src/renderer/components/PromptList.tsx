import React, { useState, useEffect } from 'react';
import { useApp } from '../App';
import { useSearch } from '../hooks/useSearch';
import { useSelection } from '../hooks/useSelection';
import PromptCard from './PromptCard';
import { useToast } from './Toast';
import type { Prompt } from '../types';

export default function PromptList() {
  const { filter, setSelectedPrompt, selectedPrompt, themes, refreshThemes, promptsVersion, bumpPromptsVersion } = useApp();
  const [searchInput, setSearchInput] = useState('');
  const [isGrid, setIsGrid] = useState(true);
  const { prompts, refresh } = useSearch({ ...filter, query: searchInput }, promptsVersion);
  const { selected, toggle, selectAll, clear, count } = useSelection(prompts.map(p => p.id));
  const { toast } = useToast();

  const isTrash = !!(filter as any).trash;
  const [trashedPrompts, setTrashedPrompts] = useState<Prompt[]>([]);

  useEffect(() => {
    if (isTrash) {
      window.vault.prompts.getDeleted().then(r => setTrashedPrompts(r as Prompt[]));
    }
  }, [isTrash, promptsVersion]);

  const handleRestorePrompt = async (id: string) => {
    await window.vault.prompts.restore(id);
    setTrashedPrompts(p => p.filter(x => x.id !== id));
    bumpPromptsVersion();
    toast('Prompt restauré ✓');
  };

  const handlePermanentDelete = async (id: string) => {
    if (!window.confirm('Supprimer définitivement ? Cette action est irréversible.')) return;
    await window.vault.prompts.permanentDelete(id);
    setTrashedPrompts(p => p.filter(x => x.id !== id));
    toast('Supprimé définitivement');
  };

  const handleEmptyTrash = async () => {
    if (!window.confirm('Vider la corbeille ? Tous les prompts supprimés seront perdus définitivement.')) return;
    await window.vault.prompts.emptyTrash();
    setTrashedPrompts([]);
    toast('Corbeille vidée');
  };

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
      {isTrash && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
            <h2 className="text-sm font-semibold text-text flex items-center gap-2">
              <span>🗑</span> Corbeille
              <span className="text-xs text-muted font-normal">({trashedPrompts.length} élément{trashedPrompts.length !== 1 ? 's' : ''})</span>
            </h2>
            {trashedPrompts.length > 0 && (
              <button onClick={handleEmptyTrash}
                className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors">
                Vider la corbeille
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
            {trashedPrompts.length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 text-muted">
                <span className="text-4xl mb-2">🗑</span>
                <p className="text-sm">La corbeille est vide</p>
              </div>
            )}
            {trashedPrompts.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface border border-border">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">{p.title || 'Sans titre'}</p>
                  <p className="text-xs text-muted truncate mt-0.5">{p.body.slice(0, 80)}{p.body.length > 80 ? '…' : ''}</p>
                  {p.deleted_at && (
                    <p className="text-xs text-muted/50 mt-0.5">Supprimé le {new Date(p.deleted_at).toLocaleDateString('fr-FR')}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => handleRestorePrompt(p.id)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary hover:text-white transition-colors">
                    Restaurer
                  </button>
                  <button onClick={() => handlePermanentDelete(p.id)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors">
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {!isTrash && (
        <>
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
            <input
              id="search-input" type="text" value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Rechercher… (titre, contenu, tags)"
              className="flex-1 select-text bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text placeholder-muted focus:outline-none focus:border-primary"
              style={{ WebkitUserSelect: 'text', userSelect: 'text' } as React.CSSProperties}
            />
            <button onClick={() => setIsGrid(g => !g)} className="p-2 text-muted hover:text-text" title={isGrid ? 'Vue liste' : 'Vue grille'}>
              {isGrid ? '☰' : '⊞'}
            </button>
            <button onClick={handleNewPrompt} className="px-3 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/80">
              + Nouveau
            </button>
          </div>

          <div className={`flex-1 overflow-y-auto p-4 ${isGrid ? 'grid grid-cols-2 xl:grid-cols-3 gap-3 content-start' : 'flex flex-col gap-2'}`}>
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
            {prompts.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center h-48 text-muted">
                <span className="text-4xl mb-2">🗂️</span>
                <p className="text-sm">Aucun prompt trouvé</p>
              </div>
            )}
          </div>

          {count > 0 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-surface border border-border rounded-xl px-4 py-3 shadow-2xl z-50">
              <span className="text-sm text-text font-medium">{count} prompt{count > 1 ? 's' : ''} sélectionné{count > 1 ? 's' : ''}</span>
              <button onClick={handleDeleteSelected} className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600">Supprimer</button>
              <button onClick={clear} className="px-3 py-1.5 border border-border text-sm rounded-lg hover:bg-white/5">Annuler</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

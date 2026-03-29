import React, { useState, useEffect } from 'react';
import { useApp } from '../App';
import { useSearch } from '../hooks/useSearch';
import { useSelection } from '../hooks/useSelection';
import PromptCard from './PromptCard';
import { useToast } from './Toast';
import type { Prompt } from '../types';

export default function PromptList() {
  const { filter, setSelectedPrompt, selectedPrompt, themes, refreshThemes, promptsVersion, bumpPromptsVersion, t } = useApp();
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
    toast(t('toasts.prompt_restored'));
  };

  const handlePermanentDelete = async (id: string) => {
    if (!window.confirm(t('actions.confirm_perm_delete'))) return;
    await window.vault.prompts.permanentDelete(id);
    setTrashedPrompts(p => p.filter(x => x.id !== id));
    toast(t('toasts.perm_deleted'));
  };

  const handleEmptyTrash = async () => {
    if (!window.confirm(t('actions.confirm_empty_trash'))) return;
    await window.vault.prompts.emptyTrash();
    setTrashedPrompts([]);
    toast(t('toasts.trash_emptied'));
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.ctrlKey && e.key === 'a') { e.preventDefault(); selectAll(); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [selectAll]);

  const handleDeleteSelected = async () => {
    if (!window.confirm(t('actions.confirm_delete', { title: '' }))) return;
    const result = await window.vault.prompts.deleteBatch(Array.from(selected)) as { deleted: number };
    toast(`${result.deleted} prompt${result.deleted > 1 ? 's' : ''} ${t('actions.delete').toLowerCase()}`);
    clear();
    refresh();
    refreshThemes();
  };

  const handleHideSelected = async () => {
    const result = await window.vault.prompts.hideBatch(Array.from(selected)) as { hidden: number };
    toast(t('toasts.prompts_hidden', { count: String(result.hidden) }));
    clear();
    refresh();
    refreshThemes();
    bumpPromptsVersion();
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
    <div className="relative flex flex-col flex-1 min-w-0 overflow-hidden bg-bg/20">
      {isTrash && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0 bg-surface/30">
            <h2 className="text-sm font-semibold text-text flex items-center gap-2">
              <span>🗑</span> {t('sidebar.trash')}
              <span className="text-xs text-muted font-normal">({trashedPrompts.length} {t('items_count').toLowerCase()})</span>
            </h2>
            {trashedPrompts.length > 0 && (
              <button onClick={handleEmptyTrash}
                className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors font-bold">
                {t('actions.empty_trash')}
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 no-scrollbar">
            {trashedPrompts.length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 text-muted opacity-30">
                <span className="text-4xl mb-2">🗑</span>
                <p className="text-sm font-bold uppercase tracking-widest">{t('placeholders.empty_trash_msg')}</p>
              </div>
            )}
            {trashedPrompts.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface border border-border group transition-all">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text truncate">{p.title || t('placeholders.no_title')}</p>
                  <p className="text-xs text-muted truncate mt-0.5 opacity-60">{p.body.slice(0, 80)}{p.body.length > 80 ? '…' : ''}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => handleRestorePrompt(p.id)}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary hover:text-white transition-colors">
                    {t('actions.restore')}
                  </button>
                  <button onClick={() => handlePermanentDelete(p.id)}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors">
                    {t('actions.delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {!isTrash && (
        <>
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border flex-shrink-0 bg-surface/40 backdrop-blur-sm">
            <div className="flex-1 relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/50 group-focus-within:text-primary transition-colors">🔍</span>
                <input
                    id="search-input" type="text" value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    placeholder={t('placeholders.search_full')}
                    className="w-full select-text bg-bg border border-border/60 rounded-2xl pl-11 pr-4 py-2.5 text-sm font-medium text-text placeholder-muted/40 focus:outline-none focus:border-primary/60 focus:bg-bg shadow-inner transition-all"
                />
            </div>
            <button onClick={() => setIsGrid(g => !g)} className="p-2.5 rounded-xl hover:bg-white/5 text-muted hover:text-text transition-all" title={isGrid ? 'Vue liste' : 'Vue grille'}>
              {isGrid ? '☰' : '⊞'}
            </button>
            {prompts.length > 0 && (
              <button
                onClick={() => count === prompts.length ? clear() : selectAll()}
                className="px-4 py-2.5 border border-border text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-white/5 transition-all text-muted hover:text-text"
              >
                {count === prompts.length ? t('actions.deselect_all') : t('actions.select_all')}
              </button>
            )}
            <button onClick={handleNewPrompt} className="px-5 py-2.5 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-primary/80 transition-all shadow-xl shadow-primary/20 active:scale-95">
              {t('actions.new_prompt')}
            </button>
          </div>

          <div className={`flex-1 overflow-y-auto p-6 ${isGrid ? 'grid grid-cols-2 xl:grid-cols-3 gap-4 content-start' : 'flex flex-col gap-3'}`}>
            {prompts.map(p => (
              <PromptCard
                key={p.id} prompt={p}
                theme={themes.find(tIdx => tIdx.id === p.theme)}
                isSelected={selected.has(p.id)}
                isActive={selectedPrompt?.id === p.id}
                onSelect={toggle}
                onClick={p => setSelectedPrompt(selectedPrompt?.id === p.id ? null : p)}
              />
            ))}
            {prompts.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center h-64 text-muted opacity-20">
                <span className="text-8xl mb-6">🗂️</span>
                <p className="text-xl font-black uppercase tracking-[0.4em]">{t('no_results')}</p>
              </div>
            )}
          </div>

          {count > 0 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-surface border border-primary/40 rounded-3xl px-8 py-5 shadow-2xl z-50 animate-in slide-in-from-bottom-10 shadow-primary/10">
              <span className="text-sm text-text font-black uppercase tracking-widest">
                {count} {t('items_count').toLowerCase()}
              </span>
              <div className="w-px h-6 bg-border/40" />
              <div className="flex gap-3">
                <button onClick={handleHideSelected} className="px-5 py-2.5 bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20">{t('actions.hide')}</button>
                <button onClick={handleDeleteSelected} className="px-5 py-2.5 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20">{t('actions.delete')}</button>
                <button onClick={clear} className="px-5 py-2.5 border border-border text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/5 transition-all">{t('actions.cancel')}</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

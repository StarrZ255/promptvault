import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useApp } from '../App';
import type { Prompt, Theme } from '../types';
import ThemeGlyph from './ThemeGlyph';
import { motion, AnimatePresence } from 'framer-motion';

/** 
 * Hook personnalisé pour le debounce (anti-rebond).
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

/**
 * COMPOSANT MÉMOÏSÉ POUR CHAQUE ITEM
 */
const ResultItem = memo(({ 
  prompt, theme, isFocused, onMouseEnter, onContextMenu, onClick, index, query, t 
}: { 
  prompt: Prompt; theme?: Theme; isFocused: boolean; onMouseEnter: () => void; 
  onContextMenu: (e: React.MouseEvent) => void; onClick: () => void; index: number; query: string; t: any;
}) => {
  const highlight = (text: string, q: string) => {
    if (!q || q.length < 2) return text;
    const parts = text.split(new RegExp(`(${q})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === q.toLowerCase() 
        ? <span key={i} className="text-secondary font-bold">{part}</span> 
        : part
    );
  };

  return (
    <div onMouseEnter={onMouseEnter} onContextMenu={onContextMenu} onClick={onClick}
      className={`flex items-center gap-4 px-5 py-3 cursor-pointer transition-colors border-l-4
        ${isFocused ? 'bg-white/5 border-primary shadow-inner' : 'border-transparent'}`}
    >
      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0 shadow-sm"
           style={{ backgroundColor: (theme?.color || '#23232b') + '33' }}>
        <ThemeGlyph theme={theme!} className="!w-5 !h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
            <div className={`text-sm font-bold truncate ${isFocused ? 'text-white' : 'text-text'}`}>
            {highlight(prompt.title, query)}
            </div>
            {prompt.is_favorite === 1 && <span className="text-[10px] text-yellow-500/80">★</span>}
        </div>
        <div className="text-[10px] truncate text-white/30 font-semibold tracking-tighter uppercase">
          {theme?.label || t('other_category')}
        </div>
      </div>
      <div className={`text-[9px] font-['JetBrains_Mono'] px-1.5 py-0.5 rounded bg-[#23232b] border ${isFocused ? 'text-primary border-primary/40' : 'text-white/5 border-white/5'}`}>
        Alt+{index + 1}
      </div>
    </div>
  );
});

/**
 * COMPOSANT MÉMOÏSÉ POUR TOUTE LA LISTE
 */
const ResultsList = memo(({ 
    prompts, focusedIdx, themes, query, onSetFocusedIdx, onHandleCopy, onContextMenu, t 
}: {
    prompts: Prompt[]; focusedIdx: number; themes: Theme[]; query: string; t: any;
    onSetFocusedIdx: (i: number) => void; onHandleCopy: (p: Prompt) => void; onContextMenu: (e: React.MouseEvent, p: Prompt) => void;
}) => (
    <div className="flex-1 overflow-y-auto no-scrollbar py-1">
      {prompts.map((p, i) => (
        <ResultItem key={p.id} index={i} prompt={p} query={query} theme={themes.find(tIdx => tIdx.id === p.theme)} isFocused={i === focusedIdx}
          onMouseEnter={() => onSetFocusedIdx(i)}
          onContextMenu={(e) => onContextMenu(e, p)}
          onClick={() => onHandleCopy(p)}
          t={t}
        />
      ))}
      {prompts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-white/5">
          <span className="text-5xl mb-4 opacity-30">📂</span>
          <p className="text-[10px] uppercase font-bold tracking-widest">{t('no_results')}</p>
        </div>
      )}
    </div>
));

/**
 * COMPOSANT MÉMOÏSÉ POUR LE PANNEAU D'ÉDITION
 */
const EditorPane = memo(({ 
    activePrompt, editedBody, onSetEditedBody, onSave, isSaving, t 
}: { 
    activePrompt: Prompt | null; editedBody: string; onSetEditedBody: (v: string) => void; onSave: () => void; isSaving: boolean; t: any;
}) => (
    <div className="flex-1 flex flex-col bg-[#16161c]">
    {activePrompt ? (
      <div className="flex-1 flex flex-col p-8 animate-in fade-in duration-200">
        <div className="flex items-start justify-between gap-8 mb-6">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold text-white tracking-tight line-clamp-2" title={activePrompt.title}>
              {activePrompt.title}
            </h2>
            <div className="flex items-center gap-3 mt-2">
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${activePrompt.is_favorite ? 'bg-yellow-500/10 text-yellow-500' : 'bg-primary/20 text-primary'}`}>
                {activePrompt.is_favorite ? `⭐ ${t('favorites_only').toUpperCase()}` : (activePrompt.theme || t('other_category'))}
              </span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl shadow-xl grayscale opacity-50 shrink-0 select-none">📝</div>
        </div>

        <div className="flex-1 relative">
          <textarea value={editedBody} onChange={(e) => onSetEditedBody(e.target.value)} spellCheck="false"
            className="w-full h-full bg-[#1a1a20]/40 border border-white/10 rounded-3xl p-6 text-base leading-relaxed text-white/90 outline-none focus:border-primary/50 focus:bg-[#1a1a20]/60 transition-all resize-none shadow-2xl no-scrollbar font-sans"
            placeholder={t('placeholders.empty_body')}
          />
        </div>

        <div className="mt-8 flex items-center justify-end">
          <div className="flex items-center gap-6">
            <button onClick={onSave} disabled={isSaving}
              className={`px-8 py-3 rounded-2xl text-[11px] font-black tracking-widest uppercase transition-all shadow-2xl active:scale-95
                ${isSaving ? 'bg-green-500 text-white' : 'bg-primary text-white hover:bg-primary/80 shadow-primary/20'}`}
            >
              {isSaving ? t('actions.saved') : t('actions.save')}
            </button>
          </div>
        </div>
      </div>
    ) : (
      <div className="flex-1 flex flex-col items-center justify-center text-white/5 space-y-6">
        <div className="text-8xl opacity-10">✨</div>
        <p className="text-sm font-black uppercase tracking-[0.4em] opacity-30">{t('placeholders.select_prompt')}</p>
      </div>
    )}
  </div>
));

export default function MiniWindow() {
  const { themes, bumpPromptsVersion, promptsVersion, refreshThemes, t, language, setLanguage } = useApp();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 120);
  
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
  const [isFavoritesOnly, setIsFavoritesOnly] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(0);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [time, setTime] = useState(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
  useEffect(() => {
    const itv = setInterval(() => setTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })), 1000);
    return () => clearInterval(itv);
  }, []);

  const [leftWidth, setLeftWidth] = useState(() => Math.round(window.innerWidth / 2));
  const isResizing = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, prompt: Prompt } | null>(null);

  const [editedBody, setEditedBody] = useState('');
  const activePrompt = prompts[focusedIdx];

  // Search Logic (Favorites Filter support)
  useEffect(() => {
    const load = async () => {
      const results = await window.vault.search.query({
        query: debouncedQuery.trim(), 
        theme: activeThemeId || undefined, 
        favorites: isFavoritesOnly || undefined,
        limit: 500
      });
      setPrompts(results || []);
      setFocusedIdx(0);
    };
    load();
  }, [debouncedQuery, activeThemeId, isFavoritesOnly, promptsVersion]);

  useEffect(() => {
    if (activePrompt) setEditedBody(activePrompt.body);
    else setEditedBody('');
  }, [focusedIdx, activePrompt?.id]);

  useEffect(() => {
    const handleFocus = () => { inputRef.current?.focus(); inputRef.current?.select(); setShowFilterMenu(false); setContextMenu(null); };
    window.addEventListener('focus', handleFocus);
    handleFocus();
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Split view resizer
  const handleMouseDown = () => (isResizing.current = true);
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => { if (isResizing.current) setLeftWidth(Math.min(Math.max(300, e.clientX), 600)); };
    const handleMouseUp = () => (isResizing.current = false);
    window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, []);

  const handleCopy = useCallback((p: Prompt) => {
    if (!p) return;
    window.vault.system.copyToClipboard(editedBody || p.body);
    setContextMenu(null);
    window.vault.window.close();
  }, [editedBody]);

  const handleOpenMain = () => { window.vault.window.openMain(); window.vault.window.close(); };

  const handleSave = useCallback(async () => {
    if (!activePrompt) return;
    setIsSaving(true);
    try {
      await window.vault.prompts.update(activePrompt.id, { body: editedBody });
      bumpPromptsVersion();
      setTimeout(() => setIsSaving(false), 500);
    } catch (e) { console.error(e); setIsSaving(false); }
  }, [activePrompt, editedBody, bumpPromptsVersion]);

  // Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); handleSave(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIdx(p => Math.min(p + 1, prompts.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedIdx(p => Math.max(p - 1, 0)); }
      else if (e.key === 'Enter') { e.preventDefault(); if (prompts[focusedIdx]) handleCopy(prompts[focusedIdx]); }
      else if (e.key === 'Escape') { if (showFilterMenu) setShowFilterMenu(false); else window.vault.window.close(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prompts, focusedIdx, handleCopy, handleSave, showFilterMenu]);

  const onContextMenu = useCallback((e: React.MouseEvent, p: Prompt) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, prompt: p }); }, []);

  const activeTheme = themes.find(tIdx => tIdx.id === activeThemeId);

  return (
    <div className="w-full h-full flex flex-row font-['Inter'] text-text select-none bg-[#1a1a20] overflow-hidden" onClick={() => setContextMenu(null)}>
      <div style={{ width: leftWidth }} className="flex flex-col border-r border-white/5 bg-[#1a1a20] shadow-2xl z-10 shrink-0">
        
        {/* Header */}
        <div className="flex items-center gap-4 px-6 pt-6 pb-4 bg-[#23232b] border-b border-white/5">
          <input ref={inputRef} type="text" placeholder={t('search')} autoComplete="off" spellCheck="false"
            value={query} onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-2xl font-light text-white placeholder-white/5"
          />
          <div className="flex items-center gap-4 text-white/20 shrink-0">
            <span className="text-[10px] font-bold font-['JetBrains_Mono']">{time}</span>
            <div className="text-3xl filter saturate-50 opacity-40">🔍</div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-5 py-2.5 flex items-center justify-between border-b border-white/5 bg-[#1a1a20]">
          <div className="flex items-center gap-2">
            <div className="relative">
                <button onClick={(e) => { e.stopPropagation(); setShowFilterMenu(!showFilterMenu); }}
                    className={`flex items-center gap-2 px-3 py-1 rounded-md text-[10px] font-bold transition-all border ${activeThemeId ? 'bg-primary/20 border-primary/40 text-primary uppercase' : 'bg-white/5 border-white/10 text-white/30 uppercase'}`}>
                📂 {activeTheme?.label || t('filter')} ▾
                </button>
                <AnimatePresence>
                    {showFilterMenu && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                        className="absolute left-0 top-full mt-2 w-56 bg-[#2a2a35] border border-white/10 rounded-xl shadow-2xl z-50 py-1.5 overflow-hidden font-bold"
                    >
                        <button onClick={() => { setActiveThemeId(null); setShowFilterMenu(false); }} className={`w-full text-left px-4 py-2 text-[10px] hover:bg-white/5 tracking-widest ${!activeThemeId ? 'text-primary' : 'text-white/40'}`}>{t('all_categories').toUpperCase()}</button>
                        {themes.map(tIdx => (
                        <button key={tIdx.id} onClick={() => { setActiveThemeId(tIdx.id); setShowFilterMenu(false); }} className={`w-full text-left px-4 py-2 text-[10px] hover:bg-white/5 tracking-widest ${activeThemeId === tIdx.id ? 'text-primary' : 'text-white/40'}`}>{tIdx.label.toUpperCase()}</button>
                        ))}
                    </motion.div>
                    )}
                </AnimatePresence>
            </div>
            
            <button 
                onClick={() => setIsFavoritesOnly(!isFavoritesOnly)}
                className={`p-1 text-xs rounded-md transition-all border ${isFavoritesOnly ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-500' : 'bg-white/5 border-white/10 text-white/20 hover:text-white/40'}`}
                title={t('favorites_only')}
            >
                ⭐
            </button>
          </div>
          <span className="text-[10px] font-bold text-white/5 tracking-widest uppercase">{prompts.length} {t('items_count')}</span>
        </div>

        {/* LIST */}
        <ResultsList prompts={prompts} focusedIdx={focusedIdx} themes={themes} query={debouncedQuery} onSetFocusedIdx={setFocusedIdx} onHandleCopy={handleCopy} onContextMenu={onContextMenu} t={t} />

        {/* Status Bar */}
        <div className="px-5 py-2.5 flex items-center justify-between text-[10px] uppercase tracking-tighter text-white/10 border-t border-white/5 bg-[#23232b]/20">
           <div className="truncate flex-1">
                <span className="opacity-40 font-bold mr-2">{t('prev_to_copy').toUpperCase()}</span> 
                <span className="text-white/30 font-medium">{activePrompt?.title || '---'}</span>
           </div>
           
           <div className="flex items-center gap-3">
                <button 
                    onClick={handleOpenMain}
                    className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/20 hover:text-white transition-colors border border-white/5 shadow-sm"
                    title={t('actions.open_main')}
                >
                    🖥️
                </button>
           </div>
        </div>
      </div>

      <div onMouseDown={handleMouseDown} className="w-1.5 h-full cursor-col-resize hover:bg-primary/40 transition-colors flex items-center justify-center group z-20"><div className="w-[1px] h-12 bg-white/5 group-hover:bg-primary/60" /></div>

      {/* EDITOR */}
      <EditorPane activePrompt={activePrompt} editedBody={editedBody} onSetEditedBody={setEditedBody} onSave={handleSave} isSaving={isSaving} t={t} />

      <AnimatePresence>
        {contextMenu && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            style={{ left: contextMenu.x, top: contextMenu.y }}
            className="fixed w-52 bg-[#2a2a35] border border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden py-2" onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-1.5 text-[10px] font-black text-white/20 uppercase tracking-widest border-b border-white/5 mb-2">{t('filter')}</div>
            <button onClick={() => handleCopy(contextMenu.prompt)} className="w-full text-left px-5 py-2.5 text-xs text-white hover:bg-primary/20 hover:text-primary transition-colors flex items-center gap-4 font-bold"><span>📋</span> {t('actions.copy').toUpperCase()}</button>
            <div className="h-px bg-white/5 my-1 mx-3" />
            <button onClick={async () => { await window.vault.prompts.hideBatch([contextMenu.prompt.id]); setContextMenu(null); bumpPromptsVersion(); refreshThemes(); }} className="w-full text-left px-5 py-2.5 text-xs text-amber-400 hover:bg-amber-400/10 transition-colors flex items-center gap-4 font-bold"><span>🙈</span> {t('actions.hide').toUpperCase()}</button>
            <div className="h-px bg-white/5 my-1 mx-3" />
            <button onClick={async () => { if (confirm(t('actions.confirm_delete', { title: contextMenu.prompt.title }))) { await window.vault.prompts.delete(contextMenu.prompt.id); setContextMenu(null); bumpPromptsVersion(); refreshThemes(); } }} className="w-full text-left px-5 py-2.5 text-xs text-red-400 hover:bg-red-400/10 transition-colors flex items-center gap-4 font-bold"><span>🗑</span> {t('actions.delete').toUpperCase()}</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

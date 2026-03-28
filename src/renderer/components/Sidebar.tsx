import React, { useState, useRef, useCallback } from 'react';
import { Reorder, motion, AnimatePresence } from 'framer-motion';
import ThemeGlyph from './ThemeGlyph';
import { useApp } from '../App';
import type { Theme, SearchFilter } from '../types';
import { useToast } from './Toast';

export default function Sidebar({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { themes, filter, setFilter, isDark, toggleTheme, refreshThemes } = useApp();
  const { toast } = useToast();

  // Quick add
  const [addingTheme, setAddingTheme] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('🗂️');
  const [newColor, setNewColor] = useState('#6C63FF');

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  // Drag-to-reorder
  const dragId = useRef<string | null>(null);
  const dragOverId = useRef<string | null>(null);

  const handleThemeClick = (themeId: string | undefined) => {
    if (editingId) return; // don't navigate while editing
    setFilter(f => ({ ...f, theme: themeId, favorites: undefined, trash: undefined } as SearchFilter));
  };

  const handleFavorites = () => {
    setFilter(f => ({ ...f, favorites: !f.favorites, theme: undefined, trash: undefined } as SearchFilter));
  };

  const handleQuickAddTheme = async () => {
    if (!newName.trim()) return;
    const id = newName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || `custom-${Date.now()}`;
    await window.vault.themes.create({ id, label: newName, icon: newIcon, color: newColor });
    refreshThemes();
    setNewName(''); setNewIcon('🗂️'); setNewColor('#6C63FF');
    setAddingTheme(false);
    toast('Thématique créée ✓');
  };

  const startEdit = (t: Theme, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(t.id);
    setEditLabel(t.label);
  };

  const saveEdit = async (id: string) => {
    await window.vault.themes.update(id, { label: editLabel });
    refreshThemes();
    setEditingId(null);
    toast('Thématique modifiée ✓');
  };

  const handleDeleteTheme = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Supprimer cette thématique ?')) return;
    await window.vault.themes.delete(id);
    refreshThemes();
    toast('Thématique supprimée');
  };

  const handleReorder = useCallback((newOrder: Theme[]) => {
    // Optimistic update
    refreshThemes(); // Optional: used to sync other parts of the UI
    const updateDB = async () => {
      await Promise.all(newOrder.map((t, i) => window.vault.themes.reorder(t.id, i)));
    };
    updateDB();
  }, [refreshThemes]);

  return (
    <>
      <aside
        className="w-56 flex-shrink-0 h-full flex flex-col border-r border-border bg-surface overflow-y-auto"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Draggable title area — only this strip moves the window */}
        <div
          className="px-3 py-3 flex-shrink-0"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <h1
            className="font-display text-lg font-bold text-primary tracking-wide select-none"
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
          >PromptVault</h1>
        </div>

        <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto pb-2">
          <button
            onClick={() => setFilter({ sortBy: filter.sortBy || 'updated_at' })}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors
              ${!filter.theme && !filter.favorites && !(filter as any).trash
                ? 'bg-primary/20 text-primary font-medium'
                : 'text-muted hover:text-text hover:bg-white/5'}`}
          >
            <span>🗄️</span><span>Tous les prompts</span>
          </button>

          <button
            onClick={handleFavorites}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors
              ${filter.favorites ? 'bg-primary/20 text-primary font-medium' : 'text-muted hover:text-text hover:bg-white/5'}`}
          >
            <span>⭐</span><span>Favoris</span>
          </button>

          <button
            onClick={() => setFilter(f => ({ ...f, trash: true, theme: undefined, favorites: undefined } as SearchFilter))}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors
              ${(filter as any).trash ? 'bg-red-500/20 text-red-400 font-medium' : 'text-muted hover:text-text hover:bg-white/5'}`}
          >
            <span>🗑</span><span>Corbeille</span>
          </button>

          {/* Thématiques header */}
          <div className="pt-3 pb-1 px-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Thématiques</span>
            <button
              onClick={() => setAddingTheme(v => !v)}
              className="text-muted hover:text-primary text-base leading-none transition-colors px-1"
              title="Ajouter une thématique"
            >＋</button>
          </div>

          {/* Quick-add form */}
          {addingTheme && (
            <div className="mx-1 mb-1 p-2 bg-bg border border-border rounded-xl space-y-1.5">
              <div className="flex gap-1">
                <input value={newIcon} onChange={e => setNewIcon(e.target.value)}
                  className="w-10 bg-surface border border-border rounded-lg px-1 py-1 text-center text-base focus:outline-none focus:border-primary select-text"
                  style={{ WebkitUserSelect: 'text', userSelect: 'text' } as React.CSSProperties}
                  placeholder="🎯" />
                <input value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="Nom…"
                  onKeyDown={e => { if (e.key === 'Enter') handleQuickAddTheme(); if (e.key === 'Escape') setAddingTheme(false); }}
                  className="flex-1 bg-surface border border-border rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-primary select-text"
                  style={{ WebkitUserSelect: 'text', userSelect: 'text' } as React.CSSProperties} />
                <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
                  className="w-8 h-8 rounded-lg border border-border cursor-pointer bg-transparent" />
              </div>
              <div className="flex gap-1">
                <button onClick={handleQuickAddTheme}
                  className="flex-1 py-1 rounded-lg bg-primary text-white text-xs font-semibold">Créer</button>
                <button onClick={() => setAddingTheme(false)}
                  className="px-2 py-1 rounded-lg border border-border text-xs text-muted">✕</button>
              </div>
            </div>
          )}

          {/* Theme list — framer-motion Reorder */}
          <Reorder.Group 
            axis="y" 
            values={themes} 
            onReorder={handleReorder}
            className="space-y-0.5"
          >
            {(themes as Theme[]).map(theme => (
              <Reorder.Item
                key={theme.id}
                value={theme}
                className="group"
              >
                {editingId === theme.id ? (
                  /* Inline edit row */
                  <div className="mx-1 my-0.5 p-2 bg-bg border border-primary/40 rounded-xl space-y-1.5">
                    <div className="flex gap-1">
                      <input value={editLabel} onChange={e => setEditLabel(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(theme.id); if (e.key === 'Escape') setEditingId(null); }}
                        className="flex-1 bg-surface border border-border rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-primary select-text"
                        style={{ WebkitUserSelect: 'text', userSelect: 'text' } as React.CSSProperties}
                        autoFocus />
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => saveEdit(theme.id)}
                        className="flex-1 py-1 rounded-lg bg-primary text-white text-xs font-semibold">✓ OK</button>
                      <button onClick={() => setEditingId(null)}
                        className="px-2 py-1 rounded-lg border border-border text-xs text-muted">✕</button>
                    </div>
                  </div>
                ) : (
                  /* Normal row */
                  <button
                    onClick={() => handleThemeClick(theme.id)}
                    style={{ borderLeftColor: filter.theme === theme.id ? theme.color : 'transparent' }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors border-l-2
                      ${filter.theme === theme.id ? 'bg-white/10 font-medium' : 'text-muted hover:text-text hover:bg-white/5'}`}
                  >
                    <span className="cursor-grab text-muted/30 text-xs mr-0.5 opacity-0 group-hover:opacity-100">⠿</span>
                    <ThemeGlyph theme={theme} className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1 truncate min-w-0 pr-1">{theme.label}</span>
                    {theme.count !== undefined && (
                      <span className="text-[10px] font-bold text-muted/40 flex-shrink-0">
                        {theme.count}
                      </span>
                    )}
                    {/* Edit/delete buttons — show on hover */}
                    <span className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button onClick={e => startEdit(theme, e)}
                        className="text-muted hover:text-primary text-xs px-0.5 transition-colors" title="Modifier">✏️</button>
                      {theme.is_custom === 1 && (
                        <button onClick={e => handleDeleteTheme(theme.id, e)}
                          className="text-red-400/50 hover:text-red-400 text-xs px-0.5 transition-colors" title="Supprimer">🗑</button>
                      )}
                    </span>
                  </button>
                )}
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </nav>

        <div className="p-3 space-y-1 border-t border-border flex-shrink-0">
          <button onClick={toggleTheme}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-muted hover:text-text hover:bg-white/5 flex items-center gap-2">
            <span>{isDark ? '☀️' : '🌙'}</span>
            <span>{isDark ? 'Mode clair' : 'Mode sombre'}</span>
          </button>
          <button onClick={onOpenSettings}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-muted hover:text-text hover:bg-white/5 flex items-center gap-2">
            <span>⚙️</span><span>Paramètres</span>
          </button>
        </div>
      </aside>
    </>
  );
}

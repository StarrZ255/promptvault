import React, { useState } from 'react';
import { useApp } from '../App';
import type { Theme } from '../types';
import { useToast } from './Toast';
import SettingsModal from './SettingsModal';

export default function Sidebar() {
  const { themes, filter, setFilter, isDark, toggleTheme, refreshThemes } = useApp();
  const { toast } = useToast();
  const [showSettings, setShowSettings] = useState(false);
  const [addingTheme, setAddingTheme] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('🗂️');
  const [newColor, setNewColor] = useState('#6C63FF');

  const handleThemeClick = (themeId: string | undefined) => {
    setFilter(f => ({ ...f, theme: themeId, favorites: undefined }));
  };

  const handleFavorites = () => {
    setFilter(f => ({ ...f, favorites: !f.favorites, theme: undefined }));
  };

  const handleQuickAddTheme = async () => {
    if (!newName.trim()) return;
    const id = newName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    await window.vault.themes.create({ id, label: newName, icon: newIcon, color: newColor });
    refreshThemes();
    setNewName(''); setNewIcon('🗂️'); setNewColor('#6C63FF');
    setAddingTheme(false);
    toast('Thématique créée ✓');
  };

  return (
    <>
      <aside className="w-56 flex-shrink-0 h-full flex flex-col border-r border-border bg-surface overflow-y-auto pt-10">
        <div className="px-3 py-4">
          <h1 className="font-display text-lg font-bold text-primary tracking-wide">PromptVault</h1>
        </div>

        <nav className="flex-1 px-2 space-y-0.5">
          <button
            onClick={() => setFilter({ sortBy: filter.sortBy })}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors
              ${!filter.theme && !filter.favorites
                ? 'bg-primary/20 text-primary font-medium'
                : 'text-muted hover:text-text hover:bg-white/5'}`}
          >
            <span>🗄️</span>
            <span>Tous les prompts</span>
          </button>

          <button
            onClick={handleFavorites}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors
              ${filter.favorites
                ? 'bg-primary/20 text-primary font-medium'
                : 'text-muted hover:text-text hover:bg-white/5'}`}
          >
            <span>⭐</span>
            <span>Favoris</span>
          </button>

          <div className="pt-3 pb-1 px-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Thématiques</span>
            <button
              onClick={() => setAddingTheme(v => !v)}
              className="text-muted hover:text-primary text-sm leading-none transition-colors"
              title="Ajouter une thématique"
            >＋</button>
          </div>

          {/* Formulaire rapide nouvelle thématique */}
          {addingTheme && (
            <div className="mx-2 mb-1 p-2 bg-bg border border-border rounded-xl space-y-1.5">
              <div className="flex gap-1">
                <input value={newIcon} onChange={e => setNewIcon(e.target.value)}
                  className="w-10 bg-surface border border-border rounded-lg px-1 py-1 text-center text-base focus:outline-none focus:border-primary"
                  placeholder="🎯" />
                <input value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="Nom…"
                  onKeyDown={e => { if (e.key === 'Enter') handleQuickAddTheme(); if (e.key === 'Escape') setAddingTheme(false); }}
                  className="flex-1 bg-surface border border-border rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-primary" />
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

          {(themes as Theme[]).map(theme => (
            <button
              key={theme.id}
              onClick={() => handleThemeClick(theme.id)}
              style={{ borderLeftColor: filter.theme === theme.id ? theme.color : 'transparent' }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors border-l-2
                ${filter.theme === theme.id
                  ? 'bg-white/10 font-medium'
                  : 'text-muted hover:text-text hover:bg-white/5'}`}
            >
              <span>{theme.icon}</span>
              <span className="flex-1 truncate">{theme.label}</span>
              {theme.count !== undefined && (
                <span className="text-xs text-muted">{theme.count}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-3 space-y-1 border-t border-border">
          <button
            onClick={toggleTheme}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-muted hover:text-text hover:bg-white/5 flex items-center gap-2"
          >
            <span>{isDark ? '☀️' : '🌙'}</span>
            <span>{isDark ? 'Mode clair' : 'Mode sombre'}</span>
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-muted hover:text-text hover:bg-white/5 flex items-center gap-2"
          >
            <span>⚙️</span>
            <span>Paramètres</span>
          </button>
        </div>
      </aside>

      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}

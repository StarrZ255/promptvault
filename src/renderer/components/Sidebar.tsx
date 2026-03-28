import React, { useState, useEffect } from 'react';
import { useApp } from '../App';
import type { Theme } from '../types';
import { useToast } from './Toast';

export default function Sidebar() {
  const { themes, filter, setFilter, isDark, toggleTheme } = useApp();
  const { toast } = useToast();
  const [startupEnabled, setStartupEnabled] = useState(false);

  useEffect(() => {
    // Lire le statut de démarrage auto (window.vault.startup disponible en prod seulement)
    if ((window as any).vault?.startup) {
      (window as any).vault.startup.get().then((v: boolean) => setStartupEnabled(v));
    }
  }, []);

  const handleToggleStartup = async () => {
    if (!(window as any).vault?.startup) return;
    const next = !startupEnabled;
    await (window as any).vault.startup.set(next);
    setStartupEnabled(next);
    toast(next ? 'Démarrage automatique activé ✓' : 'Démarrage automatique désactivé');
  };

  const handleThemeClick = (themeId: string | undefined) => {
    setFilter(f => ({ ...f, theme: themeId, favorites: undefined }));
  };

  const handleFavorites = () => {
    setFilter(f => ({ ...f, favorites: !f.favorites, theme: undefined }));
  };

  const handleRestore = async () => {
    const r = await window.vault.themes.restore();
    toast(`${r.restored} prompts officiels restaurés`);
  };

  return (
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

        <div className="pt-3 pb-1 px-3">
          <span className="text-xs font-semibold text-muted uppercase tracking-wider">Thématiques</span>
        </div>

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
          onClick={handleRestore}
          className="w-full text-left px-3 py-2 rounded-lg text-sm text-muted hover:text-text hover:bg-white/5 flex items-center gap-2"
        >
          <span>🔄</span>
          <span>Restaurer officiels</span>
        </button>
        <button
          onClick={handleToggleStartup}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors
            ${startupEnabled ? 'text-secondary hover:bg-secondary/10' : 'text-muted hover:text-text hover:bg-white/5'}`}
        >
          <span>{startupEnabled ? '✅' : '🚀'}</span>
          <span>Démarrage auto {startupEnabled ? '(activé)' : '(désactivé)'}</span>
        </button>
      </div>
    </aside>
  );
}

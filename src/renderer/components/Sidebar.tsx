import React, { useState } from 'react';
import { useApp } from '../App';
import type { Theme } from '../types';
import { useToast } from './Toast';
import SettingsModal from './SettingsModal';

export default function Sidebar() {
  const { themes, filter, setFilter, isDark, toggleTheme } = useApp();
  const { toast } = useToast();
  const [showSettings, setShowSettings] = useState(false);

  const handleThemeClick = (themeId: string | undefined) => {
    setFilter(f => ({ ...f, theme: themeId, favorites: undefined }));
  };

  const handleFavorites = () => {
    setFilter(f => ({ ...f, favorites: !f.favorites, theme: undefined }));
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

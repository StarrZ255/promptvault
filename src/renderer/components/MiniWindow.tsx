import React, { useState, useEffect, useRef } from 'react';

interface Prompt { id: string; title: string; body: string; theme: string; is_favorite: number; }

export default function MiniWindow() {
  const [query, setQuery] = useState('');
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    load('');
  }, []);

  useEffect(() => {
    load(query);
  }, [query]);

  const load = async (q: string) => {
    const r = await window.vault.prompts.getAll({ query: q, sortBy: 'use_count' } as any);
    setPrompts((r as Prompt[]).slice(0, 12));
  };

  const copy = async (p: Prompt) => {
    await window.vault.system.copyToClipboard(p.body);
    await window.vault.prompts.incrementUseCount(p.id);
    setCopied(p.id);
    setTimeout(() => setCopied(null), 1500);
  };

  const openMain = () => {
    window.vault.window.openMain();
    window.vault.window.closeWindow();
  };

  return (
    <div className="flex flex-col h-screen bg-surface text-text font-body overflow-hidden select-none"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>

      {/* Barre titre drag */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1 flex-shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <span className="text-xs font-bold text-primary font-display">PromptVault</span>
        <div className="flex gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button onClick={openMain} title="Ouvrir l'app complète"
            className="text-xs text-muted hover:text-text px-2 py-0.5 rounded hover:bg-white/10 transition-colors">
            ⊞ Ouvrir
          </button>
          <button onClick={() => window.vault.window.closeWindow()}
            className="text-muted hover:text-red-400 px-1.5 py-0.5 rounded hover:bg-white/10 text-sm transition-colors">✕</button>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="px-3 py-2 flex-shrink-0">
        <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)}
          placeholder="🔍  Rechercher un prompt..."
          className="w-full bg-bg border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {prompts.length === 0 && (
          <p className="text-xs text-muted text-center py-10">Aucun prompt trouvé</p>
        )}
        {prompts.map(p => (
          <button key={p.id}
            onClick={() => copy(p)}
            className="w-full flex items-start gap-2 px-3 py-2.5 rounded-xl hover:bg-white/5 group text-left transition-colors mb-0.5">
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-sm text-text font-medium truncate leading-tight">{p.title}</p>
              <p className="text-xs text-muted truncate mt-0.5 leading-snug">
                {p.body.slice(0, 70)}{p.body.length > 70 ? '…' : ''}
              </p>
            </div>
            <span className={`flex-shrink-0 text-base mt-0.5 transition-all
              ${copied === p.id ? 'text-green-400 scale-110' : 'text-border group-hover:text-muted'}`}>
              {copied === p.id ? '✓' : '📋'}
            </span>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-border flex-shrink-0">
        <button onClick={() => window.vault.window.openQuickCapture()}
          className="text-xs text-muted hover:text-primary flex items-center gap-1.5 transition-colors">
          <span className="text-primary font-bold">+</span> Nouveau
        </button>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span>Clic = copier</span>
          <button onClick={openMain} className="text-primary hover:text-primary/80 font-medium transition-colors">
            App complète →
          </button>
        </div>
      </div>
    </div>
  );
}

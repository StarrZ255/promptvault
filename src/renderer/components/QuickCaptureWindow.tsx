import React, { useState, useEffect } from 'react';
import { useToast } from './Toast';
import type { Theme } from '../types';

export default function QuickCaptureWindow() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [theme, setTheme] = useState('autre');
  const [themes, setThemes] = useState<Theme[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    window.vault.themes.getAll().then(t => setThemes(t as Theme[]));
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); handleSave(); }
      if (e.key === 'Escape') window.vault.window.closeWindow();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  const handleSave = async () => {
    if (!title.trim() || !body.trim()) return;
    await window.vault.prompts.create({ title: title.trim(), body: body.trim(), theme });
    toast('Prompt sauvegardé ✓');
    window.vault.window.closeWindow();
  };

  return (
    <div className="flex flex-col h-screen bg-surface p-4 gap-3">
      <div className="flex items-center justify-between" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <h2 className="font-display text-sm font-bold text-primary">Capture rapide</h2>
        <button onClick={() => window.vault.window.closeWindow()} className="text-muted hover:text-text text-xs" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>✕</button>
      </div>

      <input type="text" value={title} onChange={e => setTitle(e.target.value)} autoFocus
        placeholder="Titre"
        className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary" />

      <textarea value={body} onChange={e => setBody(e.target.value)} rows={5}
        placeholder="Corps du prompt…"
        className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary resize-none" />

      <select value={theme} onChange={e => setTheme(e.target.value)}
        className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary">
        {themes.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
      </select>

      <div className="flex gap-2 justify-end">
        <button onClick={() => window.vault.window.closeWindow()} className="px-3 py-1.5 text-sm text-muted hover:text-text">Annuler (Esc)</button>
        <button onClick={handleSave} className="px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary/80">Sauvegarder (Ctrl+Enter)</button>
      </div>
    </div>
  );
}

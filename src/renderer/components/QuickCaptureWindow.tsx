import React, { useState, useEffect } from 'react';
import { useApp } from '../App';
import { useToast } from './Toast';
import type { Theme } from '../types';

export default function QuickCaptureWindow() {
  const { t } = useApp();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [theme, setTheme] = useState('autre');
  const [themes, setThemes] = useState<Theme[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    window.vault.themes.getAll().then(tItem => setThemes(tItem as Theme[]));
  }, []);

  const handleSave = async () => {
    if (!title.trim() || !body.trim()) return;
    await window.vault.prompts.create({ title: title.trim(), body: body.trim(), theme });
    toast(t('toasts.prompt_saved'));
    window.vault.window.closeWindow();
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); handleSave(); }
      if (e.key === 'Escape') window.vault.window.closeWindow();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  return (
    <div className="flex flex-col h-screen bg-surface p-6 gap-4 font-['Inter']">
      <div className="flex items-center justify-between" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary">{t('quick_capture.title')}</h2>
        <button onClick={() => window.vault.window.closeWindow()} className="p-1 px-2 rounded-lg hover:bg-white/5 text-muted transition-colors" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>✕</button>
      </div>

      <input type="text" value={title} onChange={e => setTitle(e.target.value)} autoFocus
        placeholder={t('placeholders.no_title')}
        className="bg-bg border border-border rounded-xl px-4 py-3 text-sm font-bold text-text focus:outline-none focus:border-primary transition-all shadow-inner" />

      <textarea value={body} onChange={e => setBody(e.target.value)} rows={5}
        placeholder={t('placeholders.paste_prompt')}
        className="flex-1 bg-bg border border-border rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:border-primary resize-none font-sans leading-relaxed shadow-inner no-scrollbar" />

      <div className="flex gap-4 items-center">
        <select value={theme} onChange={e => setTheme(e.target.value)}
          className="flex-1 bg-bg border border-border rounded-xl px-4 py-2.5 text-xs font-bold text-text focus:outline-none focus:border-primary appearance-none cursor-pointer">
          {themes.map(tItem => <option key={tItem.id} value={tItem.id}>{tItem.icon} {tItem.label.toUpperCase()}</option>)}
        </select>
        
        <div className="flex gap-2">
            <button onClick={() => window.vault.window.closeWindow()} className="px-4 py-2 text-xs font-bold text-muted hover:text-text transition-colors">{t('actions.cancel')}</button>
            <button onClick={handleSave} className="px-6 py-2.5 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-primary/80 transition-all shadow-lg shadow-primary/20 active:scale-95">
                {t('actions.save')}
            </button>
        </div>
      </div>
    </div>
  );
}

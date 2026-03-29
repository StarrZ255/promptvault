import React, { useState, useEffect } from 'react';
import { useApp } from '../App';
import { useToast } from './Toast';
import type { Theme, ImportReport } from '../types';
import keywords from '../../../resources/keywords.json';

function detectTheme(text: string): string {
  const lower = text.toLowerCase();
  let best = 'autre', bestScore = 0;
  for (const [theme, words] of Object.entries(keywords as Record<string, string[]>)) {
    const score = words.filter(w => lower.includes(w)).length;
    if (score > bestScore) { bestScore = score; best = theme; }
  }
  return best;
}

function extractTags(text: string): string[] {
  const stopwords = new Set(['le','la','les','un','de','du','en','et','est','au','que','qui','pour','dans','sur','par','il','elle']);
  const words = text.toLowerCase().match(/\b[a-zàâäéèêëîïôùûü]{4,}\b/g) ?? [];
  return [...new Set(words.filter(w => !stopwords.has(w)))].slice(0, 5);
}

function extractTitle(text: string): string {
  const first = text.split('\n')[0].trim();
  return first.length <= 80 ? first : first.substring(0, 77) + '...';
}

export default function ImportWindow() {
  const { t, bumpPromptsVersion } = useApp();
  const [mode, setMode] = useState<'paste' | 'json'>('paste');
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState('autre');
  const [themes, setThemes] = useState<Theme[]>([]);
  const [analyzed, setAnalyzed] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    window.vault.themes.getAll().then(tItem => setThemes(tItem as Theme[]));
  }, []);

  const handleAnalyze = () => {
    if (!text.trim()) return;
    setTitle(extractTitle(text));
    setTheme(detectTheme(text));
    setAnalyzed(true);
  };

  const handleSavePaste = async () => {
    if (!title.trim() || !text.trim()) return;
    await window.vault.prompts.create({ title, body: text, theme, tags: extractTags(text) });
    bumpPromptsVersion();
    toast(t('toasts.prompt_saved'));
    window.vault.window.close();
  };

  const handleImportJson = async () => {
    const path = await window.vault.system.openFileDialog({ filters: [{ name: 'JSON', extensions: ['json'] }] });
    if (!path) return;
    const r = await window.vault.import.fromJson(path);
    setReport(r);
    bumpPromptsVersion();
    toast(t('import_window.report_imported', { count: String(r.imported) }));
  };

  return (
    <div className="flex flex-col h-screen bg-surface p-6 gap-4 font-['Inter'] overflow-hidden">
      <div className="flex items-center justify-between" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary">{t('import_window.title')}</h2>
        <button onClick={() => window.vault.window.close()} className="p-1 px-2 rounded-lg hover:bg-white/5 text-muted transition-colors" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>✕</button>
      </div>

      <div className="flex gap-2">
        {(['paste', 'json'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all border
              ${mode === m ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105' : 'bg-surface border-border text-muted hover:text-text hover:bg-white/5'}`}>
            {m === 'paste' ? t('import_window.paste_mode') : t('import_window.json_mode')}
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col gap-4 overflow-y-auto no-scrollbar">
          {mode === 'paste' ? (
            <>
              <textarea value={text} onChange={e => { setText(e.target.value); setAnalyzed(false); }} rows={8}
                placeholder={t('placeholders.paste_prompt')}
                className="bg-bg border border-border rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:border-primary resize-none font-sans leading-relaxed shadow-inner" />
              {!analyzed ? (
                <button onClick={handleAnalyze} className="w-full py-3.5 bg-secondary text-bg text-xs font-black uppercase tracking-widest rounded-xl hover:bg-secondary/90 transition-all shadow-lg active:scale-95">
                  {t('import_window.analyze_btn')}
                </button>
              ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder={t('placeholders.no_title')}
                    className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm font-bold text-text focus:outline-none focus:border-primary shadow-inner" />
                  <select value={theme} onChange={e => setTheme(e.target.value)}
                    className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-xs font-bold text-text focus:outline-none focus:border-primary appearance-none cursor-pointer">
                    {themes.map(tItem => <option key={tItem.id} value={tItem.id}>{tItem.icon} {tItem.label.toUpperCase()}</option>)}
                  </select>
                  <button onClick={handleSavePaste} className="w-full py-3.5 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-primary/80 transition-all shadow-lg shadow-primary/20 active:scale-95">
                    {t('actions.save')}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col gap-6 items-center justify-center p-8 bg-bg/20 border-2 border-dashed border-border rounded-3xl">
              <span className="text-6xl opacity-20">📂</span>
              <button onClick={handleImportJson} className="px-8 py-3.5 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-primary/80 transition-all shadow-xl shadow-primary/20 active:scale-95">
                {t('import_window.select_json')}
              </button>
              {report && (
                <div className="w-full bg-bg rounded-2xl p-6 border border-border shadow-inner space-y-3 animate-in zoom-in duration-200">
                  <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.2em] text-secondary">
                    <span>{t('filter')}</span>
                    <span className="bg-secondary/10 px-2 py-1 rounded-lg">OK</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-text">· {t('import_window.report_imported', { count: String(report.imported) })}</div>
                    {report.perfectDuplicates > 0 && <div className="text-xs text-muted/60">· {t('import_window.report_duplicates', { count: String(report.perfectDuplicates) })}</div>}
                  </div>
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  );
}

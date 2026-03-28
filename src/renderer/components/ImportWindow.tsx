import React, { useState, useEffect } from 'react';
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
  const [mode, setMode] = useState<'paste' | 'json'>('paste');
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState('autre');
  const [themes, setThemes] = useState<Theme[]>([]);
  const [analyzed, setAnalyzed] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    window.vault.themes.getAll().then(t => setThemes(t as Theme[]));
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
    toast('Prompt importé ✓');
    window.vault.window.closeWindow();
  };

  const handleImportJson = async () => {
    const path = await window.vault.system.openFileDialog({ filters: [{ name: 'JSON', extensions: ['json'] }] });
    if (!path) return;
    const r = await window.vault.import.fromJson(path);
    setReport(r);
    toast(`${r.imported} prompts importés`);
  };

  return (
    <div className="flex flex-col h-screen bg-surface p-4 gap-3">
      <div className="flex items-center justify-between" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <h2 className="font-display text-sm font-bold text-primary">Import rapide</h2>
        <button onClick={() => window.vault.window.closeWindow()} className="text-muted hover:text-text text-xs" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>✕</button>
      </div>

      <div className="flex gap-2">
        {(['paste', 'json'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`px-3 py-1.5 text-sm rounded-lg ${mode === m ? 'bg-primary text-white' : 'bg-bg border border-border text-muted hover:text-text'}`}>
            {m === 'paste' ? 'Coller du texte' : 'Fichier JSON'}
          </button>
        ))}
      </div>

      {mode === 'paste' ? (
        <>
          <textarea value={text} onChange={e => { setText(e.target.value); setAnalyzed(false); }} rows={6}
            placeholder="Collez votre prompt ici (Ctrl+V)…"
            className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary resize-none" />
          {!analyzed ? (
            <button onClick={handleAnalyze} className="px-4 py-2 bg-secondary/20 text-secondary text-sm rounded-lg hover:bg-secondary hover:text-bg">
              Analyser et suggérer ➜
            </button>
          ) : (
            <>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre"
                className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary" />
              <select value={theme} onChange={e => setTheme(e.target.value)}
                className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary">
                {themes.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
              </select>
              <button onClick={handleSavePaste} className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/80">
                Sauvegarder (Ctrl+Enter)
              </button>
            </>
          )}
        </>
      ) : (
        <>
          <button onClick={handleImportJson} className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/80">
            Sélectionner un fichier JSON…
          </button>
          {report && (
            <div className="bg-bg rounded-lg p-3 text-sm space-y-1">
              <div className="text-secondary font-medium">{report.imported} importés</div>
              {report.perfectDuplicates > 0 && <div className="text-muted">· {report.perfectDuplicates} doublons parfaits ignorés</div>}
              {report.titleDuplicates > 0 && <div className="text-muted">· {report.titleDuplicates} doublons de titre</div>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

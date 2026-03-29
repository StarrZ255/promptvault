import React, { createContext, useContext, useState, useEffect, useCallback, Component } from 'react';
import Sidebar from './components/Sidebar';
import PromptList from './components/PromptList';
import Editor from './components/Editor';
import QuickCaptureWindow from './components/QuickCaptureWindow';
import ImportWindow from './components/ImportWindow';
import MiniWindow from './components/MiniWindow';
import TitleBar from './components/TitleBar';
import SettingsModal from './components/SettingsModal';
import CommandPalette from './components/CommandPalette';
import { ToastProvider } from './components/Toast';
import { locales, type Language } from './i18n/locales';
import type { Prompt, SearchFilter, Theme } from './types';

// ─── Error Boundary ───────────────────────────────────────────────────────────
class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-bg text-text p-8">
          <span className="text-4xl mb-4">⚠️</span>
          <h1 className="font-display text-xl font-bold text-red-400 mb-2">Une erreur est survenue</h1>
          <pre className="text-xs text-muted bg-surface rounded-lg p-4 max-w-lg overflow-auto whitespace-pre-wrap">
            {this.state.error.message}
          </pre>
          <button
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/80"
            onClick={() => window.location.reload()}
          >
            Recharger
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface AppState {
  selectedPrompt: Prompt | null;
  setSelectedPrompt: (p: Prompt | null) => void;
  filter: SearchFilter;
  setFilter: React.Dispatch<React.SetStateAction<SearchFilter>>;
  themes: Theme[];
  refreshThemes: () => void;
  promptsVersion: number;
  bumpPromptsVersion: () => void;
  isDark: boolean;
  toggleTheme: () => void;
  showCommandPalette: boolean;
  setShowCommandPalette: (v: boolean) => void;
  language: Language;
  setLanguage: (l: Language) => void;
  t: (key: string, data?: Record<string, string>) => string;
}

export const AppContext = createContext<AppState>({} as AppState);
export const useApp = () => useContext(AppContext);

function AppRouter() {
  const { isDark, showCommandPalette, setSelectedPrompt, selectedPrompt } = useApp();
  const [showSettings, setShowSettings] = useState(false);

  // Listen for settings shortcut globally
  useEffect(() => {
    const offSettings = window.vault.on('shortcut:open-settings', () => setShowSettings(true));
    const offEdit = window.vault.on('shortcut:edit-prompt', (p: any) => {
      setSelectedPrompt(p);
      setShowSettings(false); // Close settings if open
    });
    return () => { offSettings(); offEdit(); };
  }, [setSelectedPrompt]);

  const page = window.location.hash.slice(1) || 'main';

  if (page === 'mini') {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-transparent">
        <MiniWindow />
      </div>
    );
  }

  if (page === 'quick-capture') {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <TitleBar title="Capture Rapide" />
        <QuickCaptureWindow />
      </div>
    );
  }

  if (page === 'import') {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <TitleBar title="Import" />
        <ImportWindow />
      </div>
    );
  }

  // Main Page
  return (
    <>
      <div className="flex h-screen w-screen overflow-hidden bg-bg text-text font-body select-none [&_input]:select-text [&_textarea]:select-text [&_select]:select-text flex-col">
        <TitleBar />
        <div className="flex flex-1 overflow-hidden relative">
          <Sidebar onOpenSettings={() => setShowSettings(true)} />
          <main className="flex flex-1 overflow-hidden">
            <PromptList />
            {selectedPrompt && <Editor />}
          </main>
        </div>
      </div>
      {showCommandPalette && <CommandPalette />}
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}

export default function App() {
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [filter, setFilter] = useState<SearchFilter>({ sortBy: 'updated_at' });
  const [themes, setThemes] = useState<Theme[]>([]);
  const [isDark, setIsDark] = useState(true);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [promptsVersion, setPromptsVersion] = useState(0);
  const [language, setLanguage] = useState<Language>('fr');

  const t = useCallback((key: string, data?: Record<string, string>) => {
    const parts = key.split('.');
    let obj: any = locales[language];
    for (const part of parts) { if (obj) obj = obj[part]; }
    let res = (obj as string) || key;
    if (data) {
      Object.entries(data).forEach(([k, v]) => { res = res.replace(`{{${k}}}`, v); });
    }
    return res;
  }, [language]);

  const bumpPromptsVersion = useCallback(() => setPromptsVersion(v => v + 1), []);
  const toggleTheme = useCallback(() => setIsDark(d => !d), []);
  const setShowCommandPaletteCallback = useCallback((v: boolean) => setShowCommandPalette(v), []);

  const refreshThemes = useCallback(async () => {
    const t = await window.vault.themes.getAll();
    setThemes((t || []) as Theme[]);
  }, []);

  useEffect(() => { refreshThemes(); }, [refreshThemes]);

  useEffect(() => {
    const offSearch = window.vault.on('shortcut:focus-search', () => {
      document.getElementById('search-input')?.focus();
    });
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') { e.preventDefault(); setShowCommandPalette(true); }
      if (e.key === 'Escape') { setShowCommandPalette(false); }
    };
    window.addEventListener('keydown', handleKey);
    return () => { offSearch(); window.removeEventListener('keydown', handleKey); };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const contextValue = React.useMemo(() => ({
    selectedPrompt, setSelectedPrompt,
    filter, setFilter,
    themes, refreshThemes,
    promptsVersion, bumpPromptsVersion,
    isDark, toggleTheme,
    showCommandPalette, setShowCommandPalette: setShowCommandPaletteCallback,
    language, setLanguage, t,
  }), [
    selectedPrompt, setSelectedPrompt,
    filter, setFilter,
    themes, refreshThemes,
    promptsVersion, bumpPromptsVersion,
    isDark, toggleTheme,
    showCommandPalette, setShowCommandPaletteCallback,
    language, t,
  ]);

  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppContext.Provider value={contextValue}>
          <AppRouter />
        </AppContext.Provider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

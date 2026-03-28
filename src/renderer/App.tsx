import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import PromptList from './components/PromptList';
import Editor from './components/Editor';
import QuickCaptureWindow from './components/QuickCaptureWindow';
import ImportWindow from './components/ImportWindow';
import CommandPalette from './components/CommandPalette';
import { ToastProvider } from './components/Toast';
import type { Prompt, SearchFilter, Theme } from './types';

interface AppState {
  selectedPrompt: Prompt | null;
  setSelectedPrompt: (p: Prompt | null) => void;
  filter: SearchFilter;
  setFilter: (f: SearchFilter) => void;
  themes: Theme[];
  refreshThemes: () => void;
  isDark: boolean;
  toggleTheme: () => void;
  showCommandPalette: boolean;
  setShowCommandPalette: (v: boolean) => void;
}

export const AppContext = createContext<AppState>({} as AppState);
export const useApp = () => useContext(AppContext);

function MainLayout() {
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [filter, setFilter] = useState<SearchFilter>({ sortBy: 'updated_at' });
  const [themes, setThemes] = useState<Theme[]>([]);
  const [isDark, setIsDark] = useState(true);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  const refreshThemes = useCallback(async () => {
    const t = await window.vault.themes.getAll();
    setThemes(t as Theme[]);
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

  return (
    <AppContext.Provider value={{
      selectedPrompt, setSelectedPrompt,
      filter, setFilter,
      themes, refreshThemes,
      isDark, toggleTheme: () => setIsDark(d => !d),
      showCommandPalette, setShowCommandPalette,
    }}>
      <div className="flex h-screen w-screen overflow-hidden bg-bg text-text font-body select-none">
        {/* Zone de drag pour la barre de titre custom */}
        <div
          className="fixed top-0 left-0 right-0 h-8 z-50"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        />
        <Sidebar />
        <main className="flex flex-1 overflow-hidden pt-8">
          <PromptList />
          {selectedPrompt && <Editor />}
        </main>
      </div>
      {showCommandPalette && <CommandPalette />}
    </AppContext.Provider>
  );
}

export default function App() {
  const page = window.location.hash.slice(1) || 'main';

  if (page === 'quick-capture') {
    return (
      <ToastProvider>
        <QuickCaptureWindow />
      </ToastProvider>
    );
  }
  if (page === 'import') {
    return (
      <ToastProvider>
        <ImportWindow />
      </ToastProvider>
    );
  }
  return (
    <ToastProvider>
      <MainLayout />
    </ToastProvider>
  );
}

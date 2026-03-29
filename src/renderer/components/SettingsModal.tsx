import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../App';
import type { Theme, Prompt } from '../types';
import { useToast } from './Toast';
import ThemeGlyph from './ThemeGlyph';
import { locales, type Language } from '../i18n/locales';

const ICON_GALLERY = [
  { category: 'IA & Notebook', icons: ['📓', '🤖', '🧠', '✨', '📡', '💎', '🎨', '🔍', '📝', '⚡'] },
  { category: 'Technologie', icons: ['💻', '📱', '🔋', '⚙️', '🧪', '👾', '🕹️', '💾', '📶', '🖥️'] },
  { category: 'Cuisine', icons: ['🍳', '🥘', '🥗', '🍴', '🍷', '🍰', '☕', '🍜', '🍕', '🍓'] },
  { category: 'Vie Quotidienne', icons: ['🏠', '🚗', '🛒', '🧺', '🛀', '🧹', '🔑', '🎒', '🚲', '🛌'] },
  { category: 'Travail', icons: ['✍️', '📂', '📊', '🛠️', '💡', '🏗️', '📅', '📎', '🏢', '📠'] },
  { category: 'Nature', icons: ['🏔️', '🌳', '🌊', '☀️', '🌻', '🐚', '🦜', '🐾', '🔥', '🌈'] }
];

interface Props { open: boolean; onClose: () => void; }

export default function SettingsModal({ open, onClose }: Props) {
  const { themes, refreshThemes, promptsVersion, bumpPromptsVersion, t, language, setLanguage } = useApp();
  const { toast } = useToast();
  const [tab, setTab] = useState<'general' | 'themes' | 'data' | 'shortcuts'>('general');

  // Theme editing
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editColor, setEditColor] = useState('');
  const [addingTheme, setAddingTheme] = useState(false);
  const [newThemeName, setNewThemeName] = useState('');
  const [newThemeIcon, setNewThemeIcon] = useState('🗂️');
  const [newThemeColor, setNewThemeColor] = useState('#6C63FF');

  // Shortcuts
  const [shortcuts, setShortcuts] = useState<{ toggleMini: string; quickCapture: string; focusSearch: string; openMain: string } | null>(null);
  const [recordingKey, setRecordingKey] = useState<string | null>(null);

  const [suppressedBuiltins, setSuppressedBuiltins] = useState<Prompt[]>([]);
  const [showSuppressedFolder, setShowSuppressedFolder] = useState(false);
  const [deletingBuiltins, setDeletingBuiltins] = useState(false);

  useEffect(() => {
    window.vault.prompts.getSuppressedBuiltins().then(r => setSuppressedBuiltins(r as Prompt[]));
    window.vault.shortcuts.get().then(s => setShortcuts(s));
  }, [open, promptsVersion]);

  const handleRecordShortcut = (key: string) => {
    setRecordingKey(key);
  };

  useEffect(() => {
    if (!recordingKey) return;
    const handleKeyDown = async (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        setRecordingKey(null);
        return;
      }

      const keys = [];
      if (e.ctrlKey) keys.push('Control');
      if (e.altKey) keys.push('Alt');
      if (e.shiftKey) keys.push('Shift');
      if (e.metaKey) keys.push('Meta');
      
      const keyStr = e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key;
      
      // If no modifiers are pressed, we usually don't want bare keys as global shortcuts
      if (!['Control', 'Alt', 'Shift', 'Meta'].includes(keyStr)) {
        // Enforce Shift+Alt or Ctrl+Alt or just Alt+ for safety
        if (!e.altKey && !e.ctrlKey && !e.metaKey) {
           toast(`Please use a modifier (Alt, Ctrl)`);
           return;
        }

        keys.push(keyStr);
        const accelerator = [...new Set(keys)].join('+'); // Deduplicate
        const newShortcuts = { ...shortcuts!, [recordingKey]: accelerator };
        
        const res = await window.vault.shortcuts.set(newShortcuts);
        if (res.success) {
          setShortcuts(newShortcuts);
          toast(`${t('shortcuts.shortcut')} : ${accelerator}`);
        } else {
          toast(`Conflict: ${res.errors.join(', ')} occupied`);
        }
        setRecordingKey(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [recordingKey, shortcuts, t, toast]);

  const startEditTheme = (tItem: Theme) => {
    setEditingTheme(tItem);
    setEditLabel(tItem.label);
    setEditIcon(tItem.icon);
    setEditColor(tItem.color);
  };

  const handleSaveTheme = async () => {
    if (!editingTheme) return;
    await window.vault.themes.update(editingTheme.id, { label: editLabel, icon: editIcon, color: editColor });
    setEditingTheme(null);
    refreshThemes();
    toast(t('toasts.theme_updated'));
  };

  const handleDeleteTheme = async (id: string) => {
    if (!window.confirm(t('actions.confirm_delete', { title: '' }))) return;
    await window.vault.themes.delete(id);
    refreshThemes();
    toast(t('toasts.theme_deleted'));
  };

  const handleAddTheme = async () => {
    if (!newThemeName.trim()) return;
    const id = newThemeName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || `custom-${Date.now()}`;
    await window.vault.themes.create({ id, label: newThemeName, icon: newThemeIcon, color: newThemeColor });
    setNewThemeName(''); setNewThemeIcon('🗂️'); setAddingTheme(false);
    refreshThemes();
    toast(t('toasts.theme_created'));
  };

  const handleRestoreSuppressed = async (id: string) => {
    await window.vault.prompts.update(id, { suppressed: 0 });
    bumpPromptsVersion();
    toast(t('toasts.prompt_saved'));
  };

  const handleDeleteBuiltins = async () => {
    if (!window.confirm(t('actions.confirm_delete_builtins'))) return;
    setDeletingBuiltins(true);
    try {
      await window.vault.prompts.deleteBuiltins();
      bumpPromptsVersion();
      toast(t('toasts.builtins_deleted'));
    } catch (e) {
      toast(`Error: ${String(e)}`);
    } finally {
      setDeletingBuiltins(false);
    }
  };

  const handlePickIconImage = async () => {
    if (!editingTheme) return;
    await window.vault.themes.saveIconImage(editingTheme.id);
    refreshThemes();
    toast(t('toasts.theme_updated'));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-bg/80 backdrop-blur-md"
        onClick={onClose}
      />

      <motion.div
        layoutId="modal"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-2xl h-[85vh] bg-surface border border-border rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface/50">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚙️</span>
            <h2 className="text-lg font-bold font-display text-text pb-1">{t('settings.title')}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-muted transition-colors">✕</button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-48 border-r border-border p-3 space-y-1">
            <button onClick={() => setTab('general')}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all ${tab === 'general' ? 'bg-primary text-white shadow-lg shadow-primary/20 font-bold' : 'text-muted hover:bg-white/5'}`}>
              ⚙️ {t('settings.general')}
            </button>
            <button onClick={() => setTab('themes')}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all ${tab === 'themes' ? 'bg-primary text-white shadow-lg shadow-primary/20 font-bold' : 'text-muted hover:bg-white/5'}`}>
              🎨 {t('sidebar.themes')}
            </button>
            <button onClick={() => setTab('shortcuts')}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all ${tab === 'shortcuts' ? 'bg-primary text-white shadow-lg shadow-primary/20 font-bold' : 'text-muted hover:bg-white/5'}`}>
              ⌨️ {t('settings.shortcuts')}
            </button>
            <button onClick={() => setTab('data')}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all ${tab === 'data' ? 'bg-primary text-white shadow-lg shadow-primary/20 font-bold' : 'text-muted hover:bg-white/5'}`}>
              📦 {t('settings.general').toUpperCase() === 'GENERAL' ? 'Data' : 'Données'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
            {tab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted mb-4">{t('settings.language')}</h3>
                  <div className="flex flex-wrap gap-2 text-primary">
                    {(Object.keys(locales) as Language[]).map(lang => (
                      <button 
                        key={lang}
                        onClick={() => setLanguage(lang)}
                        className={`px-6 py-3 rounded-2xl border-2 transition-all font-bold flex flex-col items-center gap-1
                          ${language === lang ? 'bg-primary border-primary text-white shadow-xl shadow-primary/20 scale-105' : 'bg-surface border-border text-muted hover:border-primary/50'}`}
                      >
                        <span className="text-xs">{lang === 'fr' ? '🇫🇷' : '🇺🇸'}</span>
                        <span className="text-sm tracking-wide">{lang === 'fr' ? 'FRANÇAIS' : 'ENGLISH'}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-border/10">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted mb-4">PromptVault</h3>
                  <p className="text-xs text-muted leading-relaxed font-medium">
                    {t('settings.description')}
                  </p>
                </div>
              </div>
            )}

            {tab === 'themes' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted mb-4">{t('sidebar.themes')}</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {themes.map(tItem => (
                      <div key={tItem.id} className="group relative">
                        {editingTheme?.id === tItem.id ? (
                          <div className="bg-bg border border-primary/40 rounded-2xl p-4 space-y-4 animate-in fade-in zoom-in duration-200">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold uppercase tracking-widest text-primary">ÉDITION</span>
                              <button onClick={() => setEditingTheme(null)} className="text-muted hover:text-text">✕</button>
                            </div>
                            <div className="flex gap-3">
                              <input value={editIcon} onChange={e => setEditIcon(e.target.value)}
                                className="w-14 h-14 bg-surface border border-border rounded-xl text-center text-2xl focus:outline-none focus:border-primary shadow-inner" />
                              <div className="flex-1 space-y-2">
                                <input value={editLabel} onChange={e => setEditLabel(e.target.value)}
                                  className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
                                <div className="flex gap-2">
                                  <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)}
                                    className="w-10 h-10 rounded-xl border border-border cursor-pointer bg-transparent" />
                                  <button onClick={handlePickIconImage}
                                    className="flex-1 py-2 px-3 rounded-xl border border-border text-[11px] font-bold text-muted hover:text-text hover:bg-white/5 transition-all truncate">
                                    {tItem.icon_image ? '🖼 Image ✓' : '🖼 Image'}
                                  </button>
                                </div>
                              </div>
                            </div>
                            <button onClick={handleSaveTheme}
                              className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all">
                              {t('actions.ok')}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-bg border border-border hover:border-primary/40 group transition-all">
                            <ThemeGlyph theme={tItem} className="!w-6 !h-6 !text-lg" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-text truncate leading-tight">{tItem.label}</p>
                              <p className="text-[11px] text-muted">{(tItem as any).count ?? 0} {t('items_count').toLowerCase()}</p>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => startEditTheme(tItem)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-muted hover:text-primary transition-colors">✏️</button>
                              {tItem.is_custom === 1 && (
                                <button onClick={() => handleDeleteTheme(tItem.id)}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-muted hover:text-red-400 transition-colors">🗑</button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setAddingTheme(true)}
                    className="w-full mt-4 py-3 rounded-2xl border-2 border-dashed border-border hover:border-primary/40 text-sm font-bold text-muted hover:text-text transition-all bg-surface/50">
                    + {t('sidebar.add_theme')}
                  </button>
                </div>
              </div>
            )}

            {tab === 'data' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted mb-4">Data Actions</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <button onClick={() => window.vault.window.openImport()}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border hover:border-primary/40 bg-surface/50 group transition-all text-left">
                      <span className="text-2xl group-hover:scale-110 transition-transform">📥</span>
                      <div>
                        <p className="text-sm font-bold">Import Database</p>
                        <p className="text-xs text-muted">JSON or PromptVault backup</p>
                      </div>
                    </button>
                    <button onClick={async () => {
                        const path = await window.vault.export.toJson();
                        if (path) {
                          bumpPromptsVersion();
                          toast(`Exported successfully ✓`);
                        }
                      }}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border hover:border-secondary/40 bg-surface/50 group transition-all text-left">
                      <span className="text-2xl group-hover:scale-110 transition-transform text-secondary">📤</span>
                      <div>
                        <p className="text-sm font-bold">Export Library (JSON)</p>
                        <p className="text-xs text-muted">Backup all your prompts to a local file</p>
                      </div>
                    </button>
                    <button 
                      onClick={handleDeleteBuiltins}
                      disabled={deletingBuiltins}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border hover:border-red-500/40 bg-surface/50 group transition-all text-left disabled:opacity-50"
                    >
                      <span className="text-2xl group-hover:scale-110 transition-transform">🗑️</span>
                      <div>
                        <p className="text-sm font-bold text-red-400">{t('settings.delete_builtins_label')}</p>
                        <p className="text-xs text-muted">{t('settings.delete_builtins_desc')}</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tab === 'shortcuts' && (
              <div className="space-y-6">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted mb-4">{t('settings.shortcuts')}</h3>
                <div className="space-y-4">
                  {[
                    { id: 'toggleMini', label: 'Launcher Hub', desc: 'Display quick access hub' },
                    { id: 'quickCapture', label: 'Quick Capture', desc: 'Open quick prompt entry window' },
                    { id: 'focusSearch', label: 'Focus Search', desc: 'Jump to search in main app' },
                    { id: 'openMain', label: 'Open Main App', desc: 'Show main interface' }
                  ].map(s => (
                    <div key={s.id} className="p-4 rounded-2xl border border-border bg-surface/30 flex items-center justify-between group">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-text">{s.label}</p>
                        <p className="text-[11px] text-muted">{s.desc}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <button
                          onClick={() => handleRecordShortcut(s.id)}
                          className={`min-w-[140px] px-4 py-2 rounded-xl border text-sm font-mono font-bold transition-all
                            ${recordingKey === s.id 
                              ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30 animate-pulse ring-4 ring-primary/20' 
                              : 'bg-bg border-border text-muted hover:border-primary/50'}`}
                        >
                          {recordingKey === s.id ? t('shortcuts.recording') || 'Type keys...' : (shortcuts as any)?.[s.id] || '---'}
                        </button>
                        {recordingKey === s.id && (
                          <span className="text-[9px] text-muted/50 font-bold uppercase tracking-widest leading-none mt-1 animate-in fade-in slide-in-from-top-1">
                            {language === 'fr' ? 'Échap. pour annuler' : 'Esc to cancel'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

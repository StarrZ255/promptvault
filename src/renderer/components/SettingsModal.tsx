import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../App';
import type { Theme, Prompt } from '../types';
import { useToast } from './Toast';
import ThemeGlyph from './ThemeGlyph';

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
  const { themes, refreshThemes, promptsVersion, bumpPromptsVersion } = useApp();
  const { toast } = useToast();
  const [tab, setTab] = useState<'themes' | 'data' | 'shortcuts'>('themes');

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

  useEffect(() => {
    window.vault.prompts.getSuppressedBuiltins().then(r => setSuppressedBuiltins(r as Prompt[]));
    window.vault.shortcuts.get().then(s => setShortcuts(s));
  }, [open, promptsVersion]);

  const handleRecordShortcut = (key: string) => {
    setRecordingKey(key);
  };

  useEffect(() => {
    if (!recordingKey) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const keys = [];
      if (e.ctrlKey) keys.push('Control');
      if (e.altKey) keys.push('Alt');
      if (e.shiftKey) keys.push('Shift');
      if (e.metaKey) keys.push('Meta');
      
      const key = e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key;
      if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
        keys.push(key);
        const accelerator = keys.join('+');
        const newShortcuts = { ...shortcuts!, [recordingKey]: accelerator };
        setShortcuts(newShortcuts);
        window.vault.shortcuts.set(newShortcuts);
        setRecordingKey(null);
        toast(`Raccourci mis à jour : ${accelerator}`);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [recordingKey, shortcuts]);

  const startEditTheme = (t: Theme) => {
    setEditingTheme(t);
    setEditLabel(t.label);
    setEditIcon(t.icon);
    setEditColor(t.color);
  };

  const handleSaveTheme = async () => {
    if (!editingTheme) return;
    await window.vault.themes.update(editingTheme.id, { label: editLabel, icon: editIcon, color: editColor });
    setEditingTheme(null);
    refreshThemes();
    toast('Thématique mise à jour ✓');
  };

  const handleDeleteTheme = async (id: string) => {
    if (!window.confirm('Supprimer cette thématique ? Les prompts associés seront classés dans « Autre ».')) return;
    await window.vault.themes.delete(id);
    refreshThemes();
    toast('Thématique supprimée');
  };

  const handleAddTheme = async () => {
    if (!newThemeName.trim()) return;
    const id = newThemeName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || `custom-${Date.now()}`;
    await window.vault.themes.create({ id, label: newThemeName, icon: newThemeIcon, color: newThemeColor });
    setNewThemeName(''); setNewThemeIcon('🗂️'); setAddingTheme(false);
    refreshThemes();
    toast('Thématique créée ✓');
  };

  const handleRestoreSuppressed = async (id: string) => {
    await window.vault.prompts.update(id, { suppressed: 0 });
    bumpPromptsVersion();
    toast('Prompt restauré dans la bibliothèque');
  };

  const handlePickIconImage = async () => {
    if (!editingTheme) return;
    await window.vault.themes.saveIconImage(editingTheme.id);
    refreshThemes();
    toast('Image de thématique mise à jour ✓');
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
            <h2 className="text-lg font-bold font-display text-text">Paramètres</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-muted transition-colors">✕</button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-48 border-r border-border p-3 space-y-1">
            <button onClick={() => setTab('themes')}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all ${tab === 'themes' ? 'bg-primary text-white shadow-lg shadow-primary/20 font-bold' : 'text-muted hover:bg-white/5'}`}>
              🎨 Thématiques
            </button>
            <button onClick={() => setTab('shortcuts')}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all ${tab === 'shortcuts' ? 'bg-primary text-white shadow-lg shadow-primary/20 font-bold' : 'text-muted hover:bg-white/5'}`}>
              ⌨️ Raccourcis
            </button>
            <button onClick={() => setTab('data')}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all ${tab === 'data' ? 'bg-primary text-white shadow-lg shadow-primary/20 font-bold' : 'text-muted hover:bg-white/5'}`}>
              📦 Données
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
            {tab === 'themes' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted mb-4">Mes Thématiques</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {themes.map(t => (
                      <div key={t.id} className="group relative">
                        {editingTheme?.id === t.id ? (
                          /* Mode Édition */
                          <div className="bg-bg border border-primary/40 rounded-2xl p-4 space-y-4 animate-in fade-in zoom-in duration-200">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold uppercase tracking-widest text-primary">Édition</span>
                              <button onClick={() => setEditingTheme(null)} className="text-muted hover:text-text">✕</button>
                            </div>

                            <div className="flex gap-3">
                              <div className="relative group/icon">
                                <input value={editIcon} onChange={e => setEditIcon(e.target.value)}
                                  className="w-14 h-14 bg-surface border border-border rounded-xl text-center text-2xl focus:outline-none focus:border-primary shadow-inner" />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/icon:opacity-100 transition-opacity bg-surface/80 rounded-xl pointer-events-none">
                                  <span className="text-[10px] font-bold">EMOJI</span>
                                </div>
                              </div>
                              <div className="flex-1 space-y-2">
                                <input value={editLabel} onChange={e => setEditLabel(e.target.value)}
                                  className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
                                <div className="flex gap-2">
                                  <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)}
                                    className="w-10 h-10 rounded-xl border border-border cursor-pointer bg-transparent" />
                                  <button onClick={handlePickIconImage}
                                    className="flex-1 py-2 px-3 rounded-xl border border-border text-[11px] font-bold text-muted hover:text-text hover:bg-white/5 transition-all truncate">
                                    {t.icon_image ? '🖼 Image (Fichier) ✓' : '🖼 Image (Fichier)'}
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Bibliothèque d'icônes intégrée */}
                            <div className="space-y-3 pt-2 border-t border-border/10">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Bibliothèque d'icônes</p>
                              <div className="space-y-3 max-h-40 overflow-y-auto no-scrollbar">
                                {ICON_GALLERY.map(cat => (
                                  <div key={cat.category}>
                                    <p className="text-[9px] text-muted/60 mb-1 ml-1">{cat.category}</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {cat.icons.map(icon => (
                                        <button 
                                          key={icon} 
                                          onClick={() => setEditIcon(icon)}
                                          className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-all text-lg
                                            ${editIcon === icon ? 'bg-primary border-primary shadow-lg shadow-primary/20 scale-110' : 'bg-surface border-border hover:border-muted'}`}
                                        >
                                          {icon}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <button onClick={handleSaveTheme}
                              className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all">
                              Mettre à jour la thématique
                            </button>
                          </div>
                        ) : (
                          /* Mode Affichage */
                          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-bg border border-border hover:border-primary/40 group transition-all">
                            <ThemeGlyph theme={t} className="!w-6 !h-6 !text-lg" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-text truncate leading-tight">{t.label}</p>
                              <p className="text-[11px] text-muted">{(t as any).count ?? 0} prompts</p>
                            </div>
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                            
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => startEditTheme(t)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-muted hover:text-primary transition-colors">✏️</button>
                              {t.is_custom === 1 ? (
                                <button onClick={() => handleDeleteTheme(t.id)}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-muted hover:text-red-400 transition-colors">🗑</button>
                              ) : (
                                <span className="text-[10px] font-bold uppercase text-muted/30 px-2 py-2">System</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {!addingTheme ? (
                    <button onClick={() => setAddingTheme(true)}
                      className="w-full mt-4 py-3 rounded-2xl border-2 border-dashed border-border hover:border-primary/40 text-sm font-bold text-muted hover:text-text transition-all bg-surface/50">
                      + Créer une thématique personnalisée
                    </button>
                  ) : (
                    <div className="mt-4 bg-bg border border-border rounded-2xl p-5 space-y-4 animate-in slide-in-from-bottom-2 duration-200">
                      <p className="text-xs font-bold uppercase tracking-widest text-muted">Nouvelle thématique</p>
                      
                      <div className="flex gap-3">
                        <input value={newThemeIcon} onChange={e => setNewThemeIcon(e.target.value)}
                          className="w-14 h-14 bg-surface border border-border rounded-xl text-center text-2xl focus:outline-none focus:border-primary shadow-inner"
                          placeholder="🎯" />
                        <div className="flex-1 space-y-2">
                          <input value={newThemeName} onChange={e => setNewThemeName(e.target.value)}
                            placeholder="Nom de la thématique"
                            className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
                          <input type="color" value={newThemeColor} onChange={e => setNewThemeColor(e.target.value)}
                            className="w-full h-8 rounded-xl border border-border cursor-pointer bg-transparent" />
                        </div>
                      </div>

                      {/* Galerie rapide pour nouveau thème */}
                      <div className="flex flex-wrap gap-1.5 border-t border-border/10 pt-3">
                        {ICON_GALLERY[0].icons.concat(ICON_GALLERY[1].icons).slice(0, 15).map(icon => (
                          <button key={icon} onClick={() => setNewThemeIcon(icon)}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all
                              ${newThemeIcon === icon ? 'bg-primary border-primary text-white scale-110' : 'bg-surface border-border hover:border-muted'}`}>
                            {icon}
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button onClick={handleAddTheme}
                          className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all">
                          Créer maintenant
                        </button>
                        <button onClick={() => setAddingTheme(false)}
                          className="px-5 py-2.5 rounded-xl border border-border text-sm text-muted hover:text-text hover:bg-white/5 transition-all">
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'data' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted mb-4">Actions de données</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <button onClick={() => window.vault.window.openImport()}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border hover:border-primary/40 bg-surface/50 group transition-all text-left">
                      <span className="text-2xl group-hover:scale-110 transition-transform">📥</span>
                      <div>
                        <p className="text-sm font-bold">Importer des prompts</p>
                        <p className="text-xs text-muted">JSON, Texte brut, ou Sauvegarde PromptVault</p>
                      </div>
                    </button>

                    <button onClick={async () => {
                        const path = await window.vault.export.toJson();
                        if (path) toast(`Bibliothèque exportée avec succès ✓`);
                      }}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border hover:border-secondary/40 bg-surface/50 group transition-all text-left">
                      <span className="text-2xl group-hover:scale-110 transition-transform text-secondary">📤</span>
                      <div>
                        <p className="text-sm font-bold">Exporter ma bibliothèque (JSON)</p>
                        <p className="text-xs text-muted">Sauvegardez tous vos prompts dans un fichier JSON</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <button
                    onClick={() => setShowSuppressedFolder(!showSuppressedFolder)}
                    className="flex items-center gap-2 w-full px-2 text-xs font-bold text-muted uppercase tracking-widest hover:text-text transition-colors"
                  >
                    <span>{showSuppressedFolder ? '📂' : '📁'}</span>
                    <span>Prompts officiels masqués ({suppressedBuiltins.length})</span>
                    <span className="ml-auto text-[10px]">{showSuppressedFolder ? '▼' : '▶'}</span>
                  </button>
                  
                  {showSuppressedFolder && (
                    <div className="space-y-1.5 border-l border-border ml-2 pl-4 py-1 animate-in fade-in slide-in-from-left-2">
                      {suppressedBuiltins.length === 0 ? (
                        <p className="text-[11px] text-muted italic px-2">Aucun prompt masqué</p>
                      ) : (
                        <div className="max-h-60 overflow-y-auto space-y-2 no-scrollbar">
                          {suppressedBuiltins.map(p => (
                            <div key={p.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-bg border border-border">
                              <span className="flex-1 text-xs font-bold text-text truncate">{p.title}</span>
                              <button onClick={() => handleRestoreSuppressed(p.id)}
                                className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary hover:text-white transition-all">
                                Démasquer
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'shortcuts' && (
              <div className="space-y-6">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted mb-4">Raccourcis Clavier Globaux</h3>
                
                <div className="space-y-4">
                  {[
                    { id: 'toggleMini', label: 'Ouvrir la barre flottante Launcher', desc: 'Affiche la barre de recherche rapide' },
                    { id: 'quickCapture', label: 'Capture rapide', desc: 'Ouvre une petite fenêtre pour ajouter un prompt' },
                    { id: 'focusSearch', label: 'Focus recherche App', desc: 'Ouvre l\'app et place le focus sur la recherche' },
                    { id: 'openMain', label: 'Ouvrir l\'application complète', desc: 'Affiche la fenêtre principale' }
                  ].map(s => (
                    <div key={s.id} className="p-4 rounded-2xl border border-border bg-surface/30 flex items-center justify-between group">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-text">{s.label}</p>
                        <p className="text-[11px] text-muted">{s.desc}</p>
                      </div>
                      <button
                        onClick={() => handleRecordShortcut(s.id)}
                        className={`min-w-[120px] px-4 py-2 rounded-xl border text-sm font-mono font-bold transition-all
                          ${recordingKey === s.id 
                            ? 'bg-primary/20 border-primary text-primary animate-pulse' 
                            : 'bg-bg border-border text-muted hover:border-primary/50'}`}
                      >
                        {recordingKey === s.id ? 'Appuyez...' : (shortcuts as any)?.[s.id] || 'Non défini'}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-8 p-4 rounded-2xl bg-primary/5 border border-primary/10">
                  <p className="text-xs text-muted flex gap-2">
                    <span>💡</span>
                    <span>Cliquez sur un bouton pour changer son raccourci. Évitez les combinaisons simples (comme 'A') pour ne pas bloquer votre frappe habituelle.</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

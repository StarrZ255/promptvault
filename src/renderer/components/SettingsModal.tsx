import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../App';
import { useToast } from './Toast';
import type { Theme } from '../types';

interface ShortcutMap { toggleMini: string; quickCapture: string; focusSearch: string; openMain: string; }
const SHORTCUT_LABELS: Record<keyof ShortcutMap, string> = {
  toggleMini:   'Mini-fenêtre (Alt+P)',
  quickCapture: 'Capture rapide (Alt+N)',
  focusSearch:  'Focus recherche (Alt+F)',
  openMain:     'Ouvrir l\'app (Alt+O)',
};

interface Props { open: boolean; onClose: () => void; }

export default function SettingsModal({ open, onClose }: Props) {
  const { isDark, toggleTheme, themes, refreshThemes } = useApp();
  const { toast } = useToast();
  const [tab, setTab] = useState<'general' | 'shortcuts' | 'themes' | 'data'>('general');

  // Démarrage auto
  const [startupEnabled, setStartupEnabled] = useState(false);

  // Raccourcis
  const [shortcuts, setShortcuts] = useState<ShortcutMap>({ toggleMini: 'Alt+P', quickCapture: 'Alt+N', focusSearch: 'Alt+F', openMain: 'Alt+O' });
  const [recording, setRecording] = useState<keyof ShortcutMap | null>(null);
  const recordingRef = useRef<keyof ShortcutMap | null>(null);

  // Thèmes — création
  const [newThemeName, setNewThemeName] = useState('');
  const [newThemeIcon, setNewThemeIcon] = useState('🗂️');
  const [newThemeColor, setNewThemeColor] = useState('#6C63FF');
  const [addingTheme, setAddingTheme] = useState(false);

  // Thèmes — édition inline
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editColor, setEditColor] = useState('');

  useEffect(() => {
    if (!open) return;
    window.vault.startup?.get().then((v: boolean) => setStartupEnabled(v));
    window.vault.shortcuts?.get().then((s: ShortcutMap) => setShortcuts(s));
  }, [open]);

  useEffect(() => { recordingRef.current = recording; }, [recording]);

  // Fermer avec Escape (sauf si on enregistre un raccourci)
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !recording) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, recording, onClose]);

  // Capture de touche pour les raccourcis
  useEffect(() => {
    if (!recording) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') { setRecording(null); return; }
      if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;
      const parts: string[] = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
      const combo = parts.join('+');
      setShortcuts(prev => ({ ...prev, [recordingRef.current!]: combo }));
      setRecording(null);
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [recording]);

  const saveShortcuts = async () => {
    await window.vault.shortcuts.set(shortcuts);
    toast('Raccourcis sauvegardés ✓');
  };

  const handleToggleStartup = async () => {
    const next = !startupEnabled;
    await window.vault.startup.set(next);
    setStartupEnabled(next);
    toast(next ? 'Démarrage automatique activé ✓' : 'Démarrage automatique désactivé');
  };

  const handleAddTheme = async () => {
    if (!newThemeName.trim()) return;
    const id = newThemeName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    await window.vault.themes.create({ id, label: newThemeName, icon: newThemeIcon, color: newThemeColor });
    refreshThemes();
    setNewThemeName(''); setNewThemeIcon('🗂️'); setNewThemeColor('#6C63FF');
    setAddingTheme(false);
    toast('Thématique créée ✓');
  };

  const startEditTheme = (t: Theme) => {
    setEditingThemeId(t.id);
    setEditLabel(t.label);
    setEditIcon(t.icon);
    setEditColor(t.color);
  };

  const saveEditTheme = async (id: string) => {
    await window.vault.themes.update(id, { label: editLabel, icon: editIcon, color: editColor });
    refreshThemes();
    setEditingThemeId(null);
    toast('Thématique modifiée ✓');
  };

  const handleDeleteTheme = async (id: string) => {
    if (!confirm('Supprimer cette thématique ? Les prompts associés resteront mais sans thématique assignée.')) return;
    await window.vault.themes.delete(id);
    refreshThemes();
    toast('Thématique supprimée');
  };

  const TABS = [
    { key: 'general',   label: '⚙️ Général' },
    { key: 'shortcuts', label: '⌨️ Raccourcis' },
    { key: 'themes',    label: '🎨 Thèmes' },
    { key: 'data',      label: '💾 Données' },
  ] as const;

  const modalContent = (
    <AnimatePresence>
      {open && (
        /* Backdrop + centering wrapper */
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={onClose}
        >
          {/* Fond flouté */}
          <motion.div
            key="bd"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          />

          {/* Fenêtre modale — Framer Motion gère uniquement opacity/scale, pas translate */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            style={{ position: 'relative', zIndex: 1, width: 520, maxHeight: '80vh' }}
            className="bg-surface border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <h2 className="font-display text-base font-bold text-text">Paramètres</h2>
              <button onClick={onClose} className="text-muted hover:text-text p-1.5 rounded-lg hover:bg-white/5 transition-colors">✕</button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border flex-shrink-0 px-2 pt-1">
              {TABS.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`px-3 py-2 text-xs font-medium rounded-t-lg transition-colors whitespace-nowrap
                    ${tab === t.key ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-muted hover:text-text'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* ─── Général ─────────────────────────────────────────────────── */}
              {tab === 'general' && (
                <>
                  <section className="space-y-2">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wider">Apparence</p>
                    <button onClick={toggleTheme}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-bg border border-border hover:border-primary/40 transition-colors">
                      <span className="text-xl">{isDark ? '☀️' : '🌙'}</span>
                      <span className="text-sm">{isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}</span>
                    </button>
                  </section>
                  <section className="space-y-2">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wider">Système</p>
                    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-bg border border-border">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🚀</span>
                        <div>
                          <p className="text-sm">Démarrage automatique</p>
                          <p className="text-xs text-muted">Lancer PromptVault au démarrage de Windows</p>
                        </div>
                      </div>
                      <button onClick={handleToggleStartup}
                        className={`relative w-11 h-6 rounded-full transition-colors ${startupEnabled ? 'bg-primary' : 'bg-border'}`}>
                        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform
                          ${startupEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </section>
                </>
              )}

              {/* ─── Raccourcis ──────────────────────────────────────────────── */}
              {tab === 'shortcuts' && (
                <>
                  <p className="text-xs text-muted">Clique sur un raccourci puis appuie sur la combinaison souhaitée. Appuie sur Échap pour annuler.</p>
                  <div className="space-y-2">
                    {(Object.keys(SHORTCUT_LABELS) as (keyof ShortcutMap)[]).map(key => (
                      <div key={key} className="flex items-center justify-between px-4 py-3 rounded-xl bg-bg border border-border">
                        <span className="text-sm text-text">{SHORTCUT_LABELS[key]}</span>
                        <button
                          onClick={() => setRecording(recording === key ? null : key)}
                          className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all
                            ${recording === key
                              ? 'bg-primary/20 text-primary border border-primary animate-pulse'
                              : 'bg-surface border border-border text-text hover:border-primary/40'}`}>
                          {recording === key ? '⌨️ En attente…' : (shortcuts[key] || 'Non défini')}
                        </button>
                      </div>
                    ))}
                  </div>
                  <button onClick={saveShortcuts}
                    className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-all">
                    Sauvegarder les raccourcis
                  </button>
                  <p className="text-xs text-muted text-center">Les raccourcis s'appliquent immédiatement après sauvegarde.</p>
                </>
              )}

              {/* ─── Thèmes ──────────────────────────────────────────────────── */}
              {tab === 'themes' && (
                <>
                  <div className="space-y-1.5">
                    {(themes as Theme[]).map(t => (
                      <div key={t.id}>
                        {editingThemeId === t.id ? (
                          /* Mode édition */
                          <div className="bg-bg border border-primary/40 rounded-xl p-3 space-y-2">
                            <div className="flex gap-2">
                              <input value={editIcon} onChange={e => setEditIcon(e.target.value)}
                                className="w-12 bg-surface border border-border rounded-lg px-2 py-1.5 text-center text-base focus:outline-none focus:border-primary"
                                placeholder="🎯" />
                              <input value={editLabel} onChange={e => setEditLabel(e.target.value)}
                                className="flex-1 bg-surface border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary" />
                              <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)}
                                className="w-10 h-9 rounded-lg border border-border cursor-pointer bg-transparent" />
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => saveEditTheme(t.id)}
                                className="flex-1 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold">
                                ✓ Enregistrer
                              </button>
                              <button onClick={() => setEditingThemeId(null)}
                                className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted hover:text-text">
                                Annuler
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Mode affichage */
                          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-bg border border-border group">
                            <span className="text-lg w-7 text-center">{t.icon}</span>
                            <span className="flex-1 text-sm">{t.label}</span>
                            <span className="text-xs text-muted">{(t as any).count ?? 0} prompts</span>
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                            {t.is_custom === 1 ? (
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => startEditTheme(t)}
                                  className="text-muted hover:text-primary text-sm px-1 transition-colors" title="Modifier">✏️</button>
                                <button onClick={() => handleDeleteTheme(t.id)}
                                  className="text-red-400/60 hover:text-red-400 text-sm px-1 transition-colors" title="Supprimer">🗑</button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted/40 px-1">officiel</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Ajouter une thématique */}
                  {!addingTheme ? (
                    <button onClick={() => setAddingTheme(true)}
                      className="w-full py-2.5 rounded-xl border border-dashed border-border hover:border-primary/40 text-sm text-muted hover:text-text transition-colors">
                      + Créer une thématique personnalisée
                    </button>
                  ) : (
                    <div className="bg-bg border border-border rounded-xl p-4 space-y-3">
                      <p className="text-xs font-semibold text-muted uppercase tracking-wider">Nouvelle thématique</p>
                      <div className="flex gap-2">
                        <input value={newThemeIcon} onChange={e => setNewThemeIcon(e.target.value)}
                          className="w-14 bg-surface border border-border rounded-lg px-2 py-2 text-center text-lg focus:outline-none focus:border-primary"
                          placeholder="🎯" />
                        <input value={newThemeName} onChange={e => setNewThemeName(e.target.value)}
                          placeholder="Nom de la thématique"
                          className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                        <input type="color" value={newThemeColor} onChange={e => setNewThemeColor(e.target.value)}
                          className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleAddTheme}
                          className="flex-1 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-all">
                          Créer
                        </button>
                        <button onClick={() => setAddingTheme(false)}
                          className="px-4 py-2 rounded-lg border border-border text-sm text-muted hover:text-text transition-colors">
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ─── Données ─────────────────────────────────────────────────── */}
              {tab === 'data' && (
                <div className="space-y-2">
                  <button onClick={async () => {
                    const r = await window.vault.themes.restore() as { restored: number };
                    refreshThemes();
                    toast(`${r.restored} prompts officiels restaurés ✓`);
                  }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-bg border border-border hover:border-primary/40 transition-colors text-left">
                    <span className="text-xl">🔄</span>
                    <div>
                      <p className="text-sm">Restaurer les prompts officiels</p>
                      <p className="text-xs text-muted">Réimporter les 179 prompts pré-installés manquants</p>
                    </div>
                  </button>
                  <button onClick={async () => {
                    await window.vault.export.toJson();
                    toast('Export en cours…');
                  }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-bg border border-border hover:border-primary/40 transition-colors text-left">
                    <span className="text-xl">📤</span>
                    <div>
                      <p className="text-sm">Exporter tous les prompts</p>
                      <p className="text-xs text-muted">Sauvegarde JSON — utile pour changer de PC</p>
                    </div>
                  </button>
                  <div className="mt-4 p-3 rounded-xl bg-bg/50 border border-border/50">
                    <p className="text-xs text-muted">📁 Base de données :</p>
                    <p className="text-xs text-muted/70 font-mono mt-1">%APPDATA%\PromptVault\vault.db</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border text-center flex-shrink-0">
              <p className="text-xs text-muted">PromptVault v1.0.0 — 100% local, zéro réseau</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}

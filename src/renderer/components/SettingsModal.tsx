import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../App';
import { useToast } from './Toast';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: Props) {
  const { isDark, toggleTheme } = useApp();
  const { toast } = useToast();
  const [startupEnabled, setStartupEnabled] = useState(false);
  const [loadingStartup, setLoadingStartup] = useState(false);

  useEffect(() => {
    if (!open) return;
    if ((window as any).vault?.startup) {
      (window as any).vault.startup.get().then((v: boolean) => setStartupEnabled(v));
    }
  }, [open]);

  const handleToggleStartup = async () => {
    if (!(window as any).vault?.startup) return;
    setLoadingStartup(true);
    try {
      const next = !startupEnabled;
      await (window as any).vault.startup.set(next);
      setStartupEnabled(next);
      toast(next ? 'Démarrage automatique activé ✓' : 'Démarrage automatique désactivé');
    } finally {
      setLoadingStartup(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="fixed z-[110] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-display text-base font-bold text-text">Paramètres</h2>
              <button
                onClick={onClose}
                className="text-muted hover:text-text transition-colors p-1 rounded-lg hover:bg-white/5"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">

              {/* Apparence */}
              <section>
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Apparence</p>
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-bg border border-border hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{isDark ? '☀️' : '🌙'}</span>
                    <span className="text-sm text-text">{isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}</span>
                  </div>
                </button>
              </section>

              {/* Système */}
              <section>
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Système</p>
                <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-bg border border-border">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🚀</span>
                    <div>
                      <p className="text-sm text-text">Démarrage automatique</p>
                      <p className="text-xs text-muted">Lancer PromptVault au démarrage de Windows</p>
                    </div>
                  </div>
                  {/* Toggle switch */}
                  <button
                    onClick={handleToggleStartup}
                    disabled={loadingStartup}
                    className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none disabled:opacity-50
                      ${startupEnabled ? 'bg-primary' : 'bg-border'}`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform
                        ${startupEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                    />
                  </button>
                </div>
              </section>

              {/* Données */}
              <section>
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Données</p>
                <button
                  onClick={async () => {
                    const r = await window.vault.themes.restore() as { restored: number };
                    toast(`${r.restored} prompts officiels restaurés`);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-bg border border-border hover:border-primary/40 transition-colors text-left"
                >
                  <span className="text-lg">🔄</span>
                  <div>
                    <p className="text-sm text-text">Restaurer les prompts officiels</p>
                    <p className="text-xs text-muted">Réimporter les 179 prompts pré-installés manquants</p>
                  </div>
                </button>
              </section>

            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border text-center">
              <p className="text-xs text-muted">PromptVault v1.0.0 — 100% local, zéro réseau</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

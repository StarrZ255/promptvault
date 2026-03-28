import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../App';
import { useAutoSave } from '../hooks/useAutoSave';
import { useToast } from './Toast';
import type { Prompt } from '../types';

export default function Editor() {
  const { selectedPrompt, setSelectedPrompt, themes, refreshThemes } = useApp();
  const { toast } = useToast();
  const [local, setLocal] = useState<Prompt | null>(null);
  const [saving, setSaving] = useState(false);
  const isNew = local?.id === 'new';

  useEffect(() => {
    setLocal(selectedPrompt ? { ...selectedPrompt } : null);
  }, [selectedPrompt]);

  const save = useCallback(async (id: string, data: Partial<Prompt>) => {
    if (isNew) {
      const created = await window.vault.prompts.create({ ...local, ...data }) as Prompt;
      setSelectedPrompt(created);
      toast('Prompt créé ✓');
    } else {
      await window.vault.prompts.update(id, data);
      toast('Sauvegardé ✓');
    }
    refreshThemes();
  }, [isNew, local, setSelectedPrompt, toast, refreshThemes]);

  const { scheduleAutoSave } = useAutoSave(local, save);

  const update = (field: keyof Prompt, value: unknown) => {
    if (!local) return;
    setLocal({ ...local, [field]: value } as Prompt);
    scheduleAutoSave({ [field]: value } as Partial<Prompt>);
  };

  const handleSave = async () => {
    if (!local) return;
    setSaving(true);
    try {
      const data: Partial<Prompt> = {
        title: local.title, body: local.body, theme: local.theme,
        tags: local.tags, rating: local.rating, is_favorite: local.is_favorite,
      };
      if (isNew) {
        const created = await window.vault.prompts.create(local) as Prompt;
        setSelectedPrompt(created);
        toast('Prompt créé ✓');
      } else {
        await window.vault.prompts.update(local.id, data);
        toast('Sauvegardé ✓');
      }
      refreshThemes();
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async () => {
    if (!local || isNew) return;
    await window.vault.prompts.duplicate(local.id);
    toast('Prompt dupliqué ✓');
    refreshThemes();
  };

  const handleDelete = async () => {
    if (!local || isNew) return;
    if (!window.confirm('Supprimer ce prompt ? Cette action est irréversible.')) return;
    await window.vault.prompts.delete(local.id);
    setSelectedPrompt(null);
    toast('Prompt supprimé');
    refreshThemes();
  };

  if (!local) return null;

  return (
    <motion.aside
      initial={{ x: 400, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="w-96 flex-shrink-0 h-full flex flex-col border-l border-border bg-surface overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <span className="text-sm font-medium font-display">{isNew ? 'Nouveau prompt' : 'Édition'}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => update('is_favorite', local.is_favorite === 1 ? 0 : 1)}
            className={`p-1.5 rounded hover:bg-white/5 text-lg ${local.is_favorite === 1 ? 'text-yellow-400' : 'text-muted'}`}>⭐</button>
          {!isNew && <button onClick={handleDuplicate} className="p-1.5 rounded hover:bg-white/5 text-muted text-lg" title="Dupliquer">⎘</button>}
          {!isNew && local.locked === 0 && <button onClick={handleDelete} className="p-1.5 rounded hover:bg-white/5 text-red-400 text-lg">🗑</button>}
          <button onClick={() => setSelectedPrompt(null)} className="p-1.5 rounded hover:bg-white/5 text-muted">✕</button>
        </div>
      </div>

      {/* Formulaire */}
      <div className="flex flex-col gap-4 p-4 overflow-y-auto flex-1">
        {/* Titre */}
        <div>
          <label className="text-xs text-muted uppercase tracking-wider mb-1 block">Titre</label>
          <input type="text" value={local.title} onChange={e => update('title', e.target.value)}
            autoFocus={isNew} placeholder="Nom du prompt"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
        </div>

        {/* Contenu */}
        <div>
          <label className="text-xs text-muted uppercase tracking-wider mb-1 block">Contenu</label>
          <textarea value={local.body} onChange={e => update('body', e.target.value)} rows={10}
            placeholder="Écris ton prompt ici…"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none font-mono leading-relaxed" />
        </div>

        {/* Thématique */}
        <div>
          <label className="text-xs text-muted uppercase tracking-wider mb-1 block">Thématique</label>
          <select value={local.theme} onChange={e => update('theme', e.target.value)}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">
            {themes.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
          </select>
        </div>

        {/* Note */}
        <div>
          <label className="text-xs text-muted uppercase tracking-wider mb-1 block">Note</label>
          <div className="flex gap-1">
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => update('rating', n)}
                className={`text-xl transition-colors ${n <= local.rating ? 'text-yellow-400' : 'text-border hover:text-yellow-200'}`}>★</button>
            ))}
          </div>
        </div>

        {/* Mots-clés */}
        <div>
          <label className="text-xs text-muted uppercase tracking-wider mb-1 block">
            Mots-clés <span className="normal-case font-normal text-muted/60">— pour affiner la recherche</span>
          </label>
          <input type="text"
            value={Array.isArray(local.tags) ? local.tags.join(', ') : ''}
            onChange={e => update('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
            placeholder="ex: python, automatisation, débutant…"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
          <p className="text-xs text-muted/60 mt-1">Sépare par des virgules. Ex : si thème = Code, ajoute « react, api, tests »</p>
        </div>

        {/* Métadonnées */}
        {!isNew && (
          <div className="text-xs text-muted space-y-1 border-t border-border pt-3">
            <div>Utilisé {local.use_count} fois</div>
            <div>Modifié le {new Date(local.updated_at).toLocaleDateString('fr-FR')}</div>
            {local.is_builtin === 1 && <div className="text-primary font-medium">✓ Prompt officiel</div>}
            {local.locked === 1 && <div className="text-yellow-400">🔒 Verrouillé</div>}
          </div>
        )}
      </div>

      {/* Bouton Sauvegarder */}
      <div className="px-4 py-3 border-t border-border flex-shrink-0">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-sm font-semibold font-display transition-all active:scale-[0.98]"
        >
          {saving ? 'Sauvegarde…' : isNew ? '✓  Créer le prompt' : '✓  Sauvegarder'}
        </button>
      </div>
    </motion.aside>
  );
}

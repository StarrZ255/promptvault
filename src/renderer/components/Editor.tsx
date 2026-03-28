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

      <div className="flex flex-col gap-4 p-4 overflow-y-auto">
        <div>
          <label className="text-xs text-muted uppercase tracking-wider mb-1 block">Titre</label>
          <input type="text" value={local.title} onChange={e => update('title', e.target.value)} autoFocus={isNew}
            placeholder="Titre du prompt"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary" />
        </div>

        <div>
          <label className="text-xs text-muted uppercase tracking-wider mb-1 block">Contenu</label>
          <textarea value={local.body} onChange={e => update('body', e.target.value)} rows={12}
            placeholder="Corps du prompt…"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary resize-none font-mono leading-relaxed" />
        </div>

        <div>
          <label className="text-xs text-muted uppercase tracking-wider mb-1 block">Thématique</label>
          <select value={local.theme} onChange={e => update('theme', e.target.value)}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary">
            {themes.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-muted uppercase tracking-wider mb-1 block">Note</label>
          <div className="flex gap-1">
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => update('rating', n)}
                className={`text-xl ${n <= local.rating ? 'text-yellow-400' : 'text-border hover:text-yellow-200'}`}>★</button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-muted uppercase tracking-wider mb-1 block">Tags (virgule séparateur)</label>
          <input type="text"
            value={Array.isArray(local.tags) ? local.tags.join(', ') : ''}
            onChange={e => update('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
            placeholder="tag1, tag2, tag3"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary" />
        </div>

        {!isNew && (
          <div className="text-xs text-muted space-y-1 border-t border-border pt-3">
            <div>Utilisé {local.use_count} fois</div>
            <div>Modifié le {new Date(local.updated_at).toLocaleDateString('fr-FR')}</div>
            {local.is_builtin === 1 && <div className="text-primary font-medium">✓ Prompt officiel</div>}
            {local.locked === 1 && <div className="text-yellow-400">🔒 Verrouillé</div>}
          </div>
        )}
      </div>
    </motion.aside>
  );
}

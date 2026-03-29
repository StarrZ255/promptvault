import React, { useState, useEffect } from 'react';
import { useApp } from '../App';
import { useToast } from './Toast';
import type { Prompt } from '../types';

export default function Editor() {
  const { selectedPrompt, setSelectedPrompt, themes, refreshThemes, bumpPromptsVersion, t, language } = useApp();
  const { toast } = useToast();
  const [local, setLocal] = useState<Prompt | null>(null);
  const [saving, setSaving] = useState(false);
  const [bodyText, setBodyText] = useState('');
  const [tagsText, setTagsText] = useState('');
  const isNew = local?.id === 'new';

  useEffect(() => {
    setLocal(selectedPrompt ? { ...selectedPrompt } : null);
    setBodyText(selectedPrompt?.body || '');
    setTagsText(Array.isArray(selectedPrompt?.tags) ? selectedPrompt.tags.join(', ') : '');
  }, [selectedPrompt]);

  const update = (field: keyof Prompt, value: unknown) => {
    if (!local) return;
    setLocal({ ...local, [field]: value } as Prompt);
  };

  const handleToggleFavorite = async () => {
    if (!local) return;
    const newVal: 0 | 1 = local.is_favorite === 1 ? 0 : 1;
    const next = { ...local, is_favorite: newVal };
    setLocal(next);
    if (isNew) {
      setSelectedPrompt(next);
    } else {
      await window.vault.prompts.update(local.id, { is_favorite: newVal });
      bumpPromptsVersion();
    }
  };

  const handleSave = async () => {
    if (!local) return;
    setSaving(true);
    try {
      const currentTags = tagsText.split(',').map(tItem => tItem.trim()).filter(Boolean);
      const data: Partial<Prompt> = {
        title: local.title, body: bodyText, theme: local.theme,
        tags: currentTags, rating: local.rating, is_favorite: local.is_favorite,
      };
      if (isNew) {
        const created = await window.vault.prompts.create({
          ...data,
          target_ai: local.target_ai,
          type: local.type,
          variables: local.variables,
          lang: local.lang,
        }) as Prompt;
        setSelectedPrompt(created);
        toast(t('toasts.theme_created'));
      } else {
        await window.vault.prompts.update(local.id, data);
        toast(t('toasts.prompt_saved'));
      }
      refreshThemes();
      bumpPromptsVersion();
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async () => {
    if (!local || isNew) return;
    await window.vault.prompts.duplicate(local.id);
    toast(t('toasts.prompt_revived') || 'Prompt duplicated ✓');
    refreshThemes();
    bumpPromptsVersion();
  };

  const handleDelete = async () => {
    if (!local || isNew) return;
    const msg = local.is_builtin === 1
      ? t('actions.confirm_delete', { title: '' }) + " (Official)"
      : t('actions.confirm_delete', { title: '' });
    if (!window.confirm(msg)) return;
    await window.vault.prompts.delete(local.id);
    setSelectedPrompt(null);
    toast(t('toasts.theme_deleted'));
    refreshThemes();
    bumpPromptsVersion();
  };

  if (!local) return null;

  return (
    <aside className="w-96 flex-shrink-0 h-full flex flex-col border-l border-border bg-surface overflow-y-auto shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
        <span className="text-sm font-bold font-display uppercase tracking-widest text-primary opacity-80">
          {isNew ? t('actions.new_prompt') : t('settings.general')}
        </span>
        <div className="flex items-center gap-2">
          <button onClick={handleToggleFavorite}
            className={`p-1.5 rounded-xl hover:bg-white/5 transition-all text-lg ${local.is_favorite === 1 ? 'text-yellow-400 scale-110' : 'text-muted'}`}>⭐</button>
          {!isNew && <button onClick={handleDuplicate} className="p-1.5 rounded-xl hover:bg-white/5 text-muted text-lg transition-all" title={t('actions.copy')}>⎘</button>}
          {!isNew && local.locked === 0 && <button onClick={handleDelete} className="p-1.5 rounded-xl hover:bg-white/5 text-red-400 text-lg transition-all" title={t('actions.delete')}>🗑</button>}
          <button onClick={() => setSelectedPrompt(null)} className="p-1.5 rounded-xl hover:bg-white/5 text-muted transition-all">✕</button>
        </div>
      </div>

      {/* Form */}
      <div className="flex flex-col gap-6 p-6 overflow-y-auto flex-1 no-scrollbar">
        {/* Title */}
        <div>
          <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-2 block">{t('editor.title_label')}</label>
          <input type="text" value={local.title} onChange={e => update('title', e.target.value)}
            autoFocus={isNew} placeholder={t('placeholders.no_title')}
            className="w-full select-text bg-bg border border-border rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-primary transition-all shadow-inner" />
        </div>

        {/* Content */}
        <div>
          <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-2 block">{t('editor.body_label')}</label>
          <textarea value={bodyText} onChange={e => setBodyText(e.target.value)} rows={12} onBlur={() => update('body', bodyText)}
            placeholder={t('placeholders.empty_body')}
            className="w-full select-text bg-bg border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary resize-none font-mono leading-relaxed shadow-inner no-scrollbar" />
        </div>

        {/* Category */}
        <div>
          <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-2 block">{t('editor.category_label')}</label>
          <select value={local.theme} onChange={e => update('theme', e.target.value)}
            className="w-full select-text bg-bg border border-border rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-primary appearance-none cursor-pointer">
            {themes.map(tItem => <option key={tItem.id} value={tItem.id}>{tItem.icon} {tItem.label.toUpperCase()}</option>)}
          </select>
        </div>

        {/* Rating */}
        <div>
          <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-2 block">Note</label>
          <div className="flex gap-2">
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => update('rating', n)}
                className={`text-2xl transition-all hover:scale-125 ${n <= local.rating ? 'text-yellow-400' : 'text-border opacity-30 hover:opacity-100'}`}>★</button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-2 block">{t('editor.tags_label')}</label>
          <input type="text"
            value={tagsText}
            onChange={e => setTagsText(e.target.value)}
            onBlur={() => update('tags', tagsText.split(',').map(tItem => tItem.trim()).filter(Boolean))}
            placeholder="..."
            className="w-full select-text bg-bg border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary shadow-inner" />
          <p className="text-[10px] text-muted/40 mt-2 font-medium">Séparez les mots-clés par des virgules.</p>
        </div>

        {/* Metadata */}
        {!isNew && (
          <div className="text-[10px] font-bold text-muted/30 space-y-2 border-t border-border pt-6 uppercase tracking-wider">
            <div className="flex justify-between"><span>Utilisé</span> <span className="text-white/20">{local.use_count} fois</span></div>
            <div className="flex justify-between"><span>Dernière modification</span> <span className="text-white/20">{new Date(local.updated_at).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')}</span></div>
            {local.locked === 1 && <div className="text-yellow-500/50 flex items-center gap-2"><span>🔒</span> Verrouillé</div>}
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="px-6 py-6 border-t border-border flex-shrink-0 bg-surface/50">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 rounded-2xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-xs font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-primary/20 active:scale-95"
        >
          {saving ? '...' : t('editor.save_btn')}
        </button>
      </div>
    </aside>
  );
}

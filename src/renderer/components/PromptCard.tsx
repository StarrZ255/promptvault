import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { Prompt, Theme } from '../types';
import { useToast } from './Toast';
import ThemeGlyph from './ThemeGlyph';

interface Props {
  prompt: Prompt;
  theme?: Theme;
  isSelected: boolean;
  isActive: boolean;
  onSelect: (id: string) => void;
  onClick: (p: Prompt) => void;
}

export default function PromptCard({ prompt, theme, isSelected, isActive, onSelect, onClick }: Props) {
  const [hovered, setHovered] = useState(false);
  const { toast } = useToast();

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await window.vault.system.copyToClipboard(prompt.body);
    await window.vault.prompts.incrementUseCount(prompt.id);
    toast('Copié dans le presse-papiers ✓');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={() => onClick(prompt)}
      className={`relative p-4 rounded-xl border cursor-pointer transition-colors group
        ${isActive ? 'border-primary bg-primary/10' : 'border-border bg-surface hover:border-primary/40'}
        ${isSelected ? 'ring-1 ring-primary' : ''}`}
    >
      {(hovered || isSelected) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-3 left-3 z-10"
          onClick={e => { e.stopPropagation(); onSelect(prompt.id); }}
        >
          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer
            ${isSelected ? 'bg-primary border-primary' : 'border-muted bg-bg'}`}>
            {isSelected && <span className="text-white text-xs leading-none">✓</span>}
          </div>
        </motion.div>
      )}

      <div className="flex items-center justify-between mb-2">
        {theme && (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${theme.color}20`, color: theme.color }}>
            <ThemeGlyph theme={theme} className="!h-3.5 !w-3.5" />
            {theme.label}
          </span>
        )}
        {prompt.is_builtin === 1 && (
          <span className="text-xs text-muted/50 ml-auto">⚙️</span>
        )}
      </div>

      <h3 className="font-display font-semibold text-sm text-text mb-1 line-clamp-1">{prompt.title}</h3>
      <p className="text-xs text-muted line-clamp-2 leading-relaxed">{prompt.body}</p>

      <div className="flex items-center justify-between mt-3">
        <div className="flex gap-0.5">
          {[1,2,3,4,5].map(n => (
            <span key={n} className={`text-xs ${n <= prompt.rating ? 'text-yellow-400' : 'text-border'}`}>★</span>
          ))}
        </div>
        <button onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-1 rounded bg-primary/20 text-primary hover:bg-primary hover:text-white">
          Copier
        </button>
      </div>

      {prompt.is_favorite === 1 && <div className="absolute top-3 right-3 text-yellow-400 text-xs">⭐</div>}
    </motion.div>
  );
}

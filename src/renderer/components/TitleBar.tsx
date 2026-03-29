import React from 'react';
import { useApp } from '../App';

interface Props {
  title?: string;
  hideControls?: boolean;
}

export default function TitleBar({ title = 'PromptVault', hideControls = false }: Props) {
  const { t } = useApp();
  const handleMinimize = () => window.vault.window.minimize();
  const handleMaximize = () => window.vault.window.maximize();
  const handleClose = () => window.vault.window.close();

  return (
    <div 
      className="h-8 flex items-center justify-between bg-surface border-b border-border select-none flex-shrink-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center px-3 gap-2">
        <div className="w-3 h-3 bg-primary rounded-full" />
        <span className="text-[10px] font-black uppercase tracking-widest text-muted font-display">{title}</span>
      </div>

      {!hideControls && (
        <div className="flex h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button 
            onClick={handleMinimize}
            className="w-10 h-full flex items-center justify-center hover:bg-white/5 text-muted hover:text-text transition-colors"
            title={t('actions.minimize')}
          >
            <span className="text-xs">─</span>
          </button>
          <button 
            onClick={handleMaximize}
            className="w-10 h-full flex items-center justify-center hover:bg-white/5 text-muted hover:text-text transition-colors"
            title={t('actions.maximize')}
          >
            <span className="text-[10px]">▢</span>
          </button>
          <button 
            onClick={handleClose}
            className="w-10 h-full flex items-center justify-center hover:bg-red-500/10 text-muted hover:text-red-400 transition-colors"
            title={t('actions.close')}
          >
            <span className="text-sm">✕</span>
          </button>
        </div>
      )}
    </div>
  );
}

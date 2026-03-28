import React, { useState, useEffect } from 'react';
import type { Theme } from '../types';

/** Affiche l’emoji ou une image locale si `icon_image` est défini. */
export default function ThemeGlyph({ theme, className = '' }: { theme: Theme; className?: string }) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!theme.icon_image) {
      setImgUrl(null);
      return;
    }
    let cancelled = false;
    window.vault.system.pathToFileUrl(theme.icon_image).then((u) => {
      if (!cancelled) setImgUrl(u);
    }).catch(() => { if (!cancelled) setImgUrl(null); });
    return () => { cancelled = true; };
  }, [theme.icon_image]);

  if (imgUrl) {
    return (
      <img src={imgUrl} alt="" className={`h-5 w-5 shrink-0 rounded object-cover ${className}`} />
    );
  }
  return <span className={className}>{theme.icon}</span>;
}

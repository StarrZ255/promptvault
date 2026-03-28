import React from 'react';
import type { Theme } from '../types';

/** Affiche l’emoji ou une image locale via le protocole vault-img:// */
export default function ThemeGlyph({ theme, className = '' }: { theme: Theme; className?: string }) {
  if (theme.icon_image) {
    // On utilise notre protocole personnalisé pour charger l'image locale en toute sécurité
    const src = `vault-img://${theme.icon_image}`;
    return (
      <div className={`flex items-center justify-center shrink-0 ${className}`}>
        <img 
          src={src} 
          alt="" 
          className="h-full w-full object-cover rounded-lg shadow-sm border border-border/10" 
          onError={(e) => {
            // Fallback sur l'emoji si l'image ne charge pas
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
    );
  }

  // Pour les emojis, on force un flexboxt pour un centrage vertical parfait (neutralise la baseline)
  return (
    <div className={`flex items-center justify-center select-none shrink-0 leading-none ${className}`}>
      {theme.icon || '📁'}
    </div>
  );
}

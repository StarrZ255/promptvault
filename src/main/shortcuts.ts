import { app } from 'electron';
import path from 'path';
import fs from 'fs';

export interface ShortcutMap {
  toggleMini: string;
  quickCapture: string;
  focusSearch: string;
  openMain: string;
}

export const DEFAULT_SHORTCUTS: ShortcutMap = {
  toggleMini:   'Alt+P',
  quickCapture: 'Alt+N',
  focusSearch:  'Alt+F',
  openMain:     'Alt+O',
};

function settingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

export function loadShortcuts(): ShortcutMap {
  try {
    const p = settingsPath();
    if (fs.existsSync(p)) {
      const raw = JSON.parse(fs.readFileSync(p, 'utf-8'));
      return { ...DEFAULT_SHORTCUTS, ...(raw.shortcuts ?? {}) };
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_SHORTCUTS };
}

export function saveShortcuts(shortcuts: ShortcutMap): void {
  const p = settingsPath();
  let existing: Record<string, unknown> = {};
  try { if (fs.existsSync(p)) existing = JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { /* ignore */ }
  fs.writeFileSync(p, JSON.stringify({ ...existing, shortcuts }, null, 2), 'utf-8');
}

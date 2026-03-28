import { ipcMain, clipboard, dialog, BrowserWindow, app } from 'electron';
import * as db from './database';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import type { ShortcutMap } from './shortcuts';

export function registerHandlers(
  getQuickWin: () => BrowserWindow,
  getImportWin: () => BrowserWindow,
  getMiniWin: () => BrowserWindow,
  showMain: () => void,
  getShortcuts: () => ShortcutMap,
  updateShortcuts: (s: ShortcutMap) => void,
): void {
  // ─── Prompts ────────────────────────────────────────────────────────────────
  ipcMain.handle('prompts:getAll',            (_, filter) => db.getPrompts(filter));
  ipcMain.handle('prompts:getById',           (_, id) => db.getPromptById(id));
  ipcMain.handle('prompts:create',            (_, data) => db.createPrompt(data));
  ipcMain.handle('prompts:update',            (_, id, data) => db.updatePrompt(id, data));
  ipcMain.handle('prompts:delete',            (_, id) => db.deletePrompt(id));
  ipcMain.handle('prompts:deleteBatch',       (_, ids) => db.deleteBatchPrompts(ids));
  ipcMain.handle('prompts:duplicate',         (_, id) => db.duplicatePrompt(id));
  ipcMain.handle('prompts:incrementUseCount', (_, id) => db.incrementUseCount(id));
  ipcMain.handle('prompts:getDeleted',       () => db.getDeletedPrompts());
  ipcMain.handle('prompts:restore',          (_, id) => db.restorePrompt(id));
  ipcMain.handle('prompts:permanentDelete',  (_, id) => db.permanentDeletePrompt(id));
  ipcMain.handle('prompts:emptyTrash',       () => db.emptyTrash());
  ipcMain.handle('prompts:getSuppressedBuiltins', () => db.getSuppressedBuiltins());

  // ─── Thématiques ────────────────────────────────────────────────────────────
  ipcMain.handle('themes:getAll',   () => db.getThemes());
  ipcMain.handle('themes:create',   (_, data) => db.createTheme(data));
  ipcMain.handle('themes:update',   (_, id, data) => db.updateTheme(id, data));
  ipcMain.handle('themes:delete',   (_, id) => db.deleteTheme(id));
  ipcMain.handle('themes:restore',  () => db.restoreBuiltinPrompts());
  ipcMain.handle('themes:reorder', (_, id, newOrder) => db.reorderTheme(id, newOrder));
  ipcMain.handle('themes:saveIconImage', async (_, themeId: string) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    const src = result.filePaths[0];
    const ext = path.extname(src) || '.png';
    const dir = path.join(app.getPath('userData'), 'theme-icons');
    fs.mkdirSync(dir, { recursive: true });
    const dest = path.join(dir, `${themeId}${ext}`);
    fs.copyFileSync(src, dest);
    db.setThemeIconImage(themeId, dest);
    return dest;
  });

  // ─── Recherche ──────────────────────────────────────────────────────────────
  ipcMain.handle('search:query', (_, params) => db.getPrompts(params));

  // ─── Import / Export ────────────────────────────────────────────────────────
  ipcMain.handle('import:fromJson', async (_, filePath: string) => db.importFromJson(filePath));
  ipcMain.handle('import:fromPaste', async (_, content: string) => ({
    title: '', body: content, suggestedTheme: 'autre', suggestedTags: [],
  }));
  ipcMain.handle('export:toJson', async (_, ids?: string[]) => {
    const json = db.exportToJson(ids);
    const result = await dialog.showSaveDialog({
      defaultPath: `PromptVault-export-${Date.now()}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (!result.filePath) return null;
    fs.writeFileSync(result.filePath, json, 'utf-8');
    return result.filePath;
  });

  // ─── Système ────────────────────────────────────────────────────────────────
  ipcMain.handle('system:openFileDialog', async (_, opts) => {
    const result = await dialog.showOpenDialog({ properties: ['openFile'], ...opts });
    return result.canceled ? null : result.filePaths[0];
  });
  ipcMain.handle('system:saveFileDialog', async (_, opts) => {
    const result = await dialog.showSaveDialog(opts ?? {});
    return result.canceled ? null : result.filePath;
  });
  ipcMain.handle('system:copyToClipboard', (_, text: string) => {
    clipboard.writeText(text);
  });
  ipcMain.handle('system:pathToFileUrl', (_, filePath: string) => {
    if (!filePath) return '';
    return pathToFileURL(filePath).href;
  });

  // ─── Démarrage automatique ──────────────────────────────────────────────────
  ipcMain.handle('system:getStartup', () => app.getLoginItemSettings().openAtLogin);
  ipcMain.handle('system:setStartup', (_, enabled: boolean) => {
    app.setLoginItemSettings({
      openAtLogin: enabled, path: app.getPath('exe'),
      args: enabled ? ['--hidden'] : [],
    });
    return enabled;
  });

  // ─── Raccourcis ─────────────────────────────────────────────────────────────
  ipcMain.handle('shortcuts:get', () => getShortcuts());
  ipcMain.handle('shortcuts:set', (_, shortcuts: ShortcutMap) => {
    updateShortcuts(shortcuts);
    return shortcuts;
  });

  // ─── Fenêtres ───────────────────────────────────────────────────────────────
  ipcMain.on('window:openQuickCapture', () => {
    const win = getQuickWin(); win.show(); win.focus();
  });
  ipcMain.on('window:openImport', () => {
    const win = getImportWin(); win.show(); win.focus();
  });
  ipcMain.on('window:openMini', () => {
    const win = getMiniWin(); win.show(); win.focus();
  });
  ipcMain.on('window:openMain', () => {
    showMain();
  });
  ipcMain.on('window:closeWindow', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.hide();
  });
}

import { ipcMain, clipboard, dialog, BrowserWindow, app } from 'electron';
import * as db from './database';
import fs from 'fs';

export function registerHandlers(
  getQuickWin: () => BrowserWindow,
  getImportWin: () => BrowserWindow,
): void {
  ipcMain.handle('prompts:getAll',           (_, filter) => db.getPrompts(filter));
  ipcMain.handle('prompts:getById',          (_, id) => db.getPromptById(id));
  ipcMain.handle('prompts:create',           (_, data) => db.createPrompt(data));
  ipcMain.handle('prompts:update',           (_, id, data) => db.updatePrompt(id, data));
  ipcMain.handle('prompts:delete',           (_, id) => db.deletePrompt(id));
  ipcMain.handle('prompts:deleteBatch',      (_, ids) => db.deleteBatchPrompts(ids));
  ipcMain.handle('prompts:duplicate',        (_, id) => db.duplicatePrompt(id));
  ipcMain.handle('prompts:incrementUseCount',(_, id) => db.incrementUseCount(id));

  ipcMain.handle('themes:getAll',   () => db.getThemes());
  ipcMain.handle('themes:create',   (_, data) => db.createTheme(data));
  ipcMain.handle('themes:delete',   (_, id) => db.deleteTheme(id));
  ipcMain.handle('themes:restore',  () => db.restoreBuiltinPrompts());

  ipcMain.handle('search:query', (_, params) => db.getPrompts(params));

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

  ipcMain.on('window:openQuickCapture', () => {
    const win = getQuickWin();
    win.show();
    win.focus();
  });
  ipcMain.on('window:openImport', () => {
    const win = getImportWin();
    win.show();
    win.focus();
  });
  ipcMain.on('window:closeWindow', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.hide();
  });

  // Démarrage automatique avec Windows
  ipcMain.handle('system:getStartup', () => {
    return app.getLoginItemSettings().openAtLogin;
  });
  ipcMain.handle('system:setStartup', (_, enabled: boolean) => {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      path: app.getPath('exe'),
      args: enabled ? ['--hidden'] : [],
    });
    return enabled;
  });
}

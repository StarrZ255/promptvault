import { app, BrowserWindow, globalShortcut, shell, dialog, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import { initDatabase } from './database';
import { registerHandlers } from './ipcHandlers';
import { loadShortcuts, saveShortcuts, ShortcutMap } from './shortcuts';

let mainWindow: BrowserWindow | null = null;
let miniWindow: BrowserWindow | null = null;
let quickCaptureWindow: BrowserWindow | null = null;
let importWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let currentShortcuts: ShortcutMap = loadShortcuts();

// Icône 16×16 violette (#6C63FF) encodée en PNG base64 — générée programmatiquement
const TRAY_ICON_B64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGUlEQVR4nGPISf7/nxLMMGrAqAGjBgwXAwCW0c0fT6XdgwAAAABJRU5ErkJggg==';

function createTrayIcon(): void {
  const icon = nativeImage.createFromDataURL(`data:image/png;base64,${TRAY_ICON_B64}`);
  tray = new Tray(icon);
  tray.setToolTip('PromptVault');

  const buildMenu = () => Menu.buildFromTemplate([
    { label: '📋 Ouvrir PromptVault',  click: () => showMainWindow() },
    { label: '⚡ Mini-fenêtre (Alt+P)', click: () => { const w = getOrCreateMiniWindow(); w.show(); w.focus(); } },
    { label: '✏️ Capture rapide (Alt+N)', click: () => { const w = getOrCreateQuickCapture(); w.show(); w.focus(); } },
    { type: 'separator' },
    { label: '❌ Quitter', click: () => { tray?.destroy(); app.quit(); } },
  ]);

  tray.setContextMenu(buildMenu());
  tray.on('click', () => showMainWindow());
  tray.on('double-click', () => showMainWindow());
}

function getRendererUrl(hash: string): string {
  const devUrl = process.env['ELECTRON_RENDERER_URL'];
  if (devUrl) return `${devUrl}#${hash}`;
  return `file://${path.join(__dirname, '../renderer/index.html')}#${hash}`;
}

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200, height: 800, minWidth: 900, minHeight: 600,
    frame: false, backgroundColor: '#0A0A0F',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: false,
    },
  });
  win.loadURL(getRendererUrl('main'));
  return win;
}

export function getOrCreateMiniWindow(): BrowserWindow {
  if (!miniWindow || miniWindow.isDestroyed()) {
    miniWindow = new BrowserWindow({
      width: 420, height: 520,
      resizable: false, alwaysOnTop: true, frame: false,
      skipTaskbar: true, backgroundColor: '#12121A',
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true, nodeIntegration: false, sandbox: false,
      },
    });
    miniWindow.loadURL(getRendererUrl('mini'));
    miniWindow.on('blur', () => miniWindow?.hide());
  }
  return miniWindow;
}

export function getOrCreateQuickCapture(): BrowserWindow {
  if (!quickCaptureWindow || quickCaptureWindow.isDestroyed()) {
    quickCaptureWindow = new BrowserWindow({
      width: 420, height: 320, resizable: false,
      alwaysOnTop: true, frame: false, skipTaskbar: true,
      backgroundColor: '#12121A',
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true, nodeIntegration: false, sandbox: false,
      },
    });
    quickCaptureWindow.loadURL(getRendererUrl('quick-capture'));
    quickCaptureWindow.on('blur', () => quickCaptureWindow?.hide());
  }
  return quickCaptureWindow;
}

export function getOrCreateImportWindow(): BrowserWindow {
  if (!importWindow || importWindow.isDestroyed()) {
    importWindow = new BrowserWindow({
      width: 600, height: 500, resizable: false, frame: false,
      backgroundColor: '#12121A',
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true, nodeIntegration: false, sandbox: false,
      },
    });
    importWindow.loadURL(getRendererUrl('import'));
  }
  return importWindow;
}

export function showMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    mainWindow = createMainWindow();
  } else {
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  }
}

export function registerShortcuts(shortcuts: ShortcutMap = currentShortcuts): void {
  globalShortcut.unregisterAll();
  currentShortcuts = shortcuts;

  // Alt+P (configurable) — mini fenêtre flottante
  try {
    globalShortcut.register(shortcuts.toggleMini, () => {
      const win = getOrCreateMiniWindow();
      if (win.isVisible()) { win.hide(); } else { win.show(); win.focus(); }
    });
  } catch { /* raccourci invalide */ }

  // Alt+N (configurable) — capture rapide
  try {
    globalShortcut.register(shortcuts.quickCapture, () => {
      const win = getOrCreateQuickCapture();
      win.show(); win.focus();
    });
  } catch { /* ignore */ }

  // Alt+F (configurable) — focus recherche dans l'app principale
  try {
    globalShortcut.register(shortcuts.focusSearch, () => {
      showMainWindow();
      mainWindow?.webContents.send('shortcut:focus-search');
    });
  } catch { /* ignore */ }

  // Alt+O (configurable) — ouvrir/afficher l'app principale
  try {
    globalShortcut.register(shortcuts.openMain, () => {
      showMainWindow();
    });
  } catch { /* ignore */ }
}

export function updateShortcuts(shortcuts: ShortcutMap): void {
  saveShortcuts(shortcuts);
  registerShortcuts(shortcuts);
}

export { currentShortcuts };

app.whenReady().then(() => {
  try {
    initDatabase();
  } catch (err) {
    dialog.showErrorBox('Erreur base de données', String(err));
    app.quit();
    return;
  }

  registerHandlers(
    getOrCreateQuickCapture,
    getOrCreateImportWindow,
    getOrCreateMiniWindow,
    showMainWindow,
    () => currentShortcuts,
    updateShortcuts,
  );

  createTrayIcon();

  const startHidden = process.argv.includes('--hidden');
  mainWindow = createMainWindow();
  if (startHidden) mainWindow.hide();

  registerShortcuts();

  app.on('activate', () => {
    if (!mainWindow || mainWindow.isDestroyed()) mainWindow = createMainWindow();
  });
});

app.on('window-all-closed', () => {
  // Reste actif en arrière-plan pour les raccourcis globaux
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
});

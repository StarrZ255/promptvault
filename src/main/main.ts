import { app, BrowserWindow, globalShortcut, shell, dialog, Tray, Menu, nativeImage, protocol, ipcMain } from 'electron';
import fs from 'fs';
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

// Icône 16×16 violette (#6C63FF) en fallback
const TRAY_ICON_B64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGUlEQVR4nGPISf7/nxLMMGrAqAGjBgwXAwCW0c0fT6XdgwAAAABJRU5ErkJggg==';

function createTrayIcon(): void {
  const iconPath = app.isPackaged 
    ? path.join(process.resourcesPath, 'icon.ico') 
    : path.join(__dirname, '../../resources/icon.ico');
    
  const icon = fs.existsSync(iconPath) 
    ? nativeImage.createFromPath(iconPath)
    : nativeImage.createFromDataURL(`data:image/png;base64,${TRAY_ICON_B64}`);
    
  if (tray) tray.destroy();
  tray = new Tray(icon);
  tray.setToolTip('PromptVault');

  const buildMenu = () => Menu.buildFromTemplate([
    { label: '📋 Ouvrir PromptVault',  click: () => showMainWindow() },
    { label: '⚙️ Paramètres', click: () => {
        showMainWindow();
        setTimeout(() => mainWindow?.webContents.send('shortcut:open-settings'), 200);
    }},
    { type: 'separator' },
    { label: `⚡ Mini-Hub (${currentShortcuts.toggleMini})`, click: () => { const w = getOrCreateMiniWindow(); w.show(); w.focus(); } },
    { label: `✏️ Capture rapide (${currentShortcuts.quickCapture})`, click: () => { const w = getOrCreateQuickCapture(); w.show(); w.focus(); } },
    { type: 'separator' },
    { label: '❌ Quitter', click: () => { app.isQuitting = true; tray?.destroy(); app.quit(); } },
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

  // Empêcher la fermeture — cacher vers le Tray
  win.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      win.hide();
    }
    return false;
  });

  return win;
}

export function getOrCreateMiniWindow(): BrowserWindow {
  if (!miniWindow || miniWindow.isDestroyed()) {
    miniWindow = new BrowserWindow({
      width: 950, height: 520,
      resizable: false, alwaysOnTop: true, frame: false,
      skipTaskbar: true, transparent: false,
      backgroundColor: '#1a1a20',
      hasShadow: true,
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

export function showMainWindow(page?: string): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    mainWindow = createMainWindow();
  } else {
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  }
  if (page === 'settings') {
    setTimeout(() => mainWindow?.webContents.send('shortcut:open-settings'), 300);
  }
}

export function registerShortcuts(shortcuts: ShortcutMap = currentShortcuts): { success: boolean, errors: string[] } {
  globalShortcut.unregisterAll();
  currentShortcuts = shortcuts;
  const errors: string[] = [];

  const tryRegister = (accelerator: string | undefined, callback: () => void, label: string) => {
    if (!accelerator || accelerator.trim() === '') return;
    try {
      const ok = globalShortcut.register(accelerator, callback);
      if (!ok) errors.push(label);
    } catch { 
      errors.push(label);
    }
  };

  tryRegister(shortcuts.toggleMini, () => {
    const win = getOrCreateMiniWindow();
    if (win.isDestroyed()) return;
    if (win.isVisible() && win.isFocused()) {
      win.hide();
    } else {
      win.setSkipTaskbar(true);
      win.center();
      win.show();
      win.focus();
      win.setAlwaysOnTop(true, 'screen-saver');
    }
  }, 'Launcher Hub');

  tryRegister(shortcuts.quickCapture, () => {
    const win = getOrCreateQuickCapture();
    if (win.isDestroyed()) return;
    if (win.isVisible() && win.isFocused()) {
      win.hide();
    } else {
      win.show();
      win.focus();
      win.setAlwaysOnTop(true, 'screen-saver');
    }
  }, 'Quick Capture');

  tryRegister(shortcuts.focusSearch, () => {
    showMainWindow();
    mainWindow?.webContents.send('shortcut:focus-search');
  }, 'Focus Search');

  tryRegister(shortcuts.openMain, () => {
    showMainWindow();
  }, 'Open Main App');

  // Mise à jour du menu Tray car les noms de raccourcis ont pu changer
  createTrayIcon();

  return { success: errors.length === 0, errors };
}

export function updateShortcuts(shortcuts: ShortcutMap): { success: boolean, errors: string[] } {
  saveShortcuts(shortcuts);
  return registerShortcuts(shortcuts);
}

export { currentShortcuts };

// Enregistrement du protocole vault-img pour les icônes locales
protocol.registerSchemesAsPrivileged([
  { scheme: 'vault-img', privileges: { standard: true, secure: true, supportFetchAPI: true, bypassCSP: true } }
]);

// Gérer une seule instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Si une deuxième instance est lancée, on affiche la fenêtre principale
    showMainWindow();
  });

  app.whenReady().then(() => {
    // Gérer le protocole vault-img
    protocol.handle('vault-img', (request) => {
      const url = request.url.replace('vault-img://', '');
      const decodedUrl = decodeURIComponent(url);
      const filePath = path.normalize(decodedUrl);
      // On vérifie que le fichier est bien dans userData/theme-icons pour la sécurité
      const iconsDir = path.join(app.getPath('userData'), 'theme-icons');
      if (!filePath.startsWith(iconsDir)) {
        return new Response('Forbidden', { status: 403 });
      }
      return fetch(`file://${filePath}`);
    });

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

    // Handlers pour les contrôles de fenêtre personnalisés
    ipcMain.on('window:minimize', (e) => {
      BrowserWindow.fromWebContents(e.sender)?.minimize();
    });
    ipcMain.on('window:maximize', (e) => {
      const win = BrowserWindow.fromWebContents(e.sender);
      if (win?.isMaximized()) win.unmaximize(); else win?.maximize();
    });
    ipcMain.on('window:close', (e) => {
      const win = BrowserWindow.fromWebContents(e.sender);
      const miniWin = getOrCreateMiniWindow();
      if (win === mainWindow || win === miniWin) win?.hide(); else win?.close();
    });

    ipcMain.on('window:edit-prompt', (_, prompt: unknown) => {
      showMainWindow();
      mainWindow?.webContents.send('shortcut:edit-prompt', prompt);
    });

    const startHidden = process.argv.includes('--hidden');
    mainWindow = createMainWindow();
    if (startHidden) mainWindow.hide();

    registerShortcuts();

    app.on('activate', () => {
      if (!mainWindow || mainWindow.isDestroyed()) mainWindow = createMainWindow();
    });
  });
}

app.on('window-all-closed', () => {
  // Reste actif en arrière-plan pour les raccourcis globaux
});

app.on('will-quit', () => {
  app.isQuitting = true;
  globalShortcut.unregisterAll();
});

declare global {
  namespace Electron {
    interface App { isQuitting?: boolean; }
  }
}

app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
});

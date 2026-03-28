import { app, BrowserWindow, globalShortcut, shell } from 'electron';
import path from 'path';
import { initDatabase } from './database';
import { registerHandlers } from './ipcHandlers';

let mainWindow: BrowserWindow | null = null;
let quickCaptureWindow: BrowserWindow | null = null;
let importWindow: BrowserWindow | null = null;

function getRendererUrl(hash: string): string {
  // electron-vite injecte ELECTRON_RENDERER_URL en mode dev
  const devUrl = process.env['ELECTRON_RENDERER_URL'];
  if (devUrl) {
    return `${devUrl}#${hash}`;
  }
  return `file://${path.join(__dirname, '../renderer/index.html')}#${hash}`;
}

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0A0A0F',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  win.loadURL(getRendererUrl('main'));
  return win;
}

function getOrCreateQuickCapture(): BrowserWindow {
  if (!quickCaptureWindow || quickCaptureWindow.isDestroyed()) {
    quickCaptureWindow = new BrowserWindow({
      width: 420,
      height: 320,
      resizable: false,
      alwaysOnTop: true,
      frame: false,
      skipTaskbar: true,
      backgroundColor: '#12121A',
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });
    quickCaptureWindow.loadURL(getRendererUrl('quick-capture'));
    quickCaptureWindow.on('blur', () => quickCaptureWindow?.hide());
  }
  return quickCaptureWindow;
}

function getOrCreateImportWindow(): BrowserWindow {
  if (!importWindow || importWindow.isDestroyed()) {
    importWindow = new BrowserWindow({
      width: 600,
      height: 500,
      resizable: false,
      frame: false,
      backgroundColor: '#12121A',
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });
    importWindow.loadURL(getRendererUrl('import'));
  }
  return importWindow;
}

function registerShortcuts(): void {
  globalShortcut.register('Alt+P', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  globalShortcut.register('Alt+N', () => {
    const win = getOrCreateQuickCapture();
    win.show();
    win.focus();
  });

  globalShortcut.register('Alt+I', () => {
    const win = getOrCreateImportWindow();
    win.show();
    win.focus();
  });

  globalShortcut.register('Alt+F', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('shortcut:focus-search');
    }
  });
}

app.whenReady().then(() => {
  initDatabase();
  registerHandlers(getOrCreateQuickCapture, getOrCreateImportWindow);
  mainWindow = createMainWindow();
  registerShortcuts();

  app.on('activate', () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      mainWindow = createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Ne pas quitter — l'app reste active en arrière-plan pour les raccourcis globaux
  // Sur macOS, comportement standard ; sur Windows, on laisse tourner
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

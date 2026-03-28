import { contextBridge, ipcRenderer } from 'electron';

function invoke(channel: string, ...args: unknown[]) {
  return ipcRenderer.invoke(channel, ...args);
}

contextBridge.exposeInMainWorld('vault', {
  prompts: {
    getAll:            (filter: unknown)              => invoke('prompts:getAll', filter),
    getById:           (id: string)                   => invoke('prompts:getById', id),
    create:            (data: unknown)                => invoke('prompts:create', data),
    update:            (id: string, data: unknown)    => invoke('prompts:update', id, data),
    delete:            (id: string)                   => invoke('prompts:delete', id),
    deleteBatch:       (ids: string[])                => invoke('prompts:deleteBatch', ids),
    duplicate:         (id: string)                   => invoke('prompts:duplicate', id),
    incrementUseCount: (id: string)                   => invoke('prompts:incrementUseCount', id),
    getDeleted:        ()           => invoke('prompts:getDeleted'),
    restore:           (id: string) => invoke('prompts:restore', id),
    permanentDelete:   (id: string) => invoke('prompts:permanentDelete', id),
    emptyTrash:        ()           => invoke('prompts:emptyTrash'),
  },
  themes: {
    getAll:  ()                        => invoke('themes:getAll'),
    create:  (data: unknown)           => invoke('themes:create', data),
    update:  (id: string, data: unknown) => invoke('themes:update', id, data),
    delete:  (id: string)              => invoke('themes:delete', id),
    restore: ()                        => invoke('themes:restore'),
  },
  import: {
    fromJson:  (filePath: string) => invoke('import:fromJson', filePath),
    fromPaste: (content: string)  => invoke('import:fromPaste', content),
  },
  export: {
    toJson: (ids?: string[]) => invoke('export:toJson', ids),
  },
  search: {
    query: (params: unknown) => invoke('search:query', params),
  },
  system: {
    openFileDialog:  (opts: unknown)  => invoke('system:openFileDialog', opts),
    saveFileDialog:  (opts: unknown)  => invoke('system:saveFileDialog', opts),
    copyToClipboard: (text: string)   => invoke('system:copyToClipboard', text),
  },
  shortcuts: {
    get: ()                  => invoke('shortcuts:get'),
    set: (s: unknown)        => invoke('shortcuts:set', s),
  },
  startup: {
    get:    ()                  => invoke('system:getStartup'),
    set:    (enabled: boolean)  => invoke('system:setStartup', enabled),
  },
  window: {
    openQuickCapture: () => ipcRenderer.send('window:openQuickCapture'),
    openImport:       () => ipcRenderer.send('window:openImport'),
    openMini:         () => ipcRenderer.send('window:openMini'),
    openMain:         () => ipcRenderer.send('window:openMain'),
    closeWindow:      () => ipcRenderer.send('window:closeWindow'),
  },
  on: (event: string, callback: (...args: unknown[]) => void) => {
    const handler = (_: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args);
    ipcRenderer.on(event, handler);
    return () => ipcRenderer.off(event, handler);
  },
});

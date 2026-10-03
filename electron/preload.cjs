const { contextBridge, ipcRenderer } = require('electron');
const methods = ['boot', 'tree', 'open', 'open-external', 'choose-file', 'choose-folder', 'notes', 'new', 'rename', 'save', 'export', 'settings', 'background', 'stats', 'reveal', 'backups', 'fullscreen', 'close-ready', 'image', 'open-url'];
contextBridge.exposeInMainWorld('akis', {
  call: (name, ...args) => {
    if (!methods.includes(name)) return Promise.reject(new Error('Bilinmeyen işlem.'));
    return ipcRenderer.invoke(name, ...args);
  },
  on: (name, callback) => {
    if (!['prepare-close', 'open-file'].includes(name)) return;
    const listener = (_e, ...args) => callback(...args); ipcRenderer.on(name, listener);
    return () => ipcRenderer.removeListener(name, listener);
  }
});



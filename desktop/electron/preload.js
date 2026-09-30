const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  showNotification: (title, body) => {
    ipcRenderer.send('show-notification', { title, body });
  },
  onMenuAction: (callback) => ipcRenderer.on('menu-action', callback),
});

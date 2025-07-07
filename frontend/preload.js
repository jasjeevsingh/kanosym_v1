const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  chooseFolder: () => ipcRenderer.invoke('choose-folder'),
  readDir: (dirPath) => ipcRenderer.invoke('read-dir', dirPath),
}); 
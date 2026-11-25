// Imports
const { contextBridge, ipcRenderer } = require('electron');

// IPC
contextBridge.exposeInMainWorld('electronAPI', {
  loginToRiot: () => ipcRenderer.invoke('open-login-window')
});

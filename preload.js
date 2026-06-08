const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('agentAPI', {
  getPermissions: () => ipcRenderer.invoke('get-permissions'),
  savePermissions: (permissionData) => ipcRenderer.invoke('save-permissions', permissionData),
  sendCommand: (command) => ipcRenderer.invoke('send-command', command),
  readFile: (path) => ipcRenderer.invoke('read-file', path),
  listFolder: (path) => ipcRenderer.invoke('list-folder', path),
  createFile: (path, content) => ipcRenderer.invoke('create-file', path, content),
  openApp: (appName) => ipcRenderer.invoke('open-app', appName),
  createShortcut: (location) => ipcRenderer.invoke('create-shortcut', location),
  getAutoStart: () => ipcRenderer.invoke('get-auto-start'),
  setAutoStart: (enabled) => ipcRenderer.invoke('set-auto-start', enabled),
  speakText: (text) => ipcRenderer.invoke('speak-text', text),
  saveMemory: (note) => ipcRenderer.invoke('save-memory', note)
});

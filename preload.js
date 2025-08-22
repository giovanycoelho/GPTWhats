const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  
  // Platform information
  platform: process.platform,
  
  // App information
  isElectron: true
});

// Security: Remove node integration
window.eval = global.eval = function () {
  throw new Error(`Sorry, this app does not support window.eval().`);
};
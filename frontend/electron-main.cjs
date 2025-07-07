const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  win.loadURL('http://localhost:5173'); // Vite dev server
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('choose-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('read-dir', async (event, dirPath) => {
  try {
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    return files.map(f => ({
      name: f.name,
      type: f.isDirectory() ? 'folder' : 'file',
    }));
  } catch (e) {
    return [];
  }
}); 
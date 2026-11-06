'use strict';
const { app, BrowserWindow, protocol, net } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

// Die stabile, sichere Adresse erlaubt dem Editor, seine Bücher dauerhaft
// im Benutzerprofil (IndexedDB) abzulegen, statt sie bei jedem Start zu verlieren.
protocol.registerSchemesAsPrivileged([
  { scheme: 'pagebloom', privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);

function createWindow() {
  const win = new BrowserWindow({
    title: 'PageBloom',
    icon: path.join(__dirname, 'icon.png'),
    width: 1380,
    height: 900,
    minWidth: 780,
    minHeight: 560,
    backgroundColor: '#f8fbf8',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });

  win.once('ready-to-show', () => win.show());

  // Nur die eigene App darf navigieren. Fenster fuer die Druck-/PDF-Vorschau
  // aus dem Editor (window.open('', '_blank')) sind erlaubt.
  win.webContents.on('will-navigate', (event, details) => {
    if (!details.url.startsWith('pagebloom://app/')) event.preventDefault();
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url === 'about:blank') {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 930,
          height: 780,
          autoHideMenuBar: true,
          webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
        }
      };
    }
    return { action: 'deny' };
  });

  win.loadURL('pagebloom://app/index.html');
}

app.whenReady().then(() => {
  protocol.handle('pagebloom', request => {
    const url = new URL(request.url);
    if (url.host !== 'app') return new Response('Datei nicht gefunden', { status: 404 });
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return net.fetch(pathToFileURL(path.join(__dirname, 'index.html')).href);
    }
    if (url.pathname === '/icon.png') {
      return net.fetch(pathToFileURL(path.join(__dirname, 'icon.png')).href);
    }
    return new Response('Datei nicht gefunden', { status: 404 });
  });
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

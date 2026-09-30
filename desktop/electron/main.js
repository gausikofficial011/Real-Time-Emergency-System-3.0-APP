const { app, BrowserWindow, Menu, shell, Notification } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV !== 'production';
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: '#0f0f1a',
    titleBarStyle: 'hiddenInset',
    frame: process.platform !== 'darwin',
    show: false,
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: !isDev,
    },
  });

  // Load app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// App menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Refresh', accelerator: 'CmdOrCtrl+R', click: () => mainWindow?.reload() },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'CmdOrCtrl+Q', role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Toggle DevTools', accelerator: 'F12', click: () => mainWindow?.webContents.toggleDevTools() },
        { type: 'separator' },
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+=', role: 'zoomIn' },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { label: 'Reset Zoom', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Toggle Fullscreen', accelerator: 'F11', role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { label: 'Minimize', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { label: 'Maximize', click: () => mainWindow?.maximize() },
        { type: 'separator' },
        { label: 'Close', accelerator: 'CmdOrCtrl+W', role: 'close' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: 'EmergencyAI v3.0', enabled: false },
        { type: 'separator' },
        { label: 'Documentation', click: () => shell.openExternal('https://github.com/emergencyai/docs') },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  createWindow();
  createMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Handle notification requests from renderer
const { ipcMain } = require('electron');
ipcMain.on('show-notification', (event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body, urgency: 'critical' }).show();
  }
});

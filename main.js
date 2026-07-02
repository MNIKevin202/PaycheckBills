const { app, BrowserWindow } = require('electron');
const path = require('path');

// Load .env before starting the server
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Start the Express + MongoDB server in-process; get the port it actually binds to
const { ready } = require('./server.js');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1350,
    height: 940,
    minWidth: 900,
    minHeight: 600,
    title: 'Paycheck Calculator',
    backgroundColor: '#0d1117',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Hide the default menu bar
  mainWindow.setMenuBarVisibility(false);

  // Show a "Connecting…" page while MongoDB initialises
  mainWindow.loadURL(
    'data:text/html,<style>body{margin:0;background:%230d1117;display:flex;align-items:center;' +
    'justify-content:center;height:100vh;font-family:sans-serif;color:%236e7681;font-size:16px;}' +
    '</style><body>Connecting to database…</body>'
  );

  // Wait for the server to be ready, then load on whatever port it bound to
  ready.then(({ port }) => {
    if (mainWindow) mainWindow.loadURL(`http://localhost:${port}`);
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => app.quit());

app.on('activate', () => {
  if (!mainWindow) createWindow();
});

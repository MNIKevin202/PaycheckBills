const { app, BrowserWindow, dialog, shell } = require('electron');
const path = require('path');
const https = require('https');
const fs = require('fs');
const os = require('os');

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

function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

function checkForUpdates() {
  https.get('https://api.github.com/repos/MNIKevin202/PaycheckBills/releases/latest', {
    headers: { 'User-Agent': 'Paycheck-Calculator' }
  }, (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      try {
        const release = JSON.parse(data);
        const latestVersion = release.tag_name.replace(/^v/, '');
        const currentVersion = app.getVersion();

        if (compareVersions(latestVersion, currentVersion) > 0) {
          const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
          const isMac = process.platform === 'darwin';
          const isWin = process.platform === 'win32';

          let assetName = null;
          if (isMac) {
            assetName = `Paycheck-Calculator-${latestVersion}-${arch}.dmg`;
          } else if (isWin) {
            assetName = `Paycheck-Calculator-Setup-${latestVersion}-${arch}.exe`;
          }

          if (assetName) {
            const asset = release.assets.find(a => a.name === assetName);
            if (asset) {
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Update Available',
                message: `Paycheck Calculator ${latestVersion} is available.`,
                detail: `You are currently running version ${currentVersion}. Would you like to download the update?`,
                buttons: ['Download', 'Later']
              }).then(({ response }) => {
                if (response === 0) {
                  downloadInstaller(asset.browser_download_url, assetName);
                }
              });
            }
          }
        }
      } catch (err) {
        console.error('Error checking for updates:', err);
      }
    });
  }).on('error', (err) => {
    console.error('Error checking for updates:', err);
  });
}

function downloadInstaller(url, filename) {
  const tempDir = os.tmpdir();
  const filepath = path.join(tempDir, filename);
  const file = fs.createWriteStream(filepath);

  https.get(url, (res) => {
    res.pipe(file);
    file.on('finish', () => {
      file.close();
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Downloaded',
        message: 'The installer has been downloaded.',
        buttons: ['Install', 'Open Folder', 'Later']
      }).then(({ response }) => {
        if (response === 0) {
          shell.openPath(filepath);
        } else if (response === 1) {
          shell.showItemInFolder(filepath);
        }
      });
    });
  }).on('error', (err) => {
    fs.unlink(filepath, () => {});
    dialog.showErrorBox('Download Error', 'Failed to download update: ' + err.message);
  });
}

app.whenReady().then(() => {
  createWindow();
  setTimeout(checkForUpdates, 2000);
});

app.on('window-all-closed', () => app.quit());

app.on('activate', () => {
  if (!mainWindow) createWindow();
});

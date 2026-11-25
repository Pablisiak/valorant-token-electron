// Imports
const { app, BrowserWindow, ipcMain } = require('electron/main')
const path = require('node:path')

// Main Window
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });
  mainWindow.loadFile('index.html');
}

// Function to get params from URL fragment
function extractFromURL(url) {
  try {
      const parsedUrl = new URL(url);
      const hashString = parsedUrl.hash.startsWith('#')
        ? parsedUrl.hash.slice(1)
        : parsedUrl.hash;
      const params = new URLSearchParams(hashString);

      return {
        accessToken: params.get('access_token'), // Bearer Token
        idToken: params.get('id_token'), // ID Token
        expiresIn: params.get('expires_in') // When token expires
      };
    } catch (e) {
      return null;
    }
}

// Login button functionality
ipcMain.handle('open-login-window', async () => {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (payload) => {
          if (settled) return;
          settled = true;
          resolve(payload);
        };
    // https://valapidocs.techchrism.me/endpoint/cookie-reauth
    const riotLoginURL = 'https://auth.riotgames.com/authorize?redirect_uri=https%3A%2F%2Fplayvalorant.com%2Fopt_in&client_id=play-valorant-web-prod&response_type=token%20id_token&nonce=1&scope=account%20openid';

    // Login Window
    const loginWindow = new BrowserWindow({
      width: 400,
      height: 600,
      parent: mainWindow,
      modal: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      }
    });

    loginWindow.loadURL(riotLoginURL);
    ['will-redirect', 'did-navigate'].forEach(event => loginWindow.webContents.on(event, (_, url) => console.log(event, url))); // Debug in console!
    // Handling of URL with informations
    const handleUrl = (event, navigationUrl) => {
          if (!navigationUrl || !navigationUrl.includes('access_token=')) {
            return;
          }

          if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
          }

          const authData = extractFromURL(navigationUrl);
          if (authData && authData.accessToken) {
            finish({
              success: true,
              token: authData.accessToken,
              idToken: authData.idToken,
              expiresIn: authData.expiresIn
            });

            if (!loginWindow.isDestroyed()) {
              loginWindow.destroy();
            }
          }
        };

        loginWindow.webContents.on('will-redirect', handleUrl);
        loginWindow.webContents.on('will-navigate', handleUrl);
        loginWindow.webContents.on('did-navigate', handleUrl);

    loginWindow.on('closed', () => {
      resolve({ success: false, error: 'The user has closed the login window' }); // If user closes the window
    });
  });
});
// Starting app
app.whenReady().then(() => {
  createWindow();
});
// Closing app
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

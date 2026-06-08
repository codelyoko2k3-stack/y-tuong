const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

app.setAppUserModelId('com.anh.jarvisagent');

const permissionsPath = path.join(__dirname, 'config', 'permissions.json');
const memoryPath = path.join(__dirname, 'memory', 'store.json');

let mainWindow;
let tray = null;
let isQuiting = false;

function getTrayIcon() {
  const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAIElEQVQ4jWNgGAWjYBSMAgYGBgYGBQ0z8DAwMDAo0CLEAwA2HwIN+q78UAAAAABJRU5ErkJggg==';
  return nativeImage.createFromDataURL(dataUrl);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('close', (event) => {
    if (!isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function showMainWindow() {
  if (!mainWindow) {
    createWindow();
  }
  mainWindow.show();
  mainWindow.focus();
}

function maybeShowMainWindow() {
  const loginSettings = app.getLoginItemSettings();
  if (loginSettings.wasOpenedAtLogin) {
    // Nếu app chạy cùng Windows, thì bắt đầu ẩn
    return;
  }
  showMainWindow();
}

function saveAutoStart(enable) {
  const permissions = loadPermissions();
  permissions.autoStart = enable;
  fs.writeFileSync(permissionsPath, JSON.stringify(permissions, null, 2), 'utf-8');
}

function setAutoStart(enable) {
  const args = app.isPackaged ? [] : [path.join(__dirname, 'main.js')];
  app.setLoginItemSettings({ openAtLogin: enable, path: process.execPath, args });
  saveAutoStart(enable);
  return enable;
}

function getAutoStart() {
  return app.getLoginItemSettings().openAtLogin;
}

function createTray() {
  if (tray) return;
  tray = new Tray(getTrayIcon());
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Mở Jarvis Agent', click: () => showMainWindow() },
    { label: 'Khởi động cùng Windows', type: 'checkbox', checked: getAutoStart(), click: (menuItem) => setAutoStart(menuItem.checked) },
    { type: 'separator' },
    { label: 'Thoát', click: () => { isQuiting = true; app.quit(); } }
  ]);
  tray.setToolTip('Jarvis Agent');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => showMainWindow());
  tray.on('click', () => {
    if (mainWindow && mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      showMainWindow();
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  const permissions = loadPermissions();
  if (permissions.autoStart) {
    setAutoStart(true);
  }
  maybeShowMainWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    showMainWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin' && !isQuiting) {
    // keep running in tray
  } else if (process.platform !== 'darwin') {
    app.quit();
  }
});

function loadPermissions() {
  try {
    const data = JSON.parse(fs.readFileSync(permissionsPath, 'utf-8'));
    return {
      level: data.level || 1,
      whitelist: data.whitelist || { folders: [], apps: [] },
      autoStart: data.autoStart || false
    };
  } catch (err) {
    return { level: 1, whitelist: { folders: [], apps: [] }, autoStart: false };
  }
}

function savePermissions(permissionData) {
  const existing = loadPermissions();
  const merged = {
    ...existing,
    ...permissionData,
    whitelist: permissionData.whitelist || existing.whitelist,
    autoStart: existing.autoStart
  };
  fs.writeFileSync(permissionsPath, JSON.stringify(merged, null, 2), 'utf-8');
}

function normalizePath(targetPath) {
  return path.resolve(targetPath).replace(/\\/g, '/');
}

function isPathAllowed(targetPath, permissionData) {
  const normalizedTarget = normalizePath(targetPath);
  return permissionData.whitelist.folders.some(folder => {
    const normalizedFolder = normalizePath(folder);
    return normalizedTarget === normalizedFolder || normalizedTarget.startsWith(normalizedFolder + '/');
  });
}

function safePowerShellString(value) {
  return String(value).replace(/'/g, "''");
}

function createWindowsShortcut(shortcutPath, target, args = '', iconLocation = '') {
  return new Promise((resolve, reject) => {
    const script = [
      `$WshShell = New-Object -ComObject WScript.Shell`,
      `$Shortcut = $WshShell.CreateShortcut('${safePowerShellString(shortcutPath)}')`,
      `$Shortcut.TargetPath = '${safePowerShellString(target)}'`,
      `$Shortcut.Arguments = '${safePowerShellString(args)}'`,
      `$Shortcut.WorkingDirectory = '${safePowerShellString(path.dirname(shortcutPath))}'`,
      iconLocation ? `$Shortcut.IconLocation = '${safePowerShellString(iconLocation)}'` : '',
      `$Shortcut.Save()`
    ].filter(Boolean).join('; ');

    const proc = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], { windowsHide: true });
    let stderr = '';
    proc.on('error', reject);
    proc.stderr.on('data', (data) => { stderr += data.toString(); });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `PowerShell exited with code ${code}`));
    });
  });
}

ipcMain.handle('create-shortcut', async (event, location) => {
  const shortcutName = 'Jarvis Agent.lnk';
  const shortcutPath = location === 'desktop'
    ? path.join(app.getPath('desktop'), shortcutName)
    : path.join(app.getPath('startMenu'), shortcutName);
  const target = process.execPath;
  const args = app.isPackaged ? '' : `"${__dirname}"`;
  const iconLocation = process.execPath;

  try {
    await createWindowsShortcut(shortcutPath, target, args, iconLocation);
    return { success: true, message: `Đã tạo shortcut ${location}: ${shortcutPath}` };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('get-auto-start', async () => {
  return { openAtLogin: getAutoStart() };
});

ipcMain.handle('set-auto-start', async (event, enabled) => {
  try {
    setAutoStart(enabled);
    return { success: true, enabled };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('speak-text', async (event, text) => {
  try {
    const safeText = safePowerShellString(text);
    const script = `Add-Type -AssemblyName System.Speech; $speak = New-Object System.Speech.Synthesis.SpeechSynthesizer; $speak.Speak('${safeText}');`;
    const proc = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], { windowsHide: true });
    let stderr = '';
    proc.on('error', (err) => { stderr += err.message; });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });
    return await new Promise((resolve) => {
      proc.on('close', (code) => {
        if (code === 0) resolve({ success: true });
        else resolve({ success: false, message: stderr || `PowerShell exited with code ${code}` });
      });
    });
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('get-permissions', async () => {
  return loadPermissions();
});

ipcMain.handle('save-permissions', async (event, permissionData) => {
  try {
    savePermissions(permissionData);
    return { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('send-command', async (event, command) => {
  const permissions = loadPermissions();
  const response = {
    success: true,
    message: 'Lệnh tạm thời chưa được thực thi. Đây là demo command parser.',
    command,
    permissions
  };

  if (command.toLowerCase().includes('open app')) {
    response.message = 'Yêu cầu mở app được ghi nhận. Thay vì tự chạy, anh hãy dùng nút Open App hoặc structure action.';
  }

  return response;
});

ipcMain.handle('read-file', async (event, filePath) => {
  const permissions = loadPermissions();
  if (permissions.level < 1) {
    return { success: false, message: 'Cần cấp quyền đọc.' };
  }
  if (!isPathAllowed(filePath, permissions)) {
    return { success: false, message: 'Tập tin nằm ngoài folder được phép.' };
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { success: true, content };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('list-folder', async (event, folderPath) => {
  const permissions = loadPermissions();
  if (permissions.level < 1) {
    return { success: false, message: 'Cần cấp quyền đọc folder.' };
  }
  if (!isPathAllowed(folderPath, permissions)) {
    return { success: false, message: 'Folder nằm ngoài whitelist.' };
  }

  try {
    const items = fs.readdirSync(folderPath, { withFileTypes: true });
    return {
      success: true,
      items: items.map(item => ({ name: item.name, isDirectory: item.isDirectory() }))
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('create-file', async (event, filePath, content = '') => {
  const permissions = loadPermissions();
  if (permissions.level < 2) {
    return { success: false, message: 'Cần cấp quyền viết file.' };
  }
  const folderPath = path.dirname(filePath);
  if (!isPathAllowed(folderPath, permissions)) {
    return { success: false, message: 'Thư mục đích không nằm trong whitelist.' };
  }
  if (fs.existsSync(filePath)) {
    return { success: false, message: 'File đã tồn tại. Không ghi đè tự động.' };
  }

  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true, message: `Đã tạo file: ${filePath}` };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('open-app', async (event, appName) => {
  const permissions = loadPermissions();
  if (permissions.level < 3) {
    return { success: false, message: 'Cần cấp quyền mở app và thao tác.' };
  }
  if (!permissions.whitelist.apps.includes(appName)) {
    return { success: false, message: `App ${appName} không nằm trong whitelist.` };
  }

  try {
    spawn('cmd.exe', ['/c', 'start', '', appName], { shell: false, windowsHide: true });
    return { success: true, message: `Đã mở app: ${appName}` };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('save-memory', async (event, note) => {
  const memory = { note, createdAt: new Date().toISOString() };
  try {
    const existing = fs.existsSync(memoryPath)
      ? JSON.parse(fs.readFileSync(memoryPath, 'utf-8'))
      : [];
    existing.push(memory);
    fs.writeFileSync(memoryPath, JSON.stringify(existing, null, 2));
    return { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

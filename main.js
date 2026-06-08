const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { sendMessage } = require('./services/claude');

app.setAppUserModelId('com.anh.jarvisagent');

const permissionsPath = path.join(__dirname, 'config', 'permissions.json');
const memoryPath = path.join(__dirname, 'memory', 'store.json');
const auditLogPath = path.join(__dirname, 'memory', 'audit.log');

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
  registerGlobalShortcuts();
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

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
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

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function registerGlobalShortcuts() {
  try {
    globalShortcut.unregisterAll();
    const hotkey = 'Control+Alt+J';
    const registered = globalShortcut.register(hotkey, () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          showMainWindow();
        }
      }
    });
    if (!registered) {
      console.warn(`Không đăng ký được phím tắt ${hotkey}`);
    }
  } catch (err) {
    console.error('Lỗi đăng ký hotkey:', err.message);
  }
}

function openTerminal() {
  const terminal = process.platform === 'win32' ? 'cmd.exe' : 'bash';
  spawn(terminal, [], { shell: true, detached: true, stdio: 'ignore' }).unref();
}

function openBrowser(url = 'https://www.google.com') {
  const escapedUrl = safePowerShellString(url);
  if (process.platform === 'win32') {
    spawn('cmd.exe', ['/c', 'start', '', escapedUrl], { shell: false, windowsHide: true });
  } else {
    spawn('open', [escapedUrl], { detached: true, stdio: 'ignore' }).unref();
  }
}

function recordAudit(action, details, result) {
  try {
    ensureDirectory(path.dirname(auditLogPath));
    const entry = {
      ts: new Date().toISOString(),
      action,
      details,
      result
    };
    fs.appendFileSync(auditLogPath, JSON.stringify(entry) + '\n', 'utf-8');
  } catch (err) {
    console.error('Audit write failed:', err.message);
  }
}

async function confirmDanger(title, message, detail = '') {
  const res = await dialog.showMessageBox({
    type: 'warning',
    buttons: ['Cancel', 'Confirm'],
    defaultId: 1,
    cancelId: 0,
    title,
    message,
    detail,
    noLink: true
  });
  return res.response === 1;
}

async function callClaude(prompt) {
  try {
    const result = await sendMessage(prompt);
    return { success: true, result };
  } catch (err) {
    return { success: false, message: err.message };
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
  if (command.toLowerCase().includes('claude') || command.toLowerCase().includes('gpt') || command.toLowerCase().includes('trợ lý')) {
    const response = await callClaude(command);
    recordAudit('send-command', { command, routedTo: 'claude' }, response.success ? 'confirmed' : 'error');
    return {
      success: response.success,
      message: response.success ? response.result : `Claude chưa cấu hình hoặc lỗi: ${response.message}`
    };
  }

  recordAudit('send-command', { command }, 'confirmed');
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
    recordAudit('create-file', { filePath, overwrite: false }, 'denied');
    return { success: false, message: 'Cần cấp quyền viết file.' };
  }
  const folderPath = path.dirname(filePath);
  if (!isPathAllowed(folderPath, permissions)) {
    recordAudit('create-file', { filePath, overwrite: false }, 'denied');
    return { success: false, message: 'Thư mục đích không nằm trong whitelist.' };
  }

  const exists = fs.existsSync(filePath);
  if (exists) {
    const confirmed = await confirmDanger(
      'Ghi đè file?',
      `File ${filePath} đã tồn tại.`,
      'Chỉ xác nhận nếu anh muốn ghi đè nội dung hiện có.'
    );
    if (!confirmed) {
      recordAudit('create-file', { filePath, overwrite: true }, 'denied');
      return { success: false, message: 'Hủy ghi đè file.' };
    }
  }

  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    recordAudit('create-file', { filePath, overwrite: exists }, 'confirmed');
    return { success: true, message: `Đã tạo${exists ? ' và ghi đè' : ''} file: ${filePath}` };
  } catch (err) {
    recordAudit('create-file', { filePath, overwrite: exists }, 'error');
    return { success: false, message: err.message };
  }
});

ipcMain.handle('delete-path', async (event, targetPath) => {
  const permissions = loadPermissions();
  if (permissions.level < 3) {
    recordAudit('delete-path', { targetPath }, 'denied');
    return { success: false, message: 'Cần cấp quyền xóa file/folder.' };
  }

  if (!fs.existsSync(targetPath)) {
    recordAudit('delete-path', { targetPath }, 'denied');
    return { success: false, message: 'Đường dẫn không tồn tại.' };
  }

  const confirmed = await confirmDanger(
    'Xác nhận xóa',
    `Bạn có muốn xóa: ${targetPath}?`,
    'Hành động này có thể xóa vĩnh viễn nội dung này.'
  );

  if (!confirmed) {
    recordAudit('delete-path', { targetPath }, 'denied');
    return { success: false, message: 'Hủy xóa.' };
  }

  try {
    fs.rmSync(targetPath, { recursive: true, force: true });
    recordAudit('delete-path', { targetPath }, 'confirmed');
    return { success: true, message: `Đã xóa: ${targetPath}` };
  } catch (err) {
    recordAudit('delete-path', { targetPath }, 'error');
    return { success: false, message: err.message };
  }
});

ipcMain.handle('move-path', async (event, sourcePath, destPath) => {
  const permissions = loadPermissions();
  if (permissions.level < 3) {
    recordAudit('move-path', { sourcePath, destPath }, 'denied');
    return { success: false, message: 'Cần cấp quyền di chuyển file/folder.' };
  }

  if (!fs.existsSync(sourcePath)) {
    recordAudit('move-path', { sourcePath, destPath }, 'denied');
    return { success: false, message: 'Nguồn không tồn tại.' };
  }

  const confirmed = await confirmDanger(
    'Xác nhận di chuyển',
    `Bạn có muốn di chuyển từ ${sourcePath} sang ${destPath}?`,
    'Hành động này sẽ thay đổi vị trí tập tin/thư mục.'
  );

  if (!confirmed) {
    recordAudit('move-path', { sourcePath, destPath }, 'denied');
    return { success: false, message: 'Hủy di chuyển.' };
  }

  try {
    fs.renameSync(sourcePath, destPath);
    recordAudit('move-path', { sourcePath, destPath }, 'confirmed');
    return { success: true, message: `Đã di chuyển sang: ${destPath}` };
  } catch (err) {
    recordAudit('move-path', { sourcePath, destPath }, 'error');
    return { success: false, message: err.message };
  }
});

ipcMain.handle('query-claude', async (event, prompt) => {
  const response = await callClaude(prompt);
  if (response.success) {
    recordAudit('claude-query', { prompt }, 'confirmed');
    return { success: true, message: response.result };
  }
  recordAudit('claude-query', { prompt }, 'error');
  return { success: false, message: response.message };
});

ipcMain.handle('open-app', async (event, appName) => {
  const permissions = loadPermissions();
  if (permissions.level < 3) {
    recordAudit('open-app', { appName }, 'denied');
    return { success: false, message: 'Cần cấp quyền mở app và thao tác.' };
  }
  if (!permissions.whitelist.apps.includes(appName)) {
    recordAudit('open-app', { appName }, 'denied');
    return { success: false, message: `App ${appName} không nằm trong whitelist.` };
  }

  try {
    spawn('cmd.exe', ['/c', 'start', '', appName], { shell: false, windowsHide: true });
    recordAudit('open-app', { appName }, 'confirmed');
    return { success: true, message: `Đã mở app: ${appName}` };
  } catch (err) {
    recordAudit('open-app', { appName }, 'error');
    return { success: false, message: err.message };
  }
});

ipcMain.handle('open-terminal', async () => {
  try {
    openTerminal();
    recordAudit('open-terminal', {}, 'confirmed');
    return { success: true, message: 'Đã mở terminal.' };
  } catch (err) {
    recordAudit('open-terminal', {}, 'error');
    return { success: false, message: err.message };
  }
});

ipcMain.handle('open-browser', async (event, url) => {
  try {
    openBrowser(url || 'https://www.google.com');
    recordAudit('open-browser', { url }, 'confirmed');
    return { success: true, message: `Đã mở trình duyệt: ${url || 'https://www.google.com'}` };
  } catch (err) {
    recordAudit('open-browser', { url }, 'error');
    return { success: false, message: err.message };
  }
});

ipcMain.handle('list-memory', async () => {
  try {
    const existing = fs.existsSync(memoryPath)
      ? JSON.parse(fs.readFileSync(memoryPath, 'utf-8'))
      : [];
    return { success: true, items: existing };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('delete-memory', async (event, id) => {
  try {
    const existing = fs.existsSync(memoryPath)
      ? JSON.parse(fs.readFileSync(memoryPath, 'utf-8'))
      : [];
    const filtered = existing.filter(item => item.id !== id);
    fs.writeFileSync(memoryPath, JSON.stringify(filtered, null, 2), 'utf-8');
    recordAudit('delete-memory', { id }, 'confirmed');
    return { success: true };
  } catch (err) {
    recordAudit('delete-memory', { id }, 'error');
    return { success: false, message: err.message };
  }
});

ipcMain.handle('save-memory', async (event, note) => {
  const memory = { id: Date.now().toString(), note, createdAt: new Date().toISOString() };
  try {
    const existing = fs.existsSync(memoryPath)
      ? JSON.parse(fs.readFileSync(memoryPath, 'utf-8'))
      : [];
    existing.push(memory);
    fs.writeFileSync(memoryPath, JSON.stringify(existing, null, 2));
    recordAudit('save-memory', { id: memory.id, note }, 'confirmed');
    return { success: true, memory };
  } catch (err) {
    recordAudit('save-memory', { note }, 'error');
    return { success: false, message: err.message };
  }
});

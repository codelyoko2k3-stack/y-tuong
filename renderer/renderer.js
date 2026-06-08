const chatLog = document.getElementById('chatLog');
const commandInput = document.getElementById('commandInput');
const sendButton = document.getElementById('sendButton');
const permissionLevel = document.getElementById('permission-level');
const permFolders = document.getElementById('perm-folders');
const permApps = document.getElementById('perm-apps');
const btnListFolder = document.getElementById('btn-list-folder');
const btnReadFile = document.getElementById('btn-read-file');
const btnSaveMemory = document.getElementById('btn-save-memory');
const btnOpenApp = document.getElementById('btn-open-app');
const btnCreateFile = document.getElementById('btn-create-file');
const btnCreateShortcutDesktop = document.getElementById('btn-create-shortcut-desktop');
const btnCreateShortcutStartMenu = document.getElementById('btn-create-shortcut-startmenu');
const btnToggleAutoStart = document.getElementById('btn-toggle-auto-start');
const btnVoiceCommand = document.getElementById('btn-voice-command');
const btnSpeakLast = document.getElementById('btn-speak-last');
const btnQueryClaude = document.getElementById('btn-query-claude');
const btnDeletePath = document.getElementById('btn-delete-path');
const btnSavePermissions = document.getElementById('btn-save-permissions');
const btnRefreshPermissions = document.getElementById('btn-refresh-permissions');
const inputPermissionLevel = document.getElementById('input-permission-level');
const inputWhitelistFolders = document.getElementById('input-whitelist-folders');
const inputWhitelistApps = document.getElementById('input-whitelist-apps');
const autoStartStatus = document.getElementById('auto-start-status');
const voiceStatus = document.getElementById('voice-status');
let lastAgentResponse = '';
let recognition = null;
let voiceEnabled = false;

function appendMessage(text, type) {
  const node = document.createElement('div');
  node.className = `message ${type}`;
  node.textContent = text;
  chatLog.appendChild(node);
  chatLog.scrollTop = chatLog.scrollHeight;
  if (type === 'agent') {
    lastAgentResponse = text;
  }
}

async function refreshPermissions() {
  const result = await window.agentAPI.getPermissions();
  permissionLevel.textContent = `Cấp ${result.level}`;
  permFolders.textContent = `Folder whitelist: ${result.whitelist.folders.join(', ') || 'Không có'}`;
  permApps.textContent = `App whitelist: ${result.whitelist.apps.join(', ') || 'Không có'}`;
  inputPermissionLevel.value = result.level;
  inputWhitelistFolders.value = result.whitelist.folders.join('\n');
  inputWhitelistApps.value = result.whitelist.apps.join(', ');
  refreshAutoStartStatus();
}

async function refreshAutoStartStatus() {
  const state = await window.agentAPI.getAutoStart();
  autoStartStatus.textContent = `Khởi động cùng Windows: ${state.openAtLogin ? 'Bật' : 'Tắt'}`;
}

async function savePermissions() {
  const permissionData = {
    level: Number(inputPermissionLevel.value) || 1,
    whitelist: {
      folders: inputWhitelistFolders.value
        .split(/\r?\n/)
        .map(item => item.trim())
        .filter(Boolean),
      apps: inputWhitelistApps.value
        .split(/,/) 
        .map(item => item.trim())
        .filter(Boolean)
    }
  };

  const result = await window.agentAPI.savePermissions(permissionData);
  appendMessage(result.success ? 'Đã lưu permission.' : `Lỗi: ${result.message}`, 'agent');
  if (result.success) refreshPermissions();
}

async function executeOpenApp() {
  const appName = prompt('Nhập tên exe app muốn mở (ví dụ: notepad.exe):', 'notepad.exe');
  if (!appName) return;
  const result = await window.agentAPI.openApp(appName);
  appendMessage(result.success ? result.message : `Lỗi: ${result.message}`, 'agent');
}

async function executeCreateFile() {
  const folderPath = prompt('Nhập thư mục đích (phải nằm trong whitelist):', inputWhitelistFolders.value.split('\n')[0] || 'C:\\Users\\ahihi\\OneDrive\\Desktop\\y tuong');
  if (!folderPath) return;
  const fileName = prompt('Nhập tên file mới (ví dụ: note.txt):', 'note.txt');
  if (!fileName) return;
  const filePath = `${folderPath.replace(/\\+$/, '')}\\${fileName}`;
  const content = prompt('Nội dung file ban đầu (để trống nếu không cần):', '');
  const result = await window.agentAPI.createFile(filePath, content || '');
  appendMessage(result.success ? result.message : `Lỗi: ${result.message}`, 'agent');
}

async function executeCreateShortcut(location) {
  const result = await window.agentAPI.createShortcut(location);
  appendMessage(result.success ? result.message : `Lỗi: ${result.message}`, 'agent');
}

async function executeDeletePath() {
  const path = prompt('Nhập đường dẫn file hoặc folder cần xóa:');
  if (!path) return;
  const result = await window.agentAPI.deletePath(path);
  appendMessage(result.success ? result.message : `Lỗi: ${result.message}`, 'agent');
}

async function queryClaude() {
  const promptText = prompt('Nhập câu hỏi để gửi cho Claude:');
  if (!promptText) return;
  const result = await window.agentAPI.queryClaude(promptText);
  appendMessage(result.success ? result.message : `Lỗi: ${result.message}`, 'agent');
}

function updateVoiceStatus(message) {
  voiceStatus.textContent = `Giọng nói: ${message}`;
}

function initVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    updateVoiceStatus('Không hỗ trợ trên trình duyệt này');
    return null;
  }
  const rec = new SpeechRecognition();
  rec.lang = 'vi-VN';
  rec.interimResults = false;
  rec.maxAlternatives = 1;

  rec.addEventListener('start', () => {
    updateVoiceStatus('Đang nghe...');
  });
  rec.addEventListener('result', (event) => {
    const text = event.results[0][0].transcript;
    appendMessage(`(Giọng nói) ${text}`, 'user');
    commandInput.value = text;
    sendCommand();
  });
  rec.addEventListener('end', () => {
    updateVoiceStatus('Kết thúc nghe');
    voiceEnabled = false;
  });
  rec.addEventListener('error', (event) => {
    updateVoiceStatus(`Lỗi: ${event.error}`);
    voiceEnabled = false;
  });
  return rec;
}

async function toggleVoiceCommand() {
  if (!recognition) {
    recognition = initVoiceRecognition();
    if (!recognition) return;
  }
  if (voiceEnabled) {
    recognition.stop();
    voiceEnabled = false;
    updateVoiceStatus('Đã dừng');
  } else {
    recognition.start();
    voiceEnabled = true;
  }
}

async function toggleAutoStart() {
  const state = await window.agentAPI.getAutoStart();
  const result = await window.agentAPI.setAutoStart(!state.openAtLogin);
  appendMessage(result.success ? `Đã ${result.enabled ? 'bật' : 'tắt'} khởi động cùng Windows.` : `Lỗi: ${result.message}`, 'agent');
  refreshAutoStartStatus();
}

async function speakLastAgentMessage() {
  const text = lastAgentResponse || 'Xin chào, tôi đang sẵn sàng.';
  const result = await window.agentAPI.speakText(text);
  appendMessage(result.success ? 'Đã phát âm câu trả lời.' : `Lỗi: ${result.message}`, 'agent');
}

async function sendCommand() {
  const command = commandInput.value.trim();
  if (!command) return;
  appendMessage(command, 'user');
  commandInput.value = '';
  sendButton.disabled = true;

  const response = await window.agentAPI.sendCommand(command);
  appendMessage(response.message, 'agent');
  sendButton.disabled = false;
}

sendButton.addEventListener('click', sendCommand);
commandInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendCommand();
  }
});

btnListFolder.addEventListener('click', async () => {
  const path = prompt('Nhập đường dẫn folder để liệt kê:', 'C:\\Users\\Public');
  if (!path) return;
  const result = await window.agentAPI.listFolder(path);
  if (result.success) {
    appendMessage(`Folder ${path}: ${result.items.map(i => i.isDirectory ? '[D]' : '[F] ' + i.name).join(', ')}`, 'agent');
  } else {
    appendMessage(`Lỗi: ${result.message}`, 'agent');
  }
});

btnReadFile.addEventListener('click', async () => {
  const path = prompt('Nhập đường dẫn file để đọc:', 'C:\\Users\\Public\\README.txt');
  if (!path) return;
  const result = await window.agentAPI.readFile(path);
  if (result.success) {
    appendMessage(result.content.slice(0, 1000) + '\n... (cắt)', 'agent');
  } else {
    appendMessage(`Lỗi: ${result.message}`, 'agent');
  }
});

btnSaveMemory.addEventListener('click', async () => {
  const note = prompt('Nhập nội dung ghi nhớ:');
  if (!note) return;
  const result = await window.agentAPI.saveMemory(note);
  appendMessage(result.success ? 'Đã lưu ghi nhớ.' : `Lỗi: ${result.message}`, 'agent');
});

btnOpenApp.addEventListener('click', executeOpenApp);
btnCreateFile.addEventListener('click', executeCreateFile);
btnDeletePath.addEventListener('click', executeDeletePath);
btnCreateShortcutDesktop.addEventListener('click', () => executeCreateShortcut('desktop'));
btnCreateShortcutStartMenu.addEventListener('click', () => executeCreateShortcut('startMenu'));
btnToggleAutoStart.addEventListener('click', toggleAutoStart);
btnVoiceCommand.addEventListener('click', toggleVoiceCommand);
btnSpeakLast.addEventListener('click', speakLastAgentMessage);
btnQueryClaude.addEventListener('click', queryClaude);
btnSaveMemory.addEventListener('click', async () => {
  const note = prompt('Nhập nội dung ghi nhớ:');
  if (!note) return;
  const result = await window.agentAPI.saveMemory(note);
  appendMessage(result.success ? 'Đã lưu ghi nhớ.' : `Lỗi: ${result.message}`, 'agent');
});
btnSavePermissions.addEventListener('click', savePermissions);
btnRefreshPermissions.addEventListener('click', refreshPermissions);

refreshPermissions();

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectRoot = process.cwd();
const srcDir = path.join(projectRoot, 'release', 'Jarvis Agent-win32-x64');
const outZip = path.join(projectRoot, 'release', 'Jarvis-Agent-win32-x64.zip');

if (!fs.existsSync(srcDir)) {
  console.error('Portable release folder not found:', srcDir);
  process.exit(1);
}

try {
  // Use PowerShell Compress-Archive on Windows
  const cmd = `powershell -Command "Compress-Archive -Path '${srcDir}\\*' -DestinationPath '${outZip}' -Force"`;
  console.log('Running:', cmd);
  execSync(cmd, { stdio: 'inherit' });
  console.log('Created zip:', outZip);
  process.exit(0);
} catch (err) {
  console.error('Error creating zip:', err);
  process.exit(2);
}

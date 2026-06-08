const fs = require('fs');
const path = require('path');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function copySync(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    ensureDir(dest);
    for (const f of fs.readdirSync(src)) {
      copySync(path.join(src, f), path.join(dest, f));
    }
  } else {
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
  }
}

(async () => {
  try {
    const projectRoot = process.cwd();
    const outDir = path.join(projectRoot, 'release', 'Jarvis Agent-win32-x64');
    if (fs.existsSync(outDir)) {
      console.log('Removing existing', outDir);
      fs.rmSync(outDir, { recursive: true, force: true });
    }
    ensureDir(outDir);

    const electronDist = path.join(projectRoot, 'node_modules', 'electron', 'dist');
    if (!fs.existsSync(electronDist)) {
      console.error('Electron dist not found at', electronDist);
      process.exit(1);
    }

    console.log('Copying electron dist to', outDir);
    copySync(electronDist, outDir);

    const resourcesApp = path.join(outDir, 'resources', 'app');
    ensureDir(resourcesApp);

    // Files and folders to include in resources/app
    const toCopy = ['package.json', 'main.js', 'preload.js', 'renderer', 'config', 'memory', 'assets'];
    for (const item of toCopy) {
      const src = path.join(projectRoot, item);
      const dest = path.join(resourcesApp, item);
      copySync(src, dest);
    }

    console.log('Portable package created at', outDir);
    process.exit(0);
  } catch (err) {
    console.error('Error creating portable package:', err);
    process.exit(2);
  }
})();

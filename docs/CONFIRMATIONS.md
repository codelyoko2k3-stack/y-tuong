Secure confirmation guidelines and example native dialog (Electron main process):

- Always require explicit user confirmation for:
  - Deleting files or folders (especially recursive)
  - Moving large numbers of files
  - Overwriting files
  - Running terminal commands that modify system or install software
  - Sending emails or uploading files
  - Any financial/account actions

Example snippet to add in `main.js` (use `dialog.showMessageBox` with type:'warning'):

```
const { dialog } = require('electron');

async function confirmDanger(title, message) {
  const res = await dialog.showMessageBox({
    type: 'warning',
    buttons: ['Cancel', 'Confirm'],
    defaultId: 0,
    cancelId: 0,
    title,
    message,
    detail: 'This action requires explicit confirmation.'
  });
  return res.response === 1; // true if Confirm
}

// Use before dangerous IPC handlers:
// if (!await confirmDanger('Delete files?', 'Will delete selected files.')) return;
```

Audit logging:
- Record user decisions in `memory/audit.log`.
- Include timestamp, action, details, and allowed/denied/outcome.
- Do not track audit logs in git; add `memory/audit.log` to `.gitignore`.

Example audit entry format (JSON lines):
{"ts":"2026-06-08T12:00:00Z","action":"delete-path","details":{"targetPath":"C:/..."},"result":"denied"}

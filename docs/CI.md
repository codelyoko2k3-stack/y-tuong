GitHub Actions workflow to build NSIS installer

Overview

- Workflow: `.github/workflows/build-windows.yml`
- Runner: `windows-latest`
- Triggers: push to `main` or manual `workflow_dispatch`
- Output: uploads `dist/*.exe` and `dist/*.zip` as artifact `windows-installer`

Notes & Secrets

- No signing by default. To enable code signing with a PFX certificate, set these secrets in the repository: `CSC_LINK` (base64 PFX) and `CSC_KEY_PASSWORD`.
- If you need to customize Node version or add caching, edit the workflow.

How to use

1. Commit and push this repo to GitHub (branch `main`).
2. Open the repository Actions tab and run the `Build Windows NSIS` workflow or push to `main`.
3. After success, download the `windows-installer` artifact from the workflow run.

Local testing

- Use `npm run package-portable` locally to produce quick portable builds.
- Use the portable build to smoke-test before running the CI workflow.

Creating the CI PR (quick steps)

1. Create a branch locally:

```bash
git checkout -b feature/ci-build-nsis
```

2. Commit the workflow and docs changes:

```bash
git add .github/workflows/build-windows.yml docs/CI.md docs/PR.md
git commit -m "ci: add Windows NSIS build workflow + signing scaffold + docs"
```

3. Push branch to GitHub (assuming `origin` exists):

```bash
git push -u origin feature/ci-build-nsis
```

4. Create a PR using GitHub web UI or `gh` CLI:

```bash
# with gh CLI
gh pr create --title "CI: build Windows NSIS" --body "Adds Windows CI workflow to build NSIS installer and upload artifacts." --base main
```

Notes:
- To enable code signing, add repository secrets `CSC_LINK` (base64 PFX) and `CSC_KEY_PASSWORD` in Settings → Secrets.
- If `origin` remote isn't set, add it with:

```bash
git remote add origin git@github.com:USERNAME/REPO.git
git push -u origin feature/ci-build-nsis
```

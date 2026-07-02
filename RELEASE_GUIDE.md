# Release Guide for Paycheck Calculator

This guide explains how to release new versions of the Paycheck Calculator desktop app.

## Release Overview

The release process:
1. Bumps the version in `package.json`
2. Creates a git tag matching the version
3. GitHub Actions automatically builds and uploads the Windows `.exe`
4. You manually build and upload the macOS `.dmg` and `.zip`

## Step-by-Step Release Process

### 1. Prepare the Release

Ensure the working tree is clean:
```bash
git status
```

### 2. Bump the Version

```bash
npm version patch
```

Use `npm version minor` or `npm version major` for larger releases.

This updates `package.json`, `package-lock.json`, creates a commit, and creates a git tag.

### 3. Push to GitHub

Push the version commit:
```bash
git push
```

Push the version tag:
```bash
git push --tags
```

Or push all tags at once:
```bash
git push --tags
```

### 4. Wait for GitHub Actions

The `release.yml` workflow is triggered by the `v*` tag. It will:
- Create a GitHub Release
- Build and upload the Windows `.exe`

Check the workflow status:
```bash
gh run list --repo MNIKevin202/PaycheckBills --limit 5
gh run watch <RUN_ID>
```

### 5. Build macOS Locally

Once the Windows build completes, build the macOS installer on your Mac:

```bash
npm run dist:mac
```

This creates:
- `dist/Paycheck-Calculator-X.Y.Z-arm64.dmg` — App bundle
- `dist/Paycheck-Calculator-X.Y.Z-arm64-mac.zip` — Zipped app for updater compatibility

### 6. Upload macOS Assets to GitHub Release

Upload to the same release:

```bash
gh release upload vX.Y.Z \
  dist/Paycheck-Calculator-X.Y.Z-arm64.dmg \
  dist/Paycheck-Calculator-X.Y.Z-arm64-mac.zip \
  --clobber
```

(Replace `X.Y.Z` with the actual version.)

### 7. Verify the Release

View the release:
```bash
gh release view vX.Y.Z --web
```

Or check assets programmatically:
```bash
gh release view vX.Y.Z --json assets
```

You should see:
- `Paycheck-Calculator-Setup-X.Y.Z-x64.exe`
- `Paycheck-Calculator-X.Y.Z-arm64.dmg`
- `Paycheck-Calculator-X.Y.Z-arm64-mac.zip`

## Release Checklist

- [ ] Working tree is clean (`git status`)
- [ ] Version bumped with `npm version patch/minor/major`
- [ ] Commits and tags pushed
- [ ] GitHub Actions release workflow completed
- [ ] Windows `.exe` uploaded to GitHub Release
- [ ] macOS built locally with `npm run dist:mac`
- [ ] macOS `.dmg` and `.zip` uploaded to GitHub Release
- [ ] Release assets verified on GitHub

## Troubleshooting

### GitHub Actions Workflow Fails

Check the workflow logs:
```bash
gh run view <RUN_ID> --log
```

Common issues:
- Node version mismatch: Verify `node-version` in `.github/workflows/release.yml`
- Missing npm dependencies: Ensure `npm ci` succeeds locally

### macOS Build Issues

If `npm run dist:mac` fails:
1. Ensure Node.js is installed: `node --version`
2. Reinstall dependencies: `npm ci`
3. Check for stale build artifacts: `rm -rf dist/`
4. Try again: `npm run dist:mac`

### Upload Issues

If `gh release upload` fails:
- Verify the tag exists locally and on GitHub: `git tag -l` and `gh release list`
- Verify the files exist: `ls dist/*.dmg dist/*.zip`
- Try uploading again with `--clobber` to overwrite

## In-App Update Behavior

When a user launches the app, it checks GitHub Releases for newer versions. If available:
1. A dialog notifies them of the update
2. They can click "Download"
3. The installer is downloaded to a temporary folder
4. Another dialog asks to install, open the folder, or skip

The updater selects the correct installer:
- macOS: looks for `Paycheck-Calculator-X.Y.Z-arm64.dmg`
- Windows: looks for `Paycheck-Calculator-Setup-X.Y.Z-x64.exe`

## Asset Naming Convention

Keep these consistent across:
- `electron-builder` config in `package.json`
- GitHub Actions workflows
- The updater code in `main.js`

Current naming:
- macOS: `Paycheck-Calculator-${version}-${arch}.dmg` and `Paycheck-Calculator-${version}-${arch}-mac.zip`
- Windows: `Paycheck-Calculator-Setup-${version}-${arch}.exe`

# Paycheck Calculator - Desktop App

An Electron-based desktop application for managing paycheck calculations with MongoDB backend.

## Project Structure

- `main.js` — Electron main process, handles window creation and in-app update checking
- `server.js` — Express server with MongoDB integration
- `index.html` — Application UI
- `package.json` — Project metadata and build configuration
- `.github/workflows/` — GitHub Actions for CI/CD

## Development

```bash
npm install
npm start
```

## Build & Release

### Build macOS locally

```bash
npm run dist:mac
```

Outputs `.dmg` and `.zip` to `dist/`.

### Build Windows on GitHub Actions

Windows builds are automated via GitHub Actions. Push a version tag to trigger the release workflow.

## Releasing a New Version

1. **Bump version:**
   ```bash
   npm version patch  # or minor/major
   ```

2. **Push commits and tags:**
   ```bash
   git push
   git push --tags
   ```

3. **Wait for GitHub Actions**
   - Windows `.exe` is automatically built and uploaded.

4. **Build and upload macOS locally:**
   ```bash
   npm run dist:mac
   gh release upload vX.Y.Z \
     dist/Paycheck-Calculator-X.Y.Z-arm64.dmg \
     dist/Paycheck-Calculator-X.Y.Z-arm64-mac.zip \
     --clobber
   ```

5. **Verify the release:**
   ```bash
   gh release view vX.Y.Z --web
   ```

## In-App Updates

The app checks GitHub Releases on startup and alerts users when a newer version is available. Users can download the installer directly from the app.

## Build Configuration

- macOS: `.dmg` and `.zip` (universal builds via local `npm run dist:mac`)
- Windows: `.exe` NSIS installer (built via GitHub Actions)

Both are published to GitHub Releases for distribution.

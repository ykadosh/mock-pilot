# mock-pilot

An Electron desktop application built with:

- **Electron** + **Electron Forge** (packaging & development)
- **Vite** (bundler)
- **React** + **TypeScript** (renderer)
- **Tailwind CSS** + **shadcn/ui** (styling & components)

## Development

```bash
npm start
```

## Package

```bash
npm run package
```

## Make (distributable)

```bash
npm run make
```

## Releasing

Releases are automated via GitHub Actions. When a version tag (`v*`) is pushed, the pipeline builds artifacts for macOS (.zip) and Windows (.exe) and uploads them to a GitHub Release.

To create a new release:

```bash
# Patch release (e.g. 0.1.0 → 0.1.1)
npm run release:patch

# Minor release (e.g. 0.1.1 → 0.2.0)
npm run release:minor

# Major release (e.g. 0.2.0 → 1.0.0)
npm run release:major
```

These scripts bump the version in `package.json`, commit the change, create a git tag, and push everything — triggering the release workflow automatically.

## Installation

### macOS

1. Download the `.zip` file from the latest [release](https://github.com/ykadosh/mock-pilot/releases)
2. Unzip and move `MockPilot.app` to your Applications folder
3. Since the app is not yet code-signed, macOS will block it on first launch. Run:
   ```bash
   xattr -cr /Applications/MockPilot.app
   ```
4. Open the app normally

### Windows

1. Download the `.exe` installer from the latest [release](https://github.com/ykadosh/mock-pilot/releases)
2. Run the installer

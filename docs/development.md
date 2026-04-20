# Development

This guide covers how to build FOSSPad from source and work on the codebase.

## Prerequisites

| Tool | Version | Install |
| --- | --- | --- |
| **Node.js** | >= 18 | [nodejs.org](https://nodejs.org) or `brew install node` |
| **Rust** | stable (1.75+) | [rustup.rs](https://rustup.rs) |
| **System libraries** | (see below) | Platform package manager |

### System Libraries by Platform

**Linux (Fedora):**

```bash
sudo dnf install webkit2gtk4.1-devel openssl-devel gtk3-devel
```

**Linux (Ubuntu / Debian):**

```bash
sudo apt install libwebkit2gtk-4.1-dev libssl-dev libgtk-3-dev libappindicator3-dev librsvg2-dev patchelf
```

**macOS:**

```bash
xcode-select --install
```

**Windows:**

- WebView2 (usually pre-installed on Windows 10+)
- Visual Studio Build Tools with the "Desktop development with C++" workload

## Running in Development

```bash
# Install frontend dependencies
npm install

# Launch the Tauri app with hot-reload
npm run tauri dev
```

This starts the Vite dev server on `http://localhost:1420` and opens the Tauri window. Changes to React code hot-reload instantly. Changes to Rust code trigger a recompile.

### Frontend Only

To work on the UI without launching the Tauri window:

```bash
npm run dev
```

This opens the frontend at `http://localhost:1420`. Note that Tauri `invoke` calls will fail since there is no Rust backend, but it's useful for pure UI/CSS work.

## Building for Production

### All Platforms (via Tauri)

```bash
npm run build         # Build frontend
npm run tauri build   # Build the native app
```

The output is placed in `src-tauri/target/release/bundle/`.

### macOS ARM Convenience Script

```bash
./scripts/build-macos.sh
```

This runs `npm ci` and `npx tauri build --target aarch64-apple-darwin`, producing a `.app` and `.dmg` in the Tauri target directory.

## Type Checking

```bash
# Frontend
npx tsc --noEmit

# Backend
cd src-tauri && cargo check
```

## Project Structure

See [architecture.md](architecture.md) for a full breakdown. The short version:

- `src/` — React frontend (TypeScript + CSS)
- `src-tauri/src/lib.rs` — All Rust Tauri commands (single file)
- `src-tauri/tauri.conf.json` — Tauri app configuration
- `docs/` — Documentation

## App Icons

The source icon is `app-icon.png` in the repo root (4800x4800). Tauri generates all required sizes during the build:

```bash
npx tauri icon app-icon.png
```

This populates `src-tauri/icons/` with `.png`, `.icns`, and `.ico` files. The CI workflows run this automatically.

## npm Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start Vite dev server (frontend only) |
| `npm run build` | Type-check and build frontend for production |
| `npm run preview` | Preview the production build locally |
| `npm run tauri dev` | Launch full Tauri app in dev mode |
| `npm run tauri build` | Build the native app for the current platform |

## CI/CD

- **`build.yml`** runs on every push to `main` and on PRs. Builds all platforms and uploads artifacts.
- **`release.yml`** runs on `v*` tags. Bumps versions, builds all platforms, and creates a GitHub Release.

See the workflow files in `.github/workflows/` for details.

## Code Style

- TypeScript with strict mode enabled.
- CSS uses custom properties (design tokens) defined in `src/styles/variables.css`.
- Rust follows standard `cargo fmt` formatting.
- Pre-commit hooks (via `.pre-commit-config.yaml`) check for trailing whitespace, file endings, large files, and secret leaks (gitleaks).

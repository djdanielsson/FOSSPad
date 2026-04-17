# NoteDesk

A lightweight, open-source OneNote alternative built with **Tauri + React**. Your notes are stored as **plain Markdown files** in a folder structure you can commit to Git and sync across systems.

## Features

- **OneNote-style organization** — Notebooks → Sections → Pages, with colored tabs
- **Markdown-backed storage** — Every page is a `.md` file; every section is a folder; every notebook is a top-level directory
- **Live WYSIWYG editing** — Click a block to edit raw Markdown; click away to see it rendered. No split-pane needed.
- **Syntax-highlighted code blocks** — Supports JS/TS, Python, Rust, Go, Java, C, SQL, Bash, and more
- **Mermaid diagrams** — Write `mermaid` code blocks and see them rendered as diagrams
- **Images & video embeds** — Inline images, YouTube embeds, and direct video links
- **GFM support** — Tables, task lists, strikethrough, blockquotes
- **Auto-save** — Changes save automatically after 1.5 seconds of inactivity
- **Lightweight** — Built on Tauri (Rust), not Electron. Tiny memory footprint.
- **Cross-platform** — Runs on Linux, macOS, and Windows
- **Git-friendly** — The workspace folder is just a directory of Markdown files, ready to be a repo

## Workspace Structure

```
my-notes/                   ← workspace root (you choose this)
├── my-notebook/            ← notebook (folder)
│   ├── .notebook.json      ← metadata (name, color)
│   ├── General/            ← section (folder)
│   │   ├── Welcome.md      ← page (Markdown file)
│   │   └── Todo.md
│   └── Research/
│       └── Links.md
└── work/
    ├── .notebook.json
    └── Meetings/
        └── 2024-01-15.md
```

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **Rust** (install via [rustup.rs](https://rustup.rs))
- **System libraries** for Tauri:
  - **Linux (Fedora):** `dnf install webkit2gtk4.1-devel openssl-devel gtk3-devel`
  - **Linux (Ubuntu):** `apt install libwebkit2gtk-4.1-dev libssl-dev libgtk-3-dev`
  - **macOS:** Xcode Command Line Tools
  - **Windows:** WebView2 (usually pre-installed on Windows 10+)

### Build the macOS App (Apple Silicon)

On your Mac, make sure you have the prerequisites, then:

```bash
# Clone and enter the project
cd notedesk

# One-command build — produces a .app and .dmg
./build-macos.sh
```

This outputs:
- `src-tauri/target/aarch64-apple-darwin/release/bundle/macos/NoteDesk.app` — drag to `/Applications`
- `src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/NoteDesk_0.1.0_aarch64.dmg` — distributable disk image

Or build manually:

```bash
npm ci
npx tauri build --target aarch64-apple-darwin
```

### CI / GitHub Actions

Push to GitHub and a macOS ARM build runs automatically. Download the `.dmg` from the Actions artifacts tab.

### Development

```bash
# Run in development mode (opens the Tauri window with hot reload)
npm install
npm run tauri dev

# Frontend only (opens at http://localhost:1420)
npm run dev

# Type-check
npx tsc --noEmit

# Rust check
cd src-tauri && cargo check
```

## Keyboard Shortcuts

| Action | Shortcut |
|---|---|
| Save current page | Auto-saves after 1.5s |
| Escape editing block | `Esc` |
| Insert tab in code | `Tab` |

## Importing Existing Markdown

Right-click a section → Import, or simply copy `.md` files into the appropriate section folder and restart the app.

## License

MIT

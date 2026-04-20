# Architecture

FOSSPad is a desktop application built with [Tauri v2](https://v2.tauri.app/) (Rust backend) and a React + TypeScript frontend. The two halves communicate through Tauri's `invoke` IPC mechanism.

## High-Level Diagram

```text
┌─────────────────────────────────────────────────┐
│                    Tauri Shell                   │
│  ┌────────────────────┐  ┌────────────────────┐ │
│  │   React Frontend   │  │    Rust Backend     │ │
│  │  (Vite + TS + CSS) │◄─┤  (src-tauri/src/)  │ │
│  │                     │  │                     │ │
│  │  App.tsx            │  │  lib.rs             │ │
│  │  ├─ NotebookTabs    │  │  ├─ Workspace I/O   │ │
│  │  ├─ SectionTabs     │  │  ├─ CRUD commands   │ │
│  │  ├─ PageList        │  │  ├─ Search engine   │ │
│  │  ├─ Editor          │  │  ├─ Tag system      │ │
│  │  ├─ SearchPanel     │  │  ├─ Git operations  │ │
│  │  ├─ SettingsPanel   │  │  ├─ Settings I/O    │ │
│  │  └─ TagEditor       │  │  └─ Credential mgmt │ │
│  └────────────────────┘  └────────────────────┘ │
│              ▲                     │             │
│              │    invoke / IPC     │             │
│              └─────────────────────┘             │
└─────────────────────────────────────────────────┘
              │
              ▼
    ┌──────────────────┐
    │   Filesystem      │
    │  (Markdown files) │
    └──────────────────┘
```

## Directory Layout

```text
note-desk/
├── src/                        # React frontend
│   ├── main.tsx                # Entry point — renders App inside WorkspaceProvider
│   ├── App.tsx                 # Root component — layout, theme application, routing
│   ├── types.ts                # Shared TypeScript interfaces (Workspace, Notebook, etc.)
│   ├── hooks/
│   │   └── useWorkspace.tsx    # React context + state for the active workspace
│   ├── utils/
│   │   └── api.ts              # Tauri invoke wrappers — typed frontend → backend calls
│   ├── components/
│   │   ├── NotebookTabs.tsx    # Horizontal notebook tab bar with color indicators
│   │   ├── SectionTabs.tsx     # Section tab bar within a notebook
│   │   ├── PageList.tsx        # Sidebar page list for the active section
│   │   ├── Editor.tsx          # Block-based WYSIWYG Markdown editor
│   │   ├── RenderedBlock.tsx   # Renders a single Markdown block as HTML
│   │   ├── SearchPanel.tsx     # Full-text search overlay
│   │   ├── SettingsPanel.tsx   # Theme + Git settings dialog
│   │   ├── TagEditor.tsx       # YAML front-matter tag editor
│   │   └── WelcomeScreen.tsx   # First-launch workspace picker
│   └── styles/
│       ├── global.css          # Base styles and resets
│       └── variables.css       # CSS custom properties (theme tokens)
├── src-tauri/                  # Rust backend
│   ├── Cargo.toml              # Rust dependencies
│   ├── tauri.conf.json         # Tauri app config (window, bundle, plugins)
│   ├── Entitlements.plist      # macOS entitlements for code signing
│   ├── src/
│   │   ├── main.rs             # Binary entry point
│   │   └── lib.rs              # All Tauri commands (single-file backend)
│   └── icons/                  # Generated app icons (all sizes)
├── public/                     # Static assets served by Vite
├── docs/                       # Project documentation
├── .github/
│   ├── workflows/
│   │   ├── build.yml           # CI: build on push/PR (macOS, Linux, Windows)
│   │   └── release.yml         # CD: build + GitHub Release on tag push
│   └── dependabot.yml
├── index.html                  # Vite HTML entry
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript config
├── package.json                # npm scripts and dependencies
├── scripts/
│   └── build-macos.sh          # Convenience script for local macOS builds
└── claude.md                   # Agent context for AI assistants
```

## Frontend Architecture

### State Management

All workspace state flows through `useWorkspace`, a React context defined in `src/hooks/useWorkspace.tsx`. It manages:

- **Workspace loading** — Calls the Rust `load_workspace` command and stores the full notebook/section/page tree.
- **Active selection** — Tracks which notebook, section, and page are currently selected.
- **Content and auto-save** — Holds the active page's Markdown content. When content changes, a 1.5-second debounce timer triggers `save_page` via IPC.
- **CRUD operations** — Wraps create/delete/rename for notebooks, sections, and pages. Each operation calls the Rust backend, then refreshes the workspace tree.

### Editor

The editor (`src/components/Editor.tsx`) uses a block-based approach:

1. **Parse** — Raw Markdown is split into blocks (headings, paragraphs, code, lists, tables, mermaid, images, etc.) by `parseBlocks()`.
2. **Render** — Each block is rendered as HTML by `RenderedBlock.tsx`. Code blocks use inline syntax highlighting. Mermaid blocks are rendered as SVG diagrams.
3. **Edit** — Clicking a rendered block switches it to a `<textarea>` showing raw Markdown. Clicking away (or pressing Escape) commits the edit back.

This gives a live WYSIWYG feel without a heavyweight rich-text engine.

### Theming

Theme colors are stored in the workspace's `.notedesk/settings.json`. The app applies them as CSS custom properties on `document.documentElement`. Derived values (hover states, borders, muted text) are computed from the base colors using hex math utilities. Four presets are built-in (Light, Dark, Solarized, Nord), and users can customize individual color channels.

## Backend Architecture

The entire Rust backend lives in `src-tauri/src/lib.rs`. It exposes ~25 Tauri commands, grouped by concern:

### Workspace I/O

- `load_workspace` — Reads the filesystem tree and returns a `Workspace` struct with all notebooks, sections, and pages.
- `create_workspace` — Creates the root directory if needed, then loads.

### Page CRUD

- `read_page`, `save_page`, `create_page`, `delete_page`, `rename_page` — Direct filesystem operations on Markdown files.
- `import_markdown_files` — Copies external `.md` files into a section folder.

### Search

- `search_workspace` — Walks all `.md` files and performs case-insensitive line-by-line text search.
- `search_by_tag` — Parses YAML front-matter from every file and matches against a given tag.

### Tag System

- `get_page_tags` / `set_page_tags` — Read and write YAML front-matter `tags` arrays. The front-matter parser handles BOM, varied line endings, and preserves the document body.

### Git Operations

- `git_init`, `git_clone`, `git_set_remote` — Repository setup.
- `git_status` — Returns branch, changed file count, ahead/behind.
- `git_commit_and_push` — Stages all, commits (optionally GPG-signed), and pushes. Supports SSH key and HTTPS token auth.
- `git_pull` — Pulls from upstream with configured auth.

### Settings and Credentials

- `load_settings` / `save_settings` — Persist theme and Git config to `.notedesk/settings.json`.
- `save_git_credentials` / `load_git_credentials` / `clear_git_credentials` — AES-256-GCM encrypted credential storage. Keys are derived from a salt + the local user's environment (username + home directory).

## CI/CD

Two GitHub Actions workflows power the build pipeline:

- **`build.yml`** — Runs on every push to `main` and on PRs. Builds for macOS ARM, Linux x64, Linux ARM64, and Windows x64. Uploads artifacts (`.dmg`, `.app`, `.deb`, `.AppImage`, `.exe`, `.msi`).
- **`release.yml`** — Triggered by pushing a `v*` tag. Bumps version numbers across `package.json`, `tauri.conf.json`, and `Cargo.toml`, builds all platforms, then creates a GitHub Release with all binaries attached.

## Key Dependencies

| Layer | Dependency | Purpose |
| --- | --- | --- |
| Frontend | React 19 | UI framework |
| Frontend | Milkdown 7 | Markdown rendering primitives (used for reference) |
| Frontend | Mermaid 11 | Diagram rendering |
| Frontend | Vite 8 | Dev server and bundler |
| Backend | Tauri 2 | Desktop app framework |
| Backend | serde / serde_json / serde_yaml | Serialization |
| Backend | aes-gcm | Credential encryption |
| Backend | sha2 | Key derivation |

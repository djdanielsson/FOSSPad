# FOSSPad — Agent Context

## What Is This?

FOSSPad is a cross-platform desktop note-taking application — an open-source alternative to Microsoft OneNote. It stores notes as plain Markdown files organized in a filesystem hierarchy (Notebooks → Sections → Pages). Built with Tauri v2 (Rust) on the backend and React 19 + TypeScript on the frontend.

### `.agents/skills/` — Agent Skills (MANDATORY)

**At the start of every session, read `.agents/skills/README.md`.** It is the index of all available skills and describes when each one applies. Before performing any action that matches a skill, open and read that skill's `SKILL.md` — do not rely on memory or prior context. Skipping this step will produce work that violates project standards.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite 8, CSS custom properties for theming
- **Backend:** Rust, Tauri v2, serde for serialization, aes-gcm for credential encryption
- **Build:** npm + Cargo, Tauri CLI for bundling
- **CI/CD:** GitHub Actions — builds for macOS ARM, Linux x64/arm64, Windows x64

## Repository Layout

```text
src/                          React frontend
  main.tsx                    Entry point
  App.tsx                     Root component, theme application, layout
  types.ts                    TypeScript interfaces (Workspace, Notebook, Section, Page)
  hooks/useWorkspace.tsx      React context managing all workspace state + CRUD
  utils/api.ts                Typed wrappers around Tauri invoke calls
  components/                 UI components (Editor, NotebookTabs, SectionTabs, etc.)
  styles/                     Global CSS and design tokens

src-tauri/                    Rust backend
  src/lib.rs                  ALL Tauri commands (~1000 lines, single file)
  src/main.rs                 Binary entry point (delegates to lib)
  tauri.conf.json             App config (window, bundle settings, plugins)
  Cargo.toml                  Rust dependencies

docs/                         Documentation (architecture, quickstart, installation, dev)
.github/workflows/            CI (build.yml) and CD (release.yml)
```

## Architecture Highlights

- **All backend logic is in `src-tauri/src/lib.rs`** — workspace loading, CRUD, search, tags, Git, settings, encrypted credentials. There is no module splitting.
- **Frontend state is centralized** in `useWorkspace` (React context). Components consume it via `useWorkspace()` hook.
- **The editor is block-based** — `parseBlocks()` splits Markdown into typed blocks; `RenderedBlock` renders each one; clicking a block opens a textarea for raw editing.
- **Theming** works by setting CSS custom properties on the document root, with derived colors computed in JS.
- **Git integration** shells out to the `git` CLI from Rust. Credentials are AES-256-GCM encrypted with a key derived from the user's environment.
- **No database** — the workspace IS the filesystem. Notebooks are folders, sections are subfolders, pages are `.md` files.

## Key Commands (Tauri IPC)

The frontend communicates with the backend via `invoke()`. Key commands:

- Workspace: `load_workspace`, `create_workspace`
- Pages: `read_page`, `save_page`, `create_page`, `delete_page`, `rename_page`
- Notebooks/Sections: `create_notebook`, `create_section`, `delete_notebook`, `delete_section`
- Search: `search_workspace`, `search_by_tag`
- Tags: `get_page_tags`, `set_page_tags`
- Git: `git_init`, `git_clone`, `git_status`, `git_commit_and_push`, `git_pull`, `git_set_remote`
- Settings: `load_settings`, `save_settings`
- Credentials: `save_git_credentials`, `load_git_credentials`, `clear_git_credentials`

## Workspace Data Format

```text
workspace-root/
  .notedesk/settings.json          App settings (theme + git config)
  .notedesk/credentials.json       Encrypted git credentials
  <notebook-slug>/
    .notebook.json                  { "name": "Display Name", "color": "#hex" }
    <Section-Name>/
      Page-Name.md                  Standard Markdown, optional YAML front-matter for tags
```

## Common Development Tasks

```bash
npm install              # Install frontend deps
npm run tauri dev        # Full app with hot-reload
npm run dev              # Frontend only (no Rust backend)
npx tsc --noEmit         # TypeScript type-check
cd src-tauri && cargo check  # Rust type-check
npm run tauri build      # Production build
```

## Things to Know

- The app auto-saves after 1.5s of inactivity (debounced in `useWorkspace`).
- Notebook folder names are slugified versions of display names.
- Front-matter parsing handles BOM, `\r\n`, and various edge cases.
- The macOS build is unsigned — users must run `xattr -d com.apple.quarantine` after install.
- Version bumping is automated in the release workflow (updates package.json, tauri.conf.json, Cargo.toml).
- Pre-commit hooks enforce trailing whitespace, EOF newlines, no large files, and gitleaks.

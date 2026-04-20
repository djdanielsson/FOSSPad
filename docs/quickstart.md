# Quick Start

This guide gets you from zero to taking notes in under five minutes.

## 1. Install FOSSPad

Download the latest release for your platform from the [Releases page](https://github.com/anthropics/note-desk/releases).

- **macOS**: Download the `.dmg`, open it, drag FOSSPad to Applications.
- **Linux**: Download the `.AppImage` (portable) or `.deb` (Debian/Ubuntu).
- **Windows**: Download the `.exe` installer or `.msi`.

For platform-specific details (like macOS quarantine removal), see [installation.md](installation.md).

## 2. Choose a Workspace

When you first launch FOSSPad, you'll see the Welcome screen. Either:

- **Create a new workspace** — Pick an empty folder (or a new path) where your notes will be stored.
- **Open an existing workspace** — Point to a folder that already contains notebook directories with `.md` files.

The workspace is just a regular folder. You can browse it in your file manager, edit files with another editor, or put it under Git version control.

## 3. Create a Notebook

Click the **+** button on the notebook tab bar. Give it a name and choose a tab color. FOSSPad will create:

- A folder named after your notebook (lowercased, special characters replaced with dashes)
- A `.notebook.json` metadata file inside it
- A default "General" section with an "Untitled" page

## 4. Start Writing

Click any page in the sidebar to open it. The editor shows rendered Markdown by default.

- **Click a block** to switch to raw Markdown editing.
- **Click away** or press **Escape** to commit and re-render.
- **Tab** inserts spaces inside code blocks.
- Changes **auto-save** after 1.5 seconds of inactivity.

## 5. Organize Your Notes

- **Notebooks** are top-level categories (shown as colored tabs at the top).
- **Sections** are sub-categories within a notebook (tab bar below notebooks).
- **Pages** are individual Markdown files (sidebar list).

Right-click items for rename, delete, and import options.

## 6. Tag Your Pages

Click the tag icon next to the page title in the editor toolbar. Tags are stored as YAML front-matter in the Markdown file:

```yaml
---
tags:
  - meeting
  - project-alpha
---
```

Use the Search panel to filter pages by tag.

## 7. Set Up Git Sync (Optional)

Open **Settings → Git** to:

1. Initialize a Git repository in your workspace.
2. Set a remote URL (GitHub, GitLab, etc.).
3. Configure authentication (SSH key or encrypted HTTPS token).
4. Enable **auto-push** to sync on a schedule (5 min, 15 min, 30 min, or 1 hour).
5. Manually commit & push or pull at any time.

## 8. Customize the Theme

Open **Settings → Theme** to pick a preset (Light, Dark, Solarized, Nord) or define your own colors. Changes apply instantly and are saved per-workspace.

## Next Steps

- [Installation details](installation.md) — Platform-specific notes and troubleshooting
- [Architecture](architecture.md) — How the codebase is structured
- [Development](development.md) — Building from source and contributing

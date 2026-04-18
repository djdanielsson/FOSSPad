import { useState, useEffect, useCallback } from "react";
import { useWorkspace } from "./hooks/useWorkspace";
import NotebookTabs from "./components/NotebookTabs";
import SectionTabs from "./components/SectionTabs";
import PageList from "./components/PageList";
import Editor from "./components/Editor";
import WelcomeScreen from "./components/WelcomeScreen";
import SettingsPanel from "./components/SettingsPanel";
import SearchPanel from "./components/SearchPanel";
import * as api from "./utils/api";
import type { Settings, ThemeSettings } from "./utils/api";
import type { Workspace } from "./types";

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function mixHex(a: string, b: string, t: number): string {
  const A = parseHex(a);
  const B = parseHex(b);
  if (!A || !B) return a;
  const r = Math.round(A.r + (B.r - A.r) * t);
  const g = Math.round(A.g + (B.g - A.g) * t);
  const bl = Math.round(A.b + (B.b - A.b) * t);
  return `#${[r, g, bl].map(x => x.toString(16).padStart(2, "0")).join("")}`;
}

function darkenHex(hex: string, amount: number): string {
  const p = parseHex(hex);
  if (!p) return hex;
  const r = Math.round(p.r * (1 - amount));
  const g = Math.round(p.g * (1 - amount));
  const b = Math.round(p.b * (1 - amount));
  return `#${[r, g, b].map(x => x.toString(16).padStart(2, "0")).join("")}`;
}

function luminance(hex: string): number {
  const p = parseHex(hex);
  if (!p) return 0.5;
  return (0.299 * p.r + 0.587 * p.g + 0.114 * p.b) / 255;
}

function applyTheme(theme: ThemeSettings): void {
  const root = document.documentElement.style;
  const allVars = [
    "--bg-primary", "--bg-secondary", "--bg-tertiary",
    "--bg-hover", "--bg-active",
    "--text-primary", "--text-secondary", "--text-muted",
    "--border-color", "--border-subtle",
    "--accent", "--accent-hover", "--accent-light",
  ] as const;

  const hasValues = theme.bg_primary || theme.bg_secondary || theme.bg_tertiary
    || theme.text_primary || theme.text_secondary || theme.accent;

  if (!hasValues) {
    allVars.forEach(k => root.removeProperty(k));
    return;
  }

  const keys: (keyof ThemeSettings)[] = [
    "bg_primary", "bg_secondary", "bg_tertiary",
    "text_primary", "text_secondary", "accent",
  ];
  for (const key of keys) {
    const value = theme[key];
    const cssName = `--${String(key).replace(/_/g, "-")}`;
    if (value) {
      root.setProperty(cssName, value);
    } else {
      root.removeProperty(cssName);
    }
  }

  const isDark = theme.bg_primary ? luminance(theme.bg_primary) < 0.45 : false;

  if (theme.bg_primary) {
    if (isDark) {
      root.setProperty("--bg-hover", mixHex(theme.bg_primary, "#ffffff", 0.08));
      root.setProperty("--bg-active", mixHex(theme.bg_primary, "#ffffff", 0.16));
      root.setProperty("--border-color", mixHex(theme.bg_primary, "#ffffff", 0.14));
      root.setProperty("--border-subtle", mixHex(theme.bg_primary, "#ffffff", 0.08));
    } else {
      root.setProperty("--bg-hover", darkenHex(theme.bg_primary, 0.04));
      root.setProperty("--bg-active", darkenHex(theme.bg_primary, 0.12));
      root.setProperty("--border-color", darkenHex(theme.bg_primary, 0.08));
      root.setProperty("--border-subtle", darkenHex(theme.bg_primary, 0.04));
    }
  }

  if (theme.text_primary) {
    root.setProperty("--text-muted", mixHex(theme.text_primary, theme.bg_primary ?? "#1a1a1a", 0.5));
  }

  if (theme.accent) {
    root.setProperty("--accent-hover", darkenHex(theme.accent, 0.12));
    if (isDark) {
      root.setProperty("--accent-light", mixHex(theme.accent, theme.bg_primary ?? "#1e1e2e", 0.75));
    } else {
      root.setProperty("--accent-light", mixHex(theme.accent, "#ffffff", 0.88));
    }
  } else {
    root.removeProperty("--accent-hover");
    root.removeProperty("--accent-light");
  }
}

function slugify(name: string): string {
  return name.split("").map(c => (/[a-zA-Z0-9\-_]/.test(c) ? c : "-")).join("").toLowerCase();
}

function notebookDisplayNameFromFolder(workspace: Workspace, folder: string): string | null {
  for (const nb of workspace.notebooks) {
    if (slugify(nb.name) === folder) return nb.name;
  }
  return null;
}

export default function App() {
  const { workspace, selectNotebook, selectSection, selectPage } = useWorkspace();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    if (!workspace?.path) return;
    let cancelled = false;
    void api.loadSettings(workspace.path).then(s => {
      if (!cancelled) {
        setSettings(s);
        applyTheme(s.theme);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [workspace?.path]);

  const handleSettingsChange = useCallback((next: Settings) => {
    setSettings(next);
    applyTheme(next.theme);
  }, []);

  useEffect(() => {
    const path = workspace?.path;
    if (!path || !settings?.git.auto_push_enabled) return;
    const minutes = settings.git.auto_push_interval_minutes;
    const ms = Math.max(1, minutes) * 60 * 1000;
    const id = window.setInterval(() => {
      void api.gitCommitAndPush(path, "auto-save");
    }, ms);
    return () => clearInterval(id);
  }, [workspace?.path, settings?.git.auto_push_enabled, settings?.git.auto_push_interval_minutes]);

  const handleSearchNavigate = useCallback(
    (notebookFolder: string, section: string, filename: string) => {
      if (!workspace) return;
      const displayName = notebookDisplayNameFromFolder(workspace, notebookFolder);
      if (!displayName) return;
      const nb = workspace.notebooks.find(n => n.name === displayName);
      const sec = nb?.sections.find(s => s.name === section);
      const page = sec?.pages.find(p => p.filename === filename);
      if (!page) return;
      selectNotebook(displayName);
      window.setTimeout(() => {
        selectSection(section);
        window.setTimeout(() => {
          selectPage(page);
        }, 0);
      }, 0);
    },
    [workspace, selectNotebook, selectSection, selectPage]
  );

  if (!workspace) {
    return <WelcomeScreen />;
  }

  return (
    <div className="app-layout">
      <header className="app-header">
        <span className="app-header-title">NoteDesk</span>
        <div className="app-header-actions">
          <button
            type="button"
            className="app-header-btn"
            aria-label="Search"
            onClick={() => setSearchOpen(o => !o)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <button
            type="button"
            className="app-header-btn"
            aria-label="Settings"
            onClick={() => setSettingsOpen(o => !o)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      </header>
      <NotebookTabs />
      <SectionTabs />
      <div className="app-body">
        <PageList />
        <Editor />
      </div>
      {settings && (
        <SettingsPanel
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          workspacePath={workspace.path}
          settings={settings}
          onSettingsChange={handleSettingsChange}
        />
      )}
      <SearchPanel
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        workspacePath={workspace.path}
        onNavigate={handleSearchNavigate}
      />
    </div>
  );
}

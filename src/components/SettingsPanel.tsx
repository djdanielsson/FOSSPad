import { useCallback, useEffect, useMemo, useState } from "react";
import * as api from "../utils/api";
import type { Settings, ThemeSettings, GitSettings, GitStatus } from "../utils/api";
import "./SettingsPanel.css";

const PRESET_LIGHT: Required<ThemeSettings> = {
  bg_primary: "#f3f2f1",
  bg_secondary: "#ffffff",
  bg_tertiary: "#e8e6e3",
  text_primary: "#1a1a1a",
  text_secondary: "#605e5c",
  accent: "#7B68EE",
};

const PRESET_DARK: Required<ThemeSettings> = {
  bg_primary: "#1e1e2e",
  bg_secondary: "#282840",
  bg_tertiary: "#313147",
  text_primary: "#cdd6f4",
  text_secondary: "#a6adc8",
  accent: "#cba6f7",
};

const PRESET_SOLARIZED: Required<ThemeSettings> = {
  bg_primary: "#fdf6e3",
  bg_secondary: "#eee8d5",
  bg_tertiary: "#e4dcc8",
  text_primary: "#073642",
  text_secondary: "#586e75",
  accent: "#268bd2",
};

const PRESET_NORD: Required<ThemeSettings> = {
  bg_primary: "#2e3440",
  bg_secondary: "#3b4252",
  bg_tertiary: "#434c5e",
  text_primary: "#eceff4",
  text_secondary: "#d8dee9",
  accent: "#88c0d0",
};

const PRESETS: { id: string; label: string; theme: Required<ThemeSettings> }[] = [
  { id: "light", label: "Light", theme: PRESET_LIGHT },
  { id: "dark", label: "Dark", theme: PRESET_DARK },
  { id: "solarized", label: "Solarized", theme: PRESET_SOLARIZED },
  { id: "nord", label: "Nord", theme: PRESET_NORD },
];

const AUTO_PUSH_OPTIONS = [
  { minutes: 5, label: "5 minutes" },
  { minutes: 15, label: "15 minutes" },
  { minutes: 30, label: "30 minutes" },
  { minutes: 60, label: "1 hour" },
];

function resolveTheme(theme: ThemeSettings): Required<ThemeSettings> {
  return {
    bg_primary: theme.bg_primary ?? PRESET_LIGHT.bg_primary,
    bg_secondary: theme.bg_secondary ?? PRESET_LIGHT.bg_secondary,
    bg_tertiary: theme.bg_tertiary ?? PRESET_LIGHT.bg_tertiary,
    text_primary: theme.text_primary ?? PRESET_LIGHT.text_primary,
    text_secondary: theme.text_secondary ?? PRESET_LIGHT.text_secondary,
    accent: theme.accent ?? PRESET_LIGHT.accent,
  };
}

function isThemeEmpty(theme: ThemeSettings): boolean {
  return (
    theme.bg_primary == null &&
    theme.bg_secondary == null &&
    theme.bg_tertiary == null &&
    theme.text_primary == null &&
    theme.text_secondary == null &&
    theme.accent == null
  );
}

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

/** Returns normalized #rrggbb when input is a complete hex, else null. */
function normalizeColorInput(raw: string): string | null {
  const t = raw.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(t)) return t;
  if (/^[0-9a-fA-F]{6}$/.test(t)) return `#${t}`;
  return null;
}

function luminance(hex: string): number {
  const p = parseHex(hex);
  if (!p) return 0.5;
  return (0.299 * p.r + 0.587 * p.g + 0.114 * p.b) / 255;
}

function applyThemeToDocument(theme: ThemeSettings): void {
  const root = document.documentElement.style;
  const allVars = [
    "--bg-primary", "--bg-secondary", "--bg-tertiary",
    "--bg-hover", "--bg-active",
    "--text-primary", "--text-secondary", "--text-muted",
    "--border-color", "--border-subtle",
    "--accent", "--accent-hover", "--accent-light",
  ] as const;

  if (isThemeEmpty(theme)) {
    allVars.forEach(k => root.removeProperty(k));
    return;
  }

  const r = resolveTheme(theme);
  root.setProperty("--bg-primary", r.bg_primary);
  root.setProperty("--bg-secondary", r.bg_secondary);
  root.setProperty("--bg-tertiary", r.bg_tertiary);
  root.setProperty("--text-primary", r.text_primary);
  root.setProperty("--text-secondary", r.text_secondary);
  root.setProperty("--accent", r.accent);
  root.setProperty("--accent-hover", darkenHex(r.accent, 0.12));

  const isDark = luminance(r.bg_primary) < 0.45;

  if (isDark) {
    root.setProperty("--bg-hover", mixHex(r.bg_primary, "#ffffff", 0.08));
    root.setProperty("--bg-active", mixHex(r.bg_primary, "#ffffff", 0.16));
    root.setProperty("--border-color", mixHex(r.bg_primary, "#ffffff", 0.14));
    root.setProperty("--border-subtle", mixHex(r.bg_primary, "#ffffff", 0.08));
    root.setProperty("--accent-light", mixHex(r.accent, r.bg_primary, 0.75));
  } else {
    root.setProperty("--bg-hover", darkenHex(r.bg_primary, 0.04));
    root.setProperty("--bg-active", darkenHex(r.bg_primary, 0.12));
    root.setProperty("--border-color", darkenHex(r.bg_primary, 0.08));
    root.setProperty("--border-subtle", darkenHex(r.bg_primary, 0.04));
    root.setProperty("--accent-light", mixHex(r.accent, "#ffffff", 0.88));
  }

  root.setProperty("--text-muted", mixHex(r.text_primary, r.bg_primary, 0.5));
}

export interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  workspacePath: string;
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
}

export default function SettingsPanel({
  open,
  onClose,
  workspacePath,
  settings,
  onSettingsChange,
}: SettingsPanelProps) {
  const [tab, setTab] = useState<"theme" | "git">("theme");
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [remoteDraft, setRemoteDraft] = useState("");
  const [cloneUrl, setCloneUrl] = useState("");
  const [commitMessage, setCommitMessage] = useState("");
  const [gitMessage, setGitMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [gitBusy, setGitBusy] = useState(false);
  const [themeInputDraft, setThemeInputDraft] = useState<Partial<Record<keyof ThemeSettings, string>>>({});
  const [sshKeyDraft, setSshKeyDraft] = useState("");
  const [gpgKeyDraft, setGpgKeyDraft] = useState("");
  const [credUserDraft, setCredUserDraft] = useState("");
  const [credTokenDraft, setCredTokenDraft] = useState("");
  const [hasStoredUser, setHasStoredUser] = useState(false);
  const [hasStoredToken, setHasStoredToken] = useState(false);

  const resolved = useMemo(() => resolveTheme(settings.theme), [settings.theme]);

  const persistSettings = useCallback(
    async (next: Settings) => {
      await api.saveSettings(workspacePath, next);
      onSettingsChange(next);
      applyThemeToDocument(next.theme);
    },
    [workspacePath, onSettingsChange]
  );

  const refreshGitStatus = useCallback(async () => {
    try {
      const s = await api.gitStatus(workspacePath);
      setGitStatus(s);
    } catch (e) {
      setGitStatus(null);
      setGitMessage({ kind: "err", text: e instanceof Error ? e.message : String(e) });
    }
  }, [workspacePath]);

  useEffect(() => {
    if (!open) return;
    applyThemeToDocument(settings.theme);
  }, [open, settings.theme]);

  useEffect(() => {
    if (!open) return;
    setRemoteDraft(settings.git.remote_url ?? "");
    setSshKeyDraft(settings.git.ssh_key_path ?? "");
    setGpgKeyDraft(settings.git.gpg_key_path ?? "");
    setCredUserDraft("");
    setCredTokenDraft("");
    setGitMessage(null);
    setThemeInputDraft({});
    refreshGitStatus();
    void api.loadGitCredentials(workspacePath).then(([hasU, hasT]) => {
      setHasStoredUser(hasU);
      setHasStoredToken(hasT);
    });
  }, [open, workspacePath, settings.git.remote_url, settings.git.ssh_key_path, settings.git.gpg_key_path, refreshGitStatus]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const updateThemeField = async (key: keyof ThemeSettings, hex: string) => {
    const nextTheme: ThemeSettings = {
      ...settings.theme,
      [key]: hex,
    };
    const next: Settings = { ...settings, theme: nextTheme };
    await persistSettings(next);
  };

  const applyPreset = async (preset: Required<ThemeSettings>) => {
    const next: Settings = {
      ...settings,
      theme: { ...preset },
    };
    await persistSettings(next);
  };

  const resetThemeDefaults = async () => {
    const next: Settings = {
      ...settings,
      theme: {},
    };
    await persistSettings(next);
  };

  const updateGitSettings = async (partial: Partial<GitSettings>) => {
    const next: Settings = {
      ...settings,
      git: { ...settings.git, ...partial },
    };
    await persistSettings(next);
  };

  const saveRemote = async () => {
    setGitBusy(true);
    setGitMessage(null);
    try {
      const url = remoteDraft.trim();
      const next: Settings = {
        ...settings,
        git: { ...settings.git, remote_url: url || undefined },
      };
      await api.saveSettings(workspacePath, next);
      onSettingsChange(next);
      if (gitStatus?.is_repo && url) {
        const out = await api.gitSetRemote(workspacePath, url);
        setGitMessage({ kind: "ok", text: out || "Remote saved." });
      } else {
        setGitMessage({ kind: "ok", text: "Remote URL saved to settings." });
      }
      applyThemeToDocument(next.theme);
    } catch (e) {
      setGitMessage({ kind: "err", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setGitBusy(false);
    }
  };

  const saveSshKey = async () => {
    await updateGitSettings({ ssh_key_path: sshKeyDraft.trim() || undefined });
    setGitMessage({ kind: "ok", text: "SSH key path saved." });
  };

  const saveGpgKey = async () => {
    await updateGitSettings({ gpg_key_path: gpgKeyDraft.trim() || undefined });
    setGitMessage({ kind: "ok", text: "GPG key path saved." });
  };

  const saveCredentials = async () => {
    setGitBusy(true);
    setGitMessage(null);
    try {
      await api.saveGitCredentials(
        workspacePath,
        credUserDraft.trim() || null,
        credTokenDraft.trim() || null,
      );
      await updateGitSettings({ auth_method: "token" });
      setCredUserDraft("");
      setCredTokenDraft("");
      const [hasU, hasT] = await api.loadGitCredentials(workspacePath);
      setHasStoredUser(hasU);
      setHasStoredToken(hasT);
      setGitMessage({ kind: "ok", text: "Credentials saved (encrypted)." });
    } catch (e) {
      setGitMessage({ kind: "err", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setGitBusy(false);
    }
  };

  const clearCredentials = async () => {
    setGitBusy(true);
    try {
      await api.clearGitCredentials(workspacePath);
      await updateGitSettings({ auth_method: undefined });
      setHasStoredUser(false);
      setHasStoredToken(false);
      setGitMessage({ kind: "ok", text: "Credentials cleared." });
    } catch (e) {
      setGitMessage({ kind: "err", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setGitBusy(false);
    }
  };

  const runGit = async (label: string, fn: () => Promise<string>) => {
    setGitBusy(true);
    setGitMessage(null);
    try {
      const out = await fn();
      setGitMessage({ kind: "ok", text: out || `${label} completed.` });
      await refreshGitStatus();
    } catch (e) {
      setGitMessage({ kind: "err", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setGitBusy(false);
    }
  };

  const handleInit = () =>
    runGit("Init", () => api.gitInit(workspacePath));

  const handleClone = () =>
    runGit("Clone", () => {
      const u = cloneUrl.trim();
      if (!u) throw new Error("Enter a repository URL to clone.");
      return api.gitClone(u, workspacePath);
    });

  const handleCommitPush = () =>
    runGit("Commit & push", () => api.gitCommitAndPush(workspacePath, commitMessage.trim()));

  const handlePull = () => runGit("Pull", () => api.gitPull(workspacePath));

  if (!open) return null;

  return (
    <div
      className="settings-overlay"
      role="presentation"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        className="settings-panel"
        role="dialog"
        aria-label="Settings"
        onMouseDown={e => e.stopPropagation()}
      >
        <header className="settings-header">
          <h2 className="settings-title">Settings</h2>
          <button type="button" className="settings-close btn btn-secondary" onClick={onClose} aria-label="Close settings">
            ✕
          </button>
        </header>

        <div className="settings-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "theme"}
            className={`settings-tab ${tab === "theme" ? "active" : ""}`}
            onClick={() => setTab("theme")}
          >
            Theme
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "git"}
            className={`settings-tab ${tab === "git" ? "active" : ""}`}
            onClick={() => setTab("git")}
          >
            Git
          </button>
        </div>

        <div className="settings-body">
          {tab === "theme" && (
            <div className="settings-section" role="tabpanel">
              <div className="settings-section-head">
                <h3 className="settings-section-title">Preset themes</h3>
                <p className="settings-section-desc">Apply a curated palette. You can still tweak colors below.</p>
              </div>
              <div className="settings-preset-grid">
                {PRESETS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    className="settings-preset-card"
                    onClick={() => applyPreset(p.theme)}
                  >
                    <span className="settings-preset-name">{p.label}</span>
                    <span className="settings-preset-swatches">
                      <span className="settings-swatch" style={{ background: p.theme.bg_primary }} />
                      <span className="settings-swatch" style={{ background: p.theme.bg_secondary }} />
                      <span className="settings-swatch" style={{ background: p.theme.accent }} />
                    </span>
                  </button>
                ))}
              </div>

              <div className="settings-section-head settings-section-head-spaced">
                <h3 className="settings-section-title">Custom colors</h3>
                <p className="settings-section-desc">Changes apply immediately and are saved to this workspace.</p>
              </div>

              <div className="settings-color-list">
                {(
                  [
                    ["bg_primary", "Background primary", resolved.bg_primary],
                    ["bg_secondary", "Background secondary", resolved.bg_secondary],
                    ["bg_tertiary", "Background tertiary", resolved.bg_tertiary],
                    ["text_primary", "Text primary", resolved.text_primary],
                    ["text_secondary", "Text secondary", resolved.text_secondary],
                    ["accent", "Accent", resolved.accent],
                  ] as const
                ).map(([key, label, val]) => {
                  const draft = themeInputDraft[key];
                  const stored = settings.theme[key];
                  const display = draft ?? stored ?? val;
                  const previewHex = normalizeColorInput(draft ?? "") ?? stored ?? val;
                  return (
                    <label key={key} className="settings-color-row">
                      <span className="settings-color-label">{label}</span>
                      <div className="settings-color-input-wrap">
                        <span className="settings-color-preview" style={{ background: previewHex }} title={previewHex} />
                        <input
                          type="text"
                          className="modal-input settings-color-input"
                          value={display}
                          onChange={e => {
                            const v = e.target.value;
                            setThemeInputDraft(prev => ({ ...prev, [key]: v }));
                            const n = normalizeColorInput(v);
                            if (n) {
                              const nextTheme: ThemeSettings = { ...settings.theme, [key]: n };
                              applyThemeToDocument(nextTheme);
                              void updateThemeField(key, n);
                              setThemeInputDraft(prev => {
                                const next = { ...prev };
                                delete next[key];
                                return next;
                              });
                            }
                          }}
                          onBlur={() => {
                            const raw = themeInputDraft[key];
                            if (raw === undefined) return;
                            const n = normalizeColorInput(raw);
                            setThemeInputDraft(prev => {
                              const next = { ...prev };
                              delete next[key];
                              return next;
                            });
                            if (n) {
                              void updateThemeField(key, n);
                            } else {
                              applyThemeToDocument(settings.theme);
                            }
                          }}
                        />
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="settings-actions">
                <button type="button" className="btn btn-secondary" onClick={() => resetThemeDefaults()}>
                  Reset to defaults
                </button>
              </div>
            </div>
          )}

          {tab === "git" && (
            <div className="settings-section" role="tabpanel">
              {!gitStatus?.is_repo && (
                <div className="settings-git-banner">
                  <h3 className="settings-section-title">No Git repository</h3>
                  <p className="settings-section-desc">
                    Initialize a new repo in this workspace, or clone an existing remote into this folder.
                  </p>
                  <div className="settings-git-banner-actions">
                    <button type="button" className="btn btn-primary" disabled={gitBusy} onClick={handleInit}>
                      Init repository
                    </button>
                  </div>
                  <div className="settings-clone-block">
                    <label className="settings-field-label">Clone URL</label>
                    <div className="settings-inline">
                      <input
                        type="text"
                        className="modal-input"
                        placeholder="https://github.com/user/repo.git"
                        value={cloneUrl}
                        onChange={e => setCloneUrl(e.target.value)}
                      />
                      <button type="button" className="btn btn-primary" disabled={gitBusy} onClick={handleClone}>
                        Clone
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {gitStatus && (
                <div className="settings-git-status-card">
                  <h3 className="settings-section-title">Repository status</h3>
                  {gitStatus.is_repo ? (
                    <ul className="settings-git-status-list">
                      <li>
                        <span className="settings-git-k">Branch</span>
                        <span className="settings-git-v">{gitStatus.branch || "—"}</span>
                      </li>
                      <li>
                        <span className="settings-git-k">Changed files</span>
                        <span className="settings-git-v">{gitStatus.changed_files}</span>
                      </li>
                      <li>
                        <span className="settings-git-k">Ahead / behind</span>
                        <span className="settings-git-v">
                          {gitStatus.ahead} / {gitStatus.behind}
                        </span>
                      </li>
                    </ul>
                  ) : (
                    <p className="settings-muted">Not a Git repository.</p>
                  )}
                </div>
              )}

              {gitStatus?.is_repo && (
                <>
                  <div className="settings-section-head settings-section-head-spaced">
                    <h3 className="settings-section-title">Remote</h3>
                    <p className="settings-section-desc">Stored in settings and applied to <code>origin</code> when you save.</p>
                  </div>
                  <div className="settings-inline">
                    <input
                      type="text"
                      className="modal-input"
                      placeholder="https://github.com/user/repo.git"
                      value={remoteDraft}
                      onChange={e => setRemoteDraft(e.target.value)}
                    />
                    <button type="button" className="btn btn-primary" disabled={gitBusy} onClick={saveRemote}>
                      Save remote
                    </button>
                  </div>

                  <div className="settings-section-head settings-section-head-spaced">
                    <h3 className="settings-section-title">Auto-push</h3>
                    <p className="settings-section-desc">Periodically push when the workspace is idle (uses saved interval).</p>
                  </div>
                  <label className="settings-checkbox-row">
                    <input
                      type="checkbox"
                      checked={settings.git.auto_push_enabled}
                      onChange={e => updateGitSettings({ auto_push_enabled: e.target.checked })}
                    />
                    <span>Enable auto-push</span>
                  </label>
                  <label className="settings-field-label">Interval</label>
                  <select
                    className="modal-input settings-select"
                    value={
                      AUTO_PUSH_OPTIONS.some(o => o.minutes === settings.git.auto_push_interval_minutes)
                        ? settings.git.auto_push_interval_minutes
                        : 60
                    }
                    onChange={e => updateGitSettings({ auto_push_interval_minutes: Number(e.target.value) })}
                  >
                    {AUTO_PUSH_OPTIONS.map(o => (
                      <option key={o.minutes} value={o.minutes}>
                        {o.label}
                      </option>
                    ))}
                  </select>

                  <div className="settings-section-head settings-section-head-spaced">
                    <h3 className="settings-section-title">Actions</h3>
                  </div>
                  <label className="settings-field-label">Commit message</label>
                  <input
                    type="text"
                    className="modal-input"
                    placeholder="Optional — defaults to “Update”"
                    value={commitMessage}
                    onChange={e => setCommitMessage(e.target.value)}
                  />
                  <div className="settings-git-actions">
                    <button type="button" className="btn btn-primary" disabled={gitBusy} onClick={handleCommitPush}>
                      Commit &amp; push
                    </button>
                    <button type="button" className="btn btn-secondary" disabled={gitBusy} onClick={handlePull}>
                      Pull
                    </button>
                    <button type="button" className="btn btn-secondary" disabled={gitBusy} onClick={handleInit}>
                      Init repository
                    </button>
                  </div>
                </>
              )}

              <div className="settings-section-head settings-section-head-spaced">
                <h3 className="settings-section-title">Authentication</h3>
                <p className="settings-section-desc">
                  Set credentials for private repos. Username &amp; token are stored encrypted—never in plain text.
                </p>
              </div>

              <label className="settings-field-label">Auth method</label>
              <select
                className="modal-input settings-select"
                value={settings.git.auth_method ?? "ssh"}
                onChange={e => updateGitSettings({ auth_method: e.target.value || undefined })}
              >
                <option value="ssh">SSH key</option>
                <option value="token">Username / token (HTTPS)</option>
              </select>

              {settings.git.auth_method === "token" && (
                <div className="settings-cred-block">
                  <label className="settings-field-label">
                    Username {hasStoredUser && <span className="settings-cred-badge">saved</span>}
                  </label>
                  <input
                    type="text"
                    className="modal-input"
                    placeholder={hasStoredUser ? "(stored — enter new value to replace)" : "GitHub username"}
                    value={credUserDraft}
                    onChange={e => setCredUserDraft(e.target.value)}
                  />
                  <label className="settings-field-label">
                    Token / password {hasStoredToken && <span className="settings-cred-badge">saved</span>}
                  </label>
                  <input
                    type="password"
                    className="modal-input"
                    placeholder={hasStoredToken ? "(stored — enter new value to replace)" : "Personal access token"}
                    value={credTokenDraft}
                    onChange={e => setCredTokenDraft(e.target.value)}
                    autoComplete="off"
                  />
                  <div className="settings-git-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={gitBusy || (!credUserDraft.trim() && !credTokenDraft.trim())}
                      onClick={saveCredentials}
                    >
                      Save credentials
                    </button>
                    {(hasStoredUser || hasStoredToken) && (
                      <button type="button" className="btn btn-danger" disabled={gitBusy} onClick={clearCredentials}>
                        Clear stored
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="settings-section-head settings-section-head-spaced">
                <h3 className="settings-section-title">SSH key</h3>
                <p className="settings-section-desc">Path to your private key (used with SSH remotes).</p>
              </div>
              <div className="settings-inline">
                <input
                  type="text"
                  className="modal-input"
                  placeholder="~/.ssh/id_ed25519"
                  value={sshKeyDraft}
                  onChange={e => setSshKeyDraft(e.target.value)}
                />
                <button type="button" className="btn btn-primary" disabled={gitBusy} onClick={saveSshKey}>
                  Save
                </button>
              </div>

              <div className="settings-section-head settings-section-head-spaced">
                <h3 className="settings-section-title">GPG key</h3>
                <p className="settings-section-desc">Path to GPG home directory for signed commits.</p>
              </div>
              <div className="settings-inline">
                <input
                  type="text"
                  className="modal-input"
                  placeholder="~/.gnupg"
                  value={gpgKeyDraft}
                  onChange={e => setGpgKeyDraft(e.target.value)}
                />
                <button type="button" className="btn btn-primary" disabled={gitBusy} onClick={saveGpgKey}>
                  Save
                </button>
              </div>
            </div>
          )}
        </div>

        {tab === "git" && gitMessage && (
          <div className={`settings-footer-msg ${gitMessage.kind === "err" ? "is-error" : "is-ok"}`}>
            {gitMessage.text}
          </div>
        )}
      </aside>
    </div>
  );
}

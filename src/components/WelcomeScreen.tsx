import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useWorkspace } from "../hooks/useWorkspace";
import * as api from "../utils/api";
import "./WelcomeScreen.css";

export default function WelcomeScreen() {
  const { setWorkspacePath } = useWorkspace();
  const [path, setPath] = useState("");
  const [error, setError] = useState("");
  const [recentPaths] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("notedesk-recent");
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const handleOpen = async (p: string) => {
    if (!p.trim()) return;
    setError("");
    try {
      const expanded = await api.expandTilde(p.trim());
      try {
        const recent = [expanded, ...recentPaths.filter(r => r !== expanded)].slice(0, 5);
        localStorage.setItem("notedesk-recent", JSON.stringify(recent));
      } catch {}
      setWorkspacePath(expanded);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleBrowse = async () => {
    setError("");
    try {
      const selected = await open({ directory: true, multiple: false, title: "Choose workspace folder" });
      if (selected && typeof selected === "string") {
        setPath(selected);
        try {
          const recent = [selected, ...recentPaths.filter(r => r !== selected)].slice(0, 5);
          localStorage.setItem("notedesk-recent", JSON.stringify(recent));
        } catch {}
        setWorkspacePath(selected);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="welcome-screen">
      <div className="welcome-card">
        <div className="welcome-logo">
          <svg width="56" height="56" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="4" width="48" height="56" rx="4" fill="#7B68EE" />
            <rect x="14" y="10" width="36" height="44" rx="2" fill="#fff" />
            <line x1="20" y1="22" x2="44" y2="22" stroke="#7B68EE" strokeWidth="1.5" />
            <line x1="20" y1="30" x2="44" y2="30" stroke="#7B68EE" strokeWidth="1.5" />
            <line x1="20" y1="38" x2="36" y2="38" stroke="#7B68EE" strokeWidth="1.5" />
            <rect x="4" y="12" width="6" height="8" rx="1" fill="#5B4ACF" />
            <rect x="4" y="24" width="6" height="8" rx="1" fill="#9B89FF" />
            <rect x="4" y="36" width="6" height="8" rx="1" fill="#BDB0FF" />
          </svg>
        </div>
        <h1>NoteDesk</h1>
        <p className="welcome-subtitle">
          Your notebooks, powered by Markdown.
        </p>

        <div className="welcome-input-group">
          <label>Open a workspace folder</label>
          <div className="welcome-browse-row">
            <button className="btn btn-primary welcome-browse-btn" onClick={handleBrowse}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 3.5A1.5 1.5 0 013.5 2h3.379a1.5 1.5 0 011.06.44l.622.62a1.5 1.5 0 001.06.44H12.5A1.5 1.5 0 0114 5v7.5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 12.5v-9z" stroke="currentColor" strokeWidth="1.2"/>
              </svg>
              Browse for folder
            </button>
          </div>
          <div className="welcome-divider">
            <span>or type a path</span>
          </div>
          <div className="welcome-input-row">
            <input
              type="text"
              placeholder="~/Documents/my-notes"
              value={path}
              onChange={e => setPath(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleOpen(path)}
              className="modal-input"
            />
            <button className="btn btn-secondary" onClick={() => handleOpen(path)}>
              Open
            </button>
          </div>
          {error && <p className="welcome-error">{error}</p>}
          <p className="welcome-hint">
            This folder will contain your notebook directories with Markdown files.
            Perfect for committing to a Git repository.
          </p>
        </div>

        {recentPaths.length > 0 && (
          <div className="welcome-recent">
            <h4>Recent</h4>
            {recentPaths.map(p => (
              <button key={p} className="recent-item" onClick={() => handleOpen(p)}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 3.5A1.5 1.5 0 013.5 2h3.379a1.5 1.5 0 011.06.44l.622.62a1.5 1.5 0 001.06.44H12.5A1.5 1.5 0 0114 5v7.5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 12.5v-9z" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

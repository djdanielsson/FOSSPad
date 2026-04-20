import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useWorkspace } from "../hooks/useWorkspace";
import * as api from "../utils/api";
import "./WelcomeScreen.css";

export default function WelcomeScreen() {
  const { setWorkspacePath } = useWorkspace();
  const [path, setPath] = useState("");
  const [error, setError] = useState("");
  const [offerCreate, setOfferCreate] = useState<string | null>(null);
  const [recentPaths] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("notedesk-recent");
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const saveRecent = (resolvedPath: string) => {
    try {
      const recent = [resolvedPath, ...recentPaths.filter(r => r !== resolvedPath)].slice(0, 5);
      localStorage.setItem("notedesk-recent", JSON.stringify(recent));
    } catch {}
  };

  const openWorkspace = async (resolvedPath: string) => {
    setError("");
    setOfferCreate(null);
    try {
      await setWorkspacePath(resolvedPath);
      saveRecent(resolvedPath);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("does not exist")) {
        setOfferCreate(resolvedPath);
        setError("");
      } else {
        setError(msg);
      }
    }
  };

  const handleCreate = async () => {
    if (!offerCreate) return;
    setError("");
    try {
      const ws = await api.createWorkspace(offerCreate);
      saveRecent(ws.path);
      await setWorkspacePath(ws.path);
      setOfferCreate(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleOpen = async (p: string) => {
    if (!p.trim()) return;
    try {
      const expanded = await api.expandTilde(p.trim());
      await openWorkspace(expanded);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleBrowse = async () => {
    try {
      const selected = await open({ directory: true, multiple: false, title: "Choose workspace folder" });
      if (selected && typeof selected === "string") {
        setPath(selected);
        await openWorkspace(selected);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="welcome-screen">
      <div className="welcome-card">
        <div className="welcome-logo">
          <img src="/app-icon-112.png" alt="NoteDesk" width="112" height="112" />
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
          {offerCreate && (
            <div className="welcome-create-offer">
              <p>Folder does not exist. Create it?</p>
              <div className="welcome-create-actions">
                <button className="btn btn-primary btn-sm" onClick={handleCreate}>
                  Create &amp; open
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setOfferCreate(null)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
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

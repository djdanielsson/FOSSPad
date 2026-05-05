import { useState, useEffect, useCallback } from "react";
import { useWorkspace } from "../hooks/useWorkspace";
import CodeMirrorEditor from "./CodeMirrorEditor";
import TagEditor from "./TagEditor";
import * as api from "../utils/api";
import type { SearchResult } from "../utils/api";
import "./Editor.css";

function slugify(name: string): string {
  return name.split("").map(c => (/[a-zA-Z0-9\-_]/.test(c) ? c : "-")).join("").toLowerCase();
}

export default function Editor({ onWikiLinkNavigate }: { onWikiLinkNavigate?: (pageName: string) => void }) {
  const { content, setContent, active, loading, dirty, workspace } = useWorkspace();
  const [backlinks, setBacklinks] = useState<SearchResult[]>([]);
  const [backlinksOpen, setBacklinksOpen] = useState(true);

  useEffect(() => {
    if (!workspace?.path || !active.page?.name) {
      setBacklinks([]);
      return;
    }
    let cancelled = false;
    api.getBacklinks(workspace.path, active.page.name).then(results => {
      if (!cancelled) setBacklinks(results);
    }).catch(() => {
      if (!cancelled) setBacklinks([]);
    });
    return () => { cancelled = true; };
  }, [workspace?.path, active.page?.name]);

  const handleChange = useCallback((value: string) => {
    setContent(value);
  }, [setContent]);

  if (!active.page) {
    return (
      <div className="editor-empty">
        <div className="editor-empty-content">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="4" width="48" height="56" rx="4" fill="var(--bg-tertiary)" />
            <rect x="14" y="10" width="36" height="44" rx="2" fill="var(--bg-secondary)" />
            <path d="M22 24h20M22 32h20M22 40h12" stroke="var(--border-color)" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <h2>Select a page to start editing</h2>
          <p>Choose a page from the sidebar, or create a new one</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="editor-empty">
        <div className="editor-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="editor-container">
      <div className="editor-toolbar">
        <span className="editor-page-title">{active.page.name}</span>
        {workspace && active.notebook && active.section && active.page && (
          <TagEditor
            workspacePath={workspace.path}
            notebook={slugify(active.notebook)}
            section={active.section}
            filename={active.page.filename}
          />
        )}
        <div className="editor-toolbar-right">
          {dirty && <span className="save-indicator">Saving...</span>}
          {!dirty && <span className="save-indicator saved">Saved</span>}
        </div>
      </div>
      <div className="editor-scroll">
        <div className="editor-content">
          <CodeMirrorEditor
            key={`${active.notebook}-${active.section}-${active.page.filename}`}
            content={content}
            onChange={handleChange}
            onWikiLinkClick={onWikiLinkNavigate}
          />
        </div>
        {backlinks.length > 0 && (
          <div className="backlinks-panel">
            <button
              type="button"
              className="backlinks-toggle"
              onClick={() => setBacklinksOpen(o => !o)}
            >
              <span className={`backlinks-chevron ${backlinksOpen ? "open" : ""}`}>&#9654;</span>
              Backlinks ({backlinks.length})
            </button>
            {backlinksOpen && (
              <ul className="backlinks-list">
                {backlinks.map((bl, i) => (
                  <li
                    key={`${bl.filename}-${bl.line_number}-${i}`}
                    className="backlinks-item"
                    onClick={() => onWikiLinkNavigate?.(bl.page_name)}
                  >
                    <span className="backlinks-page">{bl.page_name}</span>
                    <span className="backlinks-context">{bl.line_content.trim()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useWorkspace } from "../hooks/useWorkspace";
import type { PageInfo } from "../types";
import "./PageList.css";

export default function PageList() {
  const {
    activeSection, active, selectPage, addPage,
    removePage, doRenamePage, importFiles, activeNotebook
  } = useWorkspace();
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [renamingPage, setRenamingPage] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; page: PageInfo } | null>(null);

  if (!activeSection || !activeNotebook) {
    return (
      <div className="page-list empty-state">
        <div className="empty-icon">📒</div>
        <p>Select a notebook and section to view pages</p>
      </div>
    );
  }

  const handleImport = async () => {
    try {
      const selected = await open({
        multiple: true,
        title: "Import Markdown files",
        filters: [{ name: "Markdown", extensions: ["md", "markdown", "txt"] }],
      });
      if (!selected) return;
      const paths = Array.isArray(selected) ? selected : [selected];
      const stringPaths = paths.filter((p): p is string => typeof p === "string");
      if (stringPaths.length > 0) {
        await importFiles(stringPaths);
      }
    } catch {
      // user cancelled
    }
  };

  const filteredPages = activeSection.pages.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await addPage(newName.trim());
    setNewName("");
    setShowNew(false);
  };

  const handleRename = async (page: PageInfo) => {
    if (!renameValue.trim() || renameValue.trim() === page.name) {
      setRenamingPage(null);
      return;
    }
    await doRenamePage(renameValue.trim());
    setRenamingPage(null);
  };

  const handleContextMenu = (e: React.MouseEvent, page: PageInfo) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, page });
  };

  const getPagePreview = (page: PageInfo) => {
    const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return date;
  };

  return (
    <div className="page-list">
      <div className="page-list-header">
        <h3 className="page-list-title" style={{ color: activeNotebook.color }}>
          {active.section}
        </h3>
        <button className="page-list-add" onClick={handleImport} title="Import files">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 3.5A1.5 1.5 0 013.5 2h3.379a1.5 1.5 0 011.06.44l.622.62a1.5 1.5 0 001.06.44H12.5A1.5 1.5 0 0114 5v7.5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 12.5v-9z" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M8 7v4M6 9h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </button>
        <button className="page-list-add" onClick={() => setShowNew(true)} title="New Page">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <div className="page-list-search-wrap">
        <svg className="search-icon" width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input
          className="page-list-search"
          placeholder="Search pages..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="page-list-items">
        {showNew && (
          <div className="page-item new-page-input-wrap">
            <input
              autoFocus
              className="new-page-input"
              placeholder="Page name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") { setShowNew(false); setNewName(""); }
              }}
              onBlur={() => { if (!newName.trim()) setShowNew(false); else handleCreate(); }}
            />
          </div>
        )}

        {filteredPages.map(page => (
          <div
            key={page.filename}
            className={`page-item ${active.page?.filename === page.filename ? "active" : ""}`}
            onClick={() => selectPage(page)}
            onContextMenu={(e) => handleContextMenu(e, page)}
          >
            {renamingPage === page.filename ? (
              <input
                autoFocus
                className="rename-input"
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") handleRename(page);
                  if (e.key === "Escape") setRenamingPage(null);
                }}
                onBlur={() => handleRename(page)}
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <>
                <div className="page-item-icon">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="1" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M5 5h6M5 8h6M5 11h3" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="page-item-info">
                  <span className="page-item-name">{page.name}</span>
                  <span className="page-item-date">{getPagePreview(page)}</span>
                </div>
              </>
            )}
          </div>
        ))}

        {filteredPages.length === 0 && !showNew && (
          <div className="page-list-empty">
            <p>No pages yet</p>
            <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}>
              Create a page
            </button>
          </div>
        )}
      </div>

      {contextMenu && (
        <div className="context-overlay" onClick={() => setContextMenu(null)}>
          <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
            <button onClick={() => {
              setRenamingPage(contextMenu.page.filename);
              setRenameValue(contextMenu.page.name);
              setContextMenu(null);
            }}>
              <span className="ctx-icon">✏️</span> Rename
            </button>
            <button onClick={() => {
              selectPage(contextMenu.page);
              removePage();
              setContextMenu(null);
            }}>
              <span className="ctx-icon">🗑️</span> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

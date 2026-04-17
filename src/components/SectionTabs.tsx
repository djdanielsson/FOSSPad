import { useState } from "react";
import { useWorkspace } from "../hooks/useWorkspace";
import "./SectionTabs.css";

export default function SectionTabs() {
  const { activeNotebook, active, selectSection, addSection, removeSection } = useWorkspace();
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; name: string } | null>(null);

  if (!activeNotebook) return null;

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await addSection(newName.trim());
    setNewName("");
    setShowNew(false);
  };

  const nbColor = activeNotebook.color;

  return (
    <div className="section-tabs" style={{ "--section-accent": nbColor } as React.CSSProperties}>
      <div className="section-tabs-scroll">
        {activeNotebook.sections.map(sec => (
          <button
            key={sec.name}
            className={`section-tab ${active.section === sec.name ? "active" : ""}`}
            onClick={() => selectSection(sec.name)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({ x: e.clientX, y: e.clientY, name: sec.name });
            }}
          >
            {sec.name}
            <span className="section-page-count">{sec.pages.length}</span>
          </button>
        ))}
        {showNew ? (
          <div className="section-tab-input-wrap">
            <input
              autoFocus
              className="section-tab-input"
              placeholder="Section name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") { setShowNew(false); setNewName(""); }
              }}
              onBlur={() => { if (!newName.trim()) setShowNew(false); else handleCreate(); }}
            />
          </div>
        ) : (
          <button className="section-tab add-section" onClick={() => setShowNew(true)} title="New Section">
            +
          </button>
        )}
      </div>

      {contextMenu && (
        <div className="context-overlay" onClick={() => setContextMenu(null)}>
          <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
            <button onClick={() => {
              selectSection(contextMenu.name);
              removeSection();
              setContextMenu(null);
            }}>
              <span className="ctx-icon">🗑️</span> Delete Section
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

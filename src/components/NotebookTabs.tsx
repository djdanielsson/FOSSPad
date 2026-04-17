import { useState } from "react";
import { useWorkspace } from "../hooks/useWorkspace";
import { NOTEBOOK_COLORS } from "../types";
import "./NotebookTabs.css";

export default function NotebookTabs() {
  const { workspace, active, selectNotebook, addNotebook, removeNotebook } = useWorkspace();
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(NOTEBOOK_COLORS[0]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; name: string } | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await addNotebook(newName.trim(), newColor);
    setNewName("");
    setShowNew(false);
  };

  const handleContextMenu = (e: React.MouseEvent, name: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, name });
  };

  return (
    <div className="notebook-tabs">
      <div className="notebook-tabs-scroll">
        {workspace?.notebooks.map(nb => (
          <button
            key={nb.name}
            className={`notebook-tab ${active.notebook === nb.name ? "active" : ""}`}
            style={{
              "--nb-color": nb.color,
              borderTopColor: nb.color,
              background: active.notebook === nb.name ? nb.color : undefined,
              color: active.notebook === nb.name ? "#fff" : nb.color,
            } as React.CSSProperties}
            onClick={() => selectNotebook(nb.name)}
            onContextMenu={(e) => handleContextMenu(e, nb.name)}
            title={nb.name}
          >
            <span className="notebook-tab-icon">📓</span>
            <span className="notebook-tab-label">{nb.name}</span>
          </button>
        ))}
        <button className="notebook-tab add-tab" onClick={() => setShowNew(true)} title="New Notebook">
          <span>+</span>
        </button>
      </div>

      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>New Notebook</h3>
            <input
              autoFocus
              placeholder="Notebook name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreate()}
              className="modal-input"
            />
            <div className="color-picker">
              {NOTEBOOK_COLORS.map(c => (
                <button
                  key={c}
                  className={`color-swatch ${newColor === c ? "selected" : ""}`}
                  style={{ background: c }}
                  onClick={() => setNewColor(c)}
                />
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowNew(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate}>Create</button>
            </div>
          </div>
        </div>
      )}

      {contextMenu && (
        <div className="context-overlay" onClick={() => setContextMenu(null)}>
          <div
            className="context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button onClick={() => {
              selectNotebook(contextMenu.name);
              removeNotebook();
              setContextMenu(null);
            }}>
              <span className="ctx-icon">🗑️</span> Delete Notebook
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

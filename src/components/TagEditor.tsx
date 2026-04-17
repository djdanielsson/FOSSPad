import { useCallback, useEffect, useState } from "react";
import * as api from "../utils/api";
import "./TagEditor.css";

export interface TagEditorProps {
  workspacePath: string;
  notebook: string;
  section: string;
  filename: string;
}

export default function TagEditor({
  workspacePath,
  notebook,
  section,
  filename,
}: TagEditorProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    let cancelled = false;
    setShowAdd(false);
    setDraft("");

    const load = async () => {
      if (!filename.trim()) {
        setTags([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const next = await api.getPageTags(workspacePath, notebook, section, filename);
        if (!cancelled) setTags(next);
      } catch {
        if (!cancelled) setTags([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [workspacePath, notebook, section, filename]);

  const persistTags = useCallback(
    async (next: string[]) => {
      if (!filename.trim()) return;
      const prev = tags;
      setTags(next);
      try {
        await api.setPageTags(workspacePath, notebook, section, filename, next);
      } catch {
        setTags(prev);
      }
    },
    [workspacePath, notebook, section, filename, tags]
  );

  const handleRemove = (tag: string) => {
    void persistTags(tags.filter((t) => t !== tag));
  };

  const commitAdd = () => {
    const t = draft.trim();
    if (!t) {
      setShowAdd(false);
      setDraft("");
      return;
    }
    if (tags.includes(t)) {
      setDraft("");
      setShowAdd(false);
      return;
    }
    void persistTags([...tags, t]);
    setDraft("");
    setShowAdd(false);
  };

  const handleAddKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitAdd();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setDraft("");
      setShowAdd(false);
    }
  };

  if (!filename.trim()) {
    return null;
  }

  return (
    <div className="tag-editor" aria-busy={loading}>
      <div className="tag-editor-chips">
        {tags.map((tag) => (
          <span key={tag} className="tag-editor-chip">
            <span className="tag-editor-chip-label">{tag}</span>
            <button
              type="button"
              className="tag-editor-chip-remove"
              onClick={() => handleRemove(tag)}
              aria-label={`Remove tag ${tag}`}
            >
              ×
            </button>
          </span>
        ))}

        {showAdd ? (
          <span className="tag-editor-add-inline">
            <input
              className="tag-editor-input"
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleAddKeyDown}
              onBlur={() => {
                setDraft("");
                setShowAdd(false);
              }}
              placeholder="Tag name"
              aria-label="New tag name"
              autoFocus
            />
            <button
              type="button"
              className="tag-editor-add-confirm"
              onMouseDown={(e) => e.preventDefault()}
              onClick={commitAdd}
              aria-label="Add tag"
            >
              Add
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="tag-editor-add-toggle"
            onClick={() => setShowAdd(true)}
            aria-label="Add tag"
            title="Add tag"
          >
            +
          </button>
        )}
      </div>
    </div>
  );
}

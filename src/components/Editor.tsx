import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useWorkspace } from "../hooks/useWorkspace";
import RenderedBlock from "./RenderedBlock";
import "./Editor.css";

interface Block {
  id: string;
  raw: string;
  type: "paragraph" | "heading" | "code" | "list" | "blockquote" | "hr" | "table" | "mermaid" | "image" | "video" | "empty";
}

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.split("\n");
  const blocks: Block[] = [];
  let i = 0;
  let blockId = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.match(/^```mermaid\s*$/i)) {
      const start = i;
      i++;
      while (i < lines.length && !lines[i].match(/^```\s*$/)) i++;
      i++;
      blocks.push({ id: `b${blockId++}`, raw: lines.slice(start, i).join("\n"), type: "mermaid" });
      continue;
    }

    if (line.match(/^```/)) {
      const start = i;
      i++;
      while (i < lines.length && !lines[i].match(/^```\s*$/)) i++;
      i++;
      blocks.push({ id: `b${blockId++}`, raw: lines.slice(start, i).join("\n"), type: "code" });
      continue;
    }

    if (line.match(/^#{1,6}\s/)) {
      blocks.push({ id: `b${blockId++}`, raw: line, type: "heading" });
      i++;
      continue;
    }

    if (line.match(/^(\-\-\-|___|\*\*\*)\s*$/)) {
      blocks.push({ id: `b${blockId++}`, raw: line, type: "hr" });
      i++;
      continue;
    }

    if (line.match(/^>\s/)) {
      const start = i;
      while (i < lines.length && (lines[i].match(/^>\s?/) || lines[i].trim() === "")) {
        if (lines[i].trim() === "" && i + 1 < lines.length && !lines[i + 1].match(/^>/)) break;
        i++;
      }
      blocks.push({ id: `b${blockId++}`, raw: lines.slice(start, i).join("\n"), type: "blockquote" });
      continue;
    }

    if (line.match(/^\|/)) {
      const start = i;
      while (i < lines.length && lines[i].match(/^\|/)) i++;
      blocks.push({ id: `b${blockId++}`, raw: lines.slice(start, i).join("\n"), type: "table" });
      continue;
    }

    if (line.match(/^(\s*[-*+]|\s*\d+\.)\s/)) {
      const start = i;
      i++;
      while (i < lines.length && (lines[i].match(/^(\s*[-*+]|\s*\d+\.)\s/) || lines[i].match(/^\s{2,}/))) i++;
      blocks.push({ id: `b${blockId++}`, raw: lines.slice(start, i).join("\n"), type: "list" });
      continue;
    }

    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
    if (imgMatch) {
      blocks.push({ id: `b${blockId++}`, raw: line, type: "image" });
      i++;
      continue;
    }

    const videoMatch = line.match(/^<video\s|^\[video\]\(|^https?:\/\/.*\.(mp4|webm|ogg)/i) ||
      line.match(/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/i);
    if (videoMatch) {
      blocks.push({ id: `b${blockId++}`, raw: line, type: "video" });
      i++;
      continue;
    }

    if (line.trim() === "") {
      blocks.push({ id: `b${blockId++}`, raw: "", type: "empty" });
      i++;
      continue;
    }

    const start = i;
    i++;
    while (i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].match(/^#{1,6}\s/) &&
      !lines[i].match(/^```/) &&
      !lines[i].match(/^>\s/) &&
      !lines[i].match(/^\|/) &&
      !lines[i].match(/^(\s*[-*+]|\s*\d+\.)\s/) &&
      !lines[i].match(/^(\-\-\-|___|\*\*\*)\s*$/) &&
      !lines[i].match(/^!\[/)
    ) {
      i++;
    }
    blocks.push({ id: `b${blockId++}`, raw: lines.slice(start, i).join("\n"), type: "paragraph" });
  }

  return blocks;
}

export default function Editor() {
  const { content, setContent, active, loading, dirty, activeNotebook } = useWorkspace();
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const blocks = useMemo(() => parseBlocks(content), [content]);

  useEffect(() => {
    setEditingBlockId(null);
  }, [active.page?.filename]);

  const startEditing = useCallback((block: Block) => {
    setEditingBlockId(block.id);
    setEditingText(block.raw);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        autoResize(textareaRef.current);
      }
    }, 0);
  }, []);

  const commitEdit = useCallback(() => {
    if (editingBlockId === null) return;
    const newBlocks = blocks.map(b =>
      b.id === editingBlockId ? { ...b, raw: editingText } : b
    );
    const newContent = newBlocks.map(b => b.raw).join("\n");
    setContent(newContent);
    setEditingBlockId(null);
    setEditingText("");
  }, [editingBlockId, editingText, blocks, setContent]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>, block: Block) => {
    if (e.key === "Escape") {
      commitEdit();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const val = editingText;
      setEditingText(val.substring(0, start) + "  " + val.substring(end));
      setTimeout(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      }, 0);
    }
  }, [editingText, commitEdit]);

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  const handleAddBlockBelow = useCallback(() => {
    const newContent = content + "\n\n";
    setContent(newContent);
    setTimeout(() => {
      const newBlocks = parseBlocks(newContent);
      const lastBlock = newBlocks[newBlocks.length - 1];
      if (lastBlock) startEditing(lastBlock);
    }, 0);
  }, [content, setContent, startEditing]);

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
        <div className="editor-toolbar-right">
          {dirty && <span className="save-indicator">Saving...</span>}
          {!dirty && <span className="save-indicator saved">Saved</span>}
        </div>
      </div>
      <div className="editor-scroll" ref={editorRef}>
        <div className="editor-content">
          {blocks.map((block) => (
            <div
              key={block.id}
              className={`editor-block ${editingBlockId === block.id ? "editing" : ""} block-type-${block.type}`}
              onClick={() => {
                if (editingBlockId !== block.id) {
                  if (editingBlockId !== null) commitEdit();
                  startEditing(block);
                }
              }}
            >
              {editingBlockId === block.id ? (
                <textarea
                  ref={textareaRef}
                  className="block-textarea"
                  value={editingText}
                  onChange={e => {
                    setEditingText(e.target.value);
                    autoResize(e.target);
                  }}
                  onBlur={commitEdit}
                  onKeyDown={(e) => handleKeyDown(e, block)}
                  spellCheck
                />
              ) : (
                <RenderedBlock block={block} />
              )}
            </div>
          ))}
          <div className="editor-block-add" onClick={handleAddBlockBelow}>
            <span>Click to add content...</span>
          </div>
        </div>
      </div>
    </div>
  );
}

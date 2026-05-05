import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { Workspace, PageInfo } from "../types";
import "./QuickSwitcher.css";

interface PageEntry {
  notebook: string;
  section: string;
  page: PageInfo;
  notebookFolder: string;
}

function slugify(name: string): string {
  return name.split("").map(c => (/[a-zA-Z0-9\-_]/.test(c) ? c : "-")).join("").toLowerCase();
}

function fuzzyMatch(query: string, text: string): { match: boolean; score: number } {
  const q = query.toLowerCase();
  const t = text.toLowerCase();

  if (q.length === 0) return { match: true, score: 0 };
  if (t.includes(q)) return { match: true, score: 100 + (q.length / t.length) * 50 };

  let qi = 0;
  let score = 0;
  let prevMatch = -2;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += 10;
      if (ti === prevMatch + 1) score += 5;
      if (ti === 0 || t[ti - 1] === " " || t[ti - 1] === "/" || t[ti - 1] === "-") score += 8;
      prevMatch = ti;
      qi++;
    }
  }

  return { match: qi === q.length, score };
}

interface QuickSwitcherProps {
  open: boolean;
  onClose: () => void;
  workspace: Workspace;
  onNavigate: (notebookFolder: string, section: string, filename: string) => void;
}

export default function QuickSwitcher({ open, onClose, workspace, onNavigate }: QuickSwitcherProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allPages = useMemo((): PageEntry[] => {
    const pages: PageEntry[] = [];
    for (const nb of workspace.notebooks) {
      const folder = slugify(nb.name);
      for (const sec of nb.sections) {
        for (const page of sec.pages) {
          pages.push({ notebook: nb.name, section: sec.name, page, notebookFolder: folder });
        }
      }
    }
    return pages;
  }, [workspace]);

  const results = useMemo(() => {
    if (!query.trim()) return allPages.slice(0, 50);

    return allPages
      .map(entry => {
        const fullText = `${entry.page.name} ${entry.notebook} ${entry.section}`;
        const { match, score } = fuzzyMatch(query, fullText);
        return { entry, match, score };
      })
      .filter(r => r.match)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50)
      .map(r => r.entry);
  }, [query, allPages]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleSelect = useCallback((entry: PageEntry) => {
    onNavigate(entry.notebookFolder, entry.section, entry.page.filename);
    onClose();
  }, [onNavigate, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[selectedIndex]) handleSelect(results[selectedIndex]);
    } else if (e.key === "Escape") {
      onClose();
    }
  }, [results, selectedIndex, handleSelect, onClose]);

  if (!open) return null;

  return (
    <div className="quick-switcher-overlay" onClick={onClose}>
      <div className="quick-switcher" onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="quick-switcher-input-wrapper">
          <svg className="quick-switcher-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            className="quick-switcher-input"
            type="text"
            placeholder="Jump to page..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <div className="quick-switcher-results" ref={listRef}>
          {results.length === 0 && (
            <div className="quick-switcher-empty">No matching pages</div>
          )}
          {results.map((entry, i) => (
            <div
              key={`${entry.notebookFolder}/${entry.section}/${entry.page.filename}`}
              className={`quick-switcher-item ${i === selectedIndex ? "selected" : ""}`}
              onClick={() => handleSelect(entry)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <span className="quick-switcher-page-name">{entry.page.name}</span>
              <span className="quick-switcher-path">{entry.notebook} / {entry.section}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

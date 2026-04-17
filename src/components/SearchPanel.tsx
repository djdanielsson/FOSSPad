import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as api from "../utils/api";
import type { SearchResult, TagSearchResult } from "../utils/api";
import "./SearchPanel.css";

export interface SearchPanelProps {
  open: boolean;
  onClose: () => void;
  workspacePath: string;
  onNavigate: (notebook: string, section: string, filename: string) => void;
}

type SearchMode = "content" | "tags";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightLine(line: string, query: string): ReactNode {
  const q = query.trim();
  if (!q) return line;
  const re = new RegExp(`(${escapeRegex(q)})`, "gi");
  const parts = line.split(re);
  return parts.map((part, i) => {
    if (part.toLowerCase() === q.toLowerCase()) {
      return (
        <mark key={i} className="search-panel-highlight">
          {part}
        </mark>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function tagChipStyle(tag: string): React.CSSProperties {
  let h = 0;
  for (let i = 0; i < tag.length; i++) {
    h = (h * 31 + tag.charCodeAt(i)) % 360;
  }
  return {
    background: `hsl(${h}, 42%, 93%)`,
    color: `hsl(${h}, 48%, 26%)`,
    borderColor: `hsl(${h}, 35%, 78%)`,
  };
}

function groupContentResults(results: SearchResult[]): Map<string, Map<string, Map<string, SearchResult[]>>> {
  const tree = new Map<string, Map<string, Map<string, SearchResult[]>>>();
  for (const r of results) {
    if (!tree.has(r.notebook)) tree.set(r.notebook, new Map());
    const sections = tree.get(r.notebook)!;
    if (!sections.has(r.section)) sections.set(r.section, new Map());
    const pages = sections.get(r.section)!;
    const key = r.filename;
    if (!pages.has(key)) pages.set(key, []);
    pages.get(key)!.push(r);
  }
  for (const sections of tree.values()) {
    for (const pages of sections.values()) {
      for (const [, lines] of pages) {
        lines.sort((a, b) => a.line_number - b.line_number);
      }
    }
  }
  return tree;
}

function groupTagResults(results: TagSearchResult[]): Map<string, Map<string, TagSearchResult[]>> {
  const tree = new Map<string, Map<string, TagSearchResult[]>>();
  for (const r of results) {
    if (!tree.has(r.notebook)) tree.set(r.notebook, new Map());
    const sections = tree.get(r.notebook)!;
    if (!sections.has(r.section)) sections.set(r.section, []);
    sections.get(r.section)!.push(r);
  }
  for (const sections of tree.values()) {
    for (const [, pages] of sections) {
      pages.sort((a, b) => a.page_name.localeCompare(b.page_name));
    }
  }
  return tree;
}

export default function SearchPanel({
  open,
  onClose,
  workspacePath,
  onNavigate,
}: SearchPanelProps) {
  const [mode, setMode] = useState<SearchMode>("content");
  const [input, setInput] = useState("");
  const [debounced, setDebounced] = useState("");
  const [contentResults, setContentResults] = useState<SearchResult[]>([]);
  const [tagResults, setTagResults] = useState<TagSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(input), 300);
    return () => window.clearTimeout(t);
  }, [input]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const q = debounced.trim();
    if (!q) {
      setContentResults([]);
      setTagResults([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    let cancelled = false;
    (async () => {
      try {
        if (mode === "content") {
          const r = await api.searchWorkspace(workspacePath, q);
          if (!cancelled) {
            setContentResults(r);
            setTagResults([]);
          }
        } else {
          const r = await api.searchByTag(workspacePath, q);
          if (!cancelled) {
            setTagResults(r);
            setContentResults([]);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Search failed");
          setContentResults([]);
          setTagResults([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, workspacePath, debounced, mode]);

  const groupedContent = useMemo(() => groupContentResults(contentResults), [contentResults]);
  const groupedTags = useMemo(() => groupTagResults(tagResults), [tagResults]);

  const queryTrim = debounced.trim();
  const resultCount = mode === "content" ? contentResults.length : tagResults.length;
  const hasQuery = queryTrim.length > 0;

  const handleNavigate = useCallback(
    (notebook: string, section: string, filename: string) => {
      onNavigate(notebook, section, filename);
      onClose();
    },
    [onNavigate, onClose]
  );

  if (!open) return null;

  return (
    <div
      className="search-panel-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <aside
        className="search-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-panel-title"
        onClick={e => e.stopPropagation()}
      >
        <header className="search-panel-header">
          <div className="search-panel-header-row">
            <h2 id="search-panel-title" className="search-panel-title">
              Search workspace
            </h2>
            <button type="button" className="btn btn-secondary search-panel-close" onClick={onClose}>
              Close
            </button>
          </div>

          <div className="search-panel-mode-toggle" role="group" aria-label="Search mode">
            <button
              type="button"
              className={`search-panel-mode-btn ${mode === "content" ? "active" : ""}`}
              onClick={() => setMode("content")}
            >
              Content
            </button>
            <button
              type="button"
              className={`search-panel-mode-btn ${mode === "tags" ? "active" : ""}`}
              onClick={() => setMode("tags")}
            >
              Tags
            </button>
          </div>

          <div className="search-panel-input-wrap">
            <svg className="search-panel-input-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              ref={inputRef}
              className="search-panel-input"
              type="search"
              placeholder={mode === "content" ? "Search page content…" : "Filter by tag…"}
              value={input}
              onChange={e => setInput(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div className="search-panel-meta" aria-live="polite">
            {loading && <span className="search-panel-status">Searching…</span>}
            {!loading && error && <span className="search-panel-error">{error}</span>}
            {!loading && !error && hasQuery && (
              <span className="search-panel-count">
                {resultCount === 1 ? "1 match" : `${resultCount} matches`}
              </span>
            )}
          </div>
        </header>

        <div className="search-panel-body">
          {!hasQuery && (
            <div className="search-panel-empty search-panel-hint">
              {mode === "content" ? (
                <p>Type a phrase to search across all notebooks and sections. Results show the matching line in context.</p>
              ) : (
                <p>Enter a tag name to find every page that uses it. Matching pages list all of their tags.</p>
              )}
            </div>
          )}

          {hasQuery && loading && (
            <div className="search-panel-empty">
              <div className="search-panel-spinner" aria-hidden />
              <p>Searching the workspace…</p>
            </div>
          )}

          {hasQuery && !loading && !error && mode === "content" && contentResults.length === 0 && (
            <div className="search-panel-empty">
              <p>No pages contain “{queryTrim}”. Try different words or switch to tag search.</p>
            </div>
          )}

          {hasQuery && !loading && !error && mode === "tags" && tagResults.length === 0 && (
            <div className="search-panel-empty">
              <p>No pages are tagged with “{queryTrim}”. Check spelling or pick another tag.</p>
            </div>
          )}

          {hasQuery && !loading && !error && mode === "content" && contentResults.length > 0 && (
            <div className="search-panel-results">
              {[...groupedContent.keys()]
                .sort((a, b) => a.localeCompare(b))
                .map(notebook => (
                  <section key={notebook} className="search-panel-notebook">
                    <h3 className="search-panel-notebook-title">{notebook}</h3>
                    {[...groupedContent.get(notebook)!.keys()]
                      .sort((a, b) => a.localeCompare(b))
                      .map(section => (
                        <div key={`${notebook}/${section}`} className="search-panel-section">
                          <h4 className="search-panel-section-title">{section}</h4>
                          {[...groupedContent.get(notebook)!.get(section)!.entries()].map(([filename, lines]) => {
                            const first = lines[0];
                            return (
                              <div key={filename} className="search-panel-page-block">
                                <button
                                  type="button"
                                  className="search-panel-page-hit"
                                  onClick={() => handleNavigate(notebook, section, filename)}
                                >
                                  <span className="search-panel-page-name">{first.page_name}</span>
                                  <span className="search-panel-page-path">
                                    {notebook} / {section}
                                  </span>
                                </button>
                                <ul className="search-panel-line-list">
                                  {lines.map((line, idx) => (
                                    <li key={`${line.line_number}-${idx}`} className="search-panel-line">
                                      <span className="search-panel-line-no">{line.line_number}</span>
                                      <span className="search-panel-line-text">
                                        {highlightLine(line.line_content, queryTrim)}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                  </section>
                ))}
            </div>
          )}

          {hasQuery && !loading && !error && mode === "tags" && tagResults.length > 0 && (
            <div className="search-panel-results">
              {[...groupedTags.keys()]
                .sort((a, b) => a.localeCompare(b))
                .map(notebook => (
                  <section key={notebook} className="search-panel-notebook">
                    <h3 className="search-panel-notebook-title">{notebook}</h3>
                    {[...groupedTags.get(notebook)!.keys()]
                      .sort((a, b) => a.localeCompare(b))
                      .map(section => (
                        <div key={`${notebook}/${section}`} className="search-panel-section">
                          <h4 className="search-panel-section-title">{section}</h4>
                          {groupedTags
                            .get(notebook)!
                            .get(section)!
                            .map(page => (
                              <div key={page.filename} className="search-panel-page-block search-panel-page-block--tags">
                                <button
                                  type="button"
                                  className="search-panel-page-hit"
                                  onClick={() => handleNavigate(notebook, section, page.filename)}
                                >
                                  <span className="search-panel-page-name">{page.page_name}</span>
                                  <div className="search-panel-tag-chips">
                                    {page.tags.map(tag => (
                                      <span
                                        key={tag}
                                        className="search-panel-tag-chip"
                                        style={tagChipStyle(tag)}
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                </button>
                              </div>
                            ))}
                        </div>
                      ))}
                  </section>
                ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

import { useRef, useEffect, useCallback } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { searchKeymap } from "@codemirror/search";
import { markdown } from "@codemirror/lang-markdown";
import {
  livePreviewPlugin,
  markdownStylePlugin,
  editorTheme as liveMarkdownTheme,
  mouseSelectingField,
  collapseOnSelectionFacet,
  linkPlugin,
  imageField,
  codeBlockField,
  tableField,
} from "codemirror-live-markdown";
import { customWidgets } from "./cm6-widgets";

const fosspadTheme = EditorView.theme({
  "&": {
    fontSize: "var(--font-size-base)",
    fontFamily: "var(--font-family)",
    color: "var(--text-primary)",
    backgroundColor: "transparent",
  },
  ".cm-content": {
    fontFamily: "var(--font-family)",
    lineHeight: "1.7",
    padding: "0",
    caretColor: "var(--accent)",
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "var(--accent)",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
    background: "var(--accent-light) !important",
  },
  ".cm-activeLine": {
    backgroundColor: "transparent",
  },
  "&.cm-focused .cm-activeLine": {
    backgroundColor: "var(--bg-primary)",
  },
  ".cm-gutters": {
    display: "none",
  },
  ".cm-scroller": {
    overflow: "auto",
  },
  ".cm-line": {
    padding: "0 4px",
  },
  "& .cm-placeholder": {
    color: "var(--text-muted)",
    fontStyle: "italic",
  },

  // Markdown live-preview heading styles
  "& .cm-md-heading1": {
    fontSize: "2em",
    fontWeight: "700",
    lineHeight: "1.3",
    borderBottom: "2px solid var(--border-subtle)",
    paddingBottom: "8px",
  },
  "& .cm-md-heading2": {
    fontSize: "1.5em",
    fontWeight: "600",
    lineHeight: "1.4",
  },
  "& .cm-md-heading3": {
    fontSize: "1.25em",
    fontWeight: "600",
    lineHeight: "1.5",
  },
  "& .cm-md-heading4, & .cm-md-heading5, & .cm-md-heading6": {
    fontSize: "1.1em",
    fontWeight: "600",
  },
  "& .cm-md-bold": { fontWeight: "700" },
  "& .cm-md-italic": { fontStyle: "italic" },
  "& .cm-md-strikethrough": { textDecoration: "line-through" },
  "& .cm-md-code": {
    fontFamily: "var(--font-mono)",
    background: "var(--bg-tertiary)",
    padding: "2px 4px",
    borderRadius: "3px",
    fontSize: "0.9em",
  },
  "& .cm-md-link": {
    color: "var(--accent)",
    textDecoration: "underline",
    textDecorationColor: "rgba(123, 104, 238, 0.3)",
  },
  "& .cm-md-url": {
    color: "var(--text-muted)",
    fontSize: "0.9em",
  },
  "& .cm-md-blockquote": {
    borderLeft: "4px solid var(--accent)",
    paddingLeft: "12px",
    color: "var(--text-secondary)",
  },
  "& .cm-md-hr": {
    borderTop: "2px solid var(--border-color)",
  },
  "& .cm-md-list-marker": {
    color: "var(--accent)",
  },

  // Code block styling
  "& .cm-code-block": {
    background: "#1e1e2e",
    color: "#cdd6f4",
    fontFamily: "var(--font-mono)",
    fontSize: "13px",
    lineHeight: "1.6",
    borderRadius: "var(--radius-md)",
  },

  // Wiki-link styling
  "& .cm-md-wikilink, & .cm-wikilink": {
    color: "var(--accent)",
    borderBottom: "1px dashed var(--accent)",
    cursor: "pointer",
  },

  // Image styling
  "& .cm-image-widget img": {
    maxWidth: "100%",
    borderRadius: "var(--radius-md)",
    boxShadow: "var(--shadow-sm)",
    margin: "4px 0",
  },

  // Table styling
  "& .cm-table-widget table": {
    width: "100%",
    borderCollapse: "collapse",
  },
  "& .cm-table-widget th, & .cm-table-widget td": {
    border: "1px solid var(--border-color)",
    padding: "8px 12px",
    textAlign: "left",
  },
  "& .cm-table-widget th": {
    background: "var(--bg-tertiary)",
    fontWeight: "600",
  },

  // Checkbox styling
  "& .cm-md-task input[type='checkbox']": {
    accentColor: "var(--accent)",
    cursor: "pointer",
    marginRight: "6px",
  },
});

interface CodeMirrorEditorProps {
  content: string;
  onChange: (value: string) => void;
  onWikiLinkClick?: (link: string) => void;
}

export default function CodeMirrorEditor({ content, onChange, onWikiLinkClick }: CodeMirrorEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onWikiLinkClickRef = useRef(onWikiLinkClick);
  const suppressNextUpdateRef = useRef(false);

  onChangeRef.current = onChange;
  onWikiLinkClickRef.current = onWikiLinkClick;

  const createView = useCallback((container: HTMLDivElement, initialContent: string) => {
    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && !suppressNextUpdateRef.current) {
        onChangeRef.current(update.state.doc.toString());
      }
      suppressNextUpdateRef.current = false;
    });

    const state = EditorState.create({
      doc: initialContent,
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
        markdown(),
        collapseOnSelectionFacet.of(true),
        mouseSelectingField,
        livePreviewPlugin,
        markdownStylePlugin,
        linkPlugin({
          openInNewTab: true,
          onWikiLinkClick: (link) => onWikiLinkClickRef.current?.(link),
        }),
        imageField(),
        codeBlockField(),
        tableField,
        customWidgets(),
        liveMarkdownTheme,
        fosspadTheme,
        updateListener,
        EditorView.lineWrapping,
      ],
    });

    return new EditorView({ state, parent: container });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const view = createView(container, content);
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  // Only run on mount/unmount — content sync handled below
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentDoc = view.state.doc.toString();
    if (currentDoc !== content) {
      suppressNextUpdateRef.current = true;
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: content },
      });
    }
  }, [content]);

  return <div ref={containerRef} className="cm-editor-container" />;
}

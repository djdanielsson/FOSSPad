import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  addComposerChild$,
  addExportVisitor$,
  addLexicalNode$,
  Cell,
  createRootEditorSubscription$,
  realmPlugin,
  useCellValue,
  viewMode$,
  type LexicalVisitor,
} from "@mdxeditor/editor";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  CLICK_COMMAND,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  KEY_DOWN_COMMAND,
  TextNode,
} from "lexical";
import { $isWikiLinkNode, WikiLinkNode, WIKILINK_TRIGGER_REGEX } from "./WikiLinkNode";
import { $transformWikiLink } from "./wikilinkTransform";
import "./wikilink.css";

const wikilinkNavigate$ = Cell<((pageName: string) => void) | null>(null);
const wikilinkPageNames$ = Cell<string[]>([]);

/**
 * Export falls through to the core text visitor: a WikiLinkNode serializes
 * exactly like the plain text it wraps, so the literal `[[Page Name]]`
 * syntax survives round-trips (formatting and text-joining included).
 */
const WikiLinkExportVisitor: LexicalVisitor = {
  priority: 1,
  testLexicalNode: (node) => $isWikiLinkNode(node),
  visitLexicalNode({ actions }) {
    actions.nextVisitor();
  },
};

function WikiLinkClickHandler() {
  const [editor] = useLexicalComposerContext();
  const onNavigate = useCellValue(wikilinkNavigate$);
  const navigateRef = useRef(onNavigate);
  navigateRef.current = onNavigate;

  useEffect(() => {
    return editor.registerCommand(
      CLICK_COMMAND,
      (event: MouseEvent) => {
        const target = event.target as HTMLElement | null;
        const el = target?.closest?.("[data-wikilink]");
        if (!el) return false;
        const name = el.getAttribute("data-wikilink");
        if (!name) return false;
        event.preventDefault();
        event.stopPropagation();
        navigateRef.current?.(name);
        return true;
      },
      COMMAND_PRIORITY_LOW
    );
  }, [editor]);

  return null;
}

interface CaretRect {
  top: number;
  left: number;
  bottom: number;
}

const MAX_SUGGESTIONS = 8;

function WikiLinkAutocomplete() {
  const [editor] = useLexicalComposerContext();
  const pageNames = useCellValue(wikilinkPageNames$);
  const viewMode = useCellValue(viewMode$);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [caret, setCaret] = useState<CaretRect | null>(null);

  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;
  const openRef = useRef(open);
  openRef.current = open;

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q
      ? pageNames.filter((n) => n.toLowerCase().includes(q))
      : pageNames;
    return pool.slice(0, MAX_SUGGESTIONS);
  }, [pageNames, query]);

  const suggRef = useRef(suggestions);
  suggRef.current = suggestions;
  const indexRef = useRef(index);
  indexRef.current = index;

  useEffect(() => {
    setIndex(0);
  }, [query]);

  const acceptRef = useRef((_name: string) => {});
  acceptRef.current = (name: string) => {
    editor.update(() => {
      const sel = $getSelection();
      if (!$isRangeSelection(sel) || !sel.isCollapsed()) return;
      const anchorNode = sel.anchor.getNode();
      if (!$isTextNode(anchorNode) || $isWikiLinkNode(anchorNode)) return;
      const text = anchorNode.getTextContent();
      const offset = sel.anchor.offset;
      const m = WIKILINK_TRIGGER_REGEX.exec(text.slice(0, offset));
      if (!m) return;
      const triggerStart = offset - m[0].length;
      const next = `${text.slice(0, triggerStart)}[[${name}]] ${text.slice(offset)}`;
      anchorNode.setTextContent(next);
      // The node transform folds `[[name]]` into a WikiLinkNode after this
      // update; place the cursor right after the inserted reference.
      const cursor = triggerStart + name.length + 5;
      anchorNode.select(cursor, cursor);
    });
    setOpen(false);
  };

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      if (viewModeRef.current !== "rich-text") {
        setOpen(false);
        return;
      }
      editorState.read(() => {
        const sel = $getSelection();
        if (!$isRangeSelection(sel) || !sel.isCollapsed()) {
          setOpen(false);
          return;
        }
        const anchorNode = sel.anchor.getNode();
        if (
          !$isTextNode(anchorNode) ||
          $isWikiLinkNode(anchorNode) ||
          anchorNode.hasFormat("code")
        ) {
          setOpen(false);
          return;
        }
        const parentType = anchorNode.getParent()?.getType();
        if (parentType === "link" || parentType === "autolink") {
          setOpen(false);
          return;
        }
        const m = WIKILINK_TRIGGER_REGEX.exec(
          anchorNode.getTextContent().slice(0, sel.anchor.offset)
        );
        if (!m) {
          setOpen(false);
          return;
        }
        setQuery(m[1]);
        setOpen(true);
        const domSel = window.getSelection();
        if (domSel && domSel.rangeCount > 0) {
          const rect = domSel.getRangeAt(0).getBoundingClientRect();
          setCaret({ top: rect.top, left: rect.left, bottom: rect.bottom });
        }
      });
    });
  }, [editor]);

  useEffect(() => {
    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event: KeyboardEvent) => {
        if (!openRef.current) return false;
        const list = suggRef.current;
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setIndex((i) => (list.length === 0 ? 0 : (i + 1) % list.length));
          return true;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          setIndex((i) => (list.length === 0 ? 0 : (i - 1 + list.length) % list.length));
          return true;
        }
        if (event.key === "Enter" || event.key === "Tab") {
          const pick = list[indexRef.current];
          if (!pick) return false;
          event.preventDefault();
          acceptRef.current(pick);
          return true;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          setOpen(false);
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_HIGH
    );
  }, [editor]);

  if (!open || viewMode !== "rich-text" || !caret) return null;

  const style: CSSProperties = {
    top: caret.bottom + 4,
    left: Math.min(caret.left, window.innerWidth - 260),
  };

  return (
    <div className="fosspad-wikilink-menu" style={style} role="listbox">
      {suggestions.length === 0 ? (
        <div className="fosspad-wikilink-item fosspad-wikilink-empty">
          No matching pages
        </div>
      ) : (
        suggestions.map((name, i) => (
          <div
            key={name}
            role="option"
            aria-selected={i === index}
            className={`fosspad-wikilink-item ${i === index ? "selected" : ""}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => acceptRef.current(name)}
            onMouseEnter={() => setIndex(i)}
          >
            <span className="fosspad-wikilink-brackets">[[</span>
            {name}
            <span className="fosspad-wikilink-brackets">]]</span>
          </div>
        ))
      )}
    </div>
  );
}

export interface WikilinkPluginParams {
  /** Called when a rendered `[[link]]` is clicked. */
  onNavigate?: (pageName: string) => void;
  /** All workspace page names, offered as autocomplete suggestions. */
  pageNames?: string[];
}

export const wikilinkPlugin = realmPlugin<WikilinkPluginParams>({
  init(realm) {
    realm.pubIn({
      [addLexicalNode$]: WikiLinkNode,
      [addExportVisitor$]: WikiLinkExportVisitor,
      [addComposerChild$]: [WikiLinkClickHandler, WikiLinkAutocomplete],
    });
    realm.pub(createRootEditorSubscription$, (editor) => {
      const removeText = editor.registerNodeTransform(TextNode, $transformWikiLink);
      const removeWikiLink = editor.registerNodeTransform(WikiLinkNode, $transformWikiLink);
      return () => {
        removeText();
        removeWikiLink();
      };
    });
  },
  update(realm, params) {
    realm.pub(wikilinkNavigate$, params?.onNavigate ?? null);
    realm.pub(wikilinkPageNames$, params?.pageNames ?? []);
  },
});

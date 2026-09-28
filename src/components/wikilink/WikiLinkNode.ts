import {
  TextNode,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedTextNode,
  type Spread,
} from "lexical";

/** Matches a single `[[Page Name]]` reference. Page names may not span lines. */
export const WIKILINK_REGEX = /\[\[([^\]\n]+)\]\]/;
export const WIKILINK_GLOBAL_REGEX = /\[\[([^\]\n]+)\]\]/g;
/** Detects an in-progress `[[query` trigger immediately before the cursor. */
export const WIKILINK_TRIGGER_REGEX = /\[\[([^\]\n]*)$/;

export function extractPageName(text: string): string {
  const m = WIKILINK_REGEX.exec(text);
  return m ? m[1] : text;
}

export type SerializedWikiLinkNode = Spread<
  { pageName: string; type: "wikilink" },
  SerializedTextNode
>;

/**
 * Inline node rendering a `[[Page Name]]` reference as a clickable pill.
 * The text content stays the literal `[[Page Name]]` source so markdown
 * round-trips byte-for-byte (the backend backlink search matches on the
 * literal syntax).
 */
export class WikiLinkNode extends TextNode {
  __pageName: string;

  static getType(): string {
    return "wikilink";
  }

  static clone(node: WikiLinkNode): WikiLinkNode {
    return new WikiLinkNode(node.__text, node.__pageName, node.__key);
  }

  constructor(text: string, pageName?: string, key?: NodeKey) {
    super(text, key);
    this.__pageName = pageName ?? extractPageName(text);
  }

  getPageName(): string {
    return this.getLatest().__pageName;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    dom.classList.add("fosspad-wikilink");
    dom.setAttribute("data-wikilink", this.__pageName);
    return dom;
  }

  static importJSON(serialized: SerializedWikiLinkNode): WikiLinkNode {
    const node = $createWikiLinkNode(serialized.text, serialized.pageName);
    node.setFormat(serialized.format);
    node.setDetail(serialized.detail);
    node.setMode(serialized.mode);
    node.setStyle(serialized.style);
    return node;
  }

  exportJSON(): SerializedWikiLinkNode {
    return {
      ...super.exportJSON(),
      type: "wikilink",
      pageName: this.getPageName(),
    };
  }
}

export function $createWikiLinkNode(text: string, pageName?: string): WikiLinkNode {
  return new WikiLinkNode(text, pageName);
}

export function $isWikiLinkNode(node: LexicalNode | null | undefined): node is WikiLinkNode {
  return node instanceof WikiLinkNode;
}

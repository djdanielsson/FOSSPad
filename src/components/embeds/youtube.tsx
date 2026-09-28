import { useEffect, useState, type ReactElement } from "react";
import type * as Mdast from "mdast";
import {
  addExportVisitor$,
  addImportVisitor$,
  addLexicalNode$,
  realmPlugin,
  type LexicalVisitor,
  type MdastImportVisitor,
} from "@mdxeditor/editor";
import {
  DecoratorNode,
  type EditorConfig,
  type ElementNode,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import { getEmbedPort } from "../../utils/api";
import "./embeds.css";

const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
  /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  /(?:music\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
];

export function getYouTubeId(url: string): string | null {
  for (const p of YOUTUBE_PATTERNS) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function YouTubeEmbed({ videoId }: { videoId: string }) {
  const [src, setSrc] = useState(`https://www.youtube-nocookie.com/embed/${videoId}`);

  useEffect(() => {
    let cancelled = false;
    getEmbedPort()
      .then((port) => {
        if (!cancelled) setSrc(`http://127.0.0.1:${port}/embed?v=${videoId}`);
      })
      .catch(() => {
        // Keep the youtube-nocookie fallback.
      });
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  return (
    <div className="fosspad-youtube-embed">
      <iframe
        src={src}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="YouTube video"
      />
    </div>
  );
}

export type SerializedYouTubeNode = Spread<
  { videoId: string; url: string; type: "youtube-embed" },
  SerializedLexicalNode
>;

/**
 * Block embed for a bare YouTube URL on its own line. Serializes back to
 * the bare URL so the on-disk format is unchanged.
 */
export class YouTubeNode extends DecoratorNode<ReactElement> {
  __videoId: string;
  __url: string;

  static getType(): string {
    return "youtube-embed";
  }

  static clone(node: YouTubeNode): YouTubeNode {
    return new YouTubeNode(node.__videoId, node.__url, node.__key);
  }

  constructor(videoId: string, url: string, key?: NodeKey) {
    super(key);
    this.__videoId = videoId;
    this.__url = url;
  }

  getVideoId(): string {
    return this.getLatest().__videoId;
  }

  getUrl(): string {
    return this.getLatest().__url;
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const dom = document.createElement("div");
    dom.className = "fosspad-youtube-wrapper";
    return dom;
  }

  updateDOM(): false {
    return false;
  }

  decorate(_editor: LexicalEditor): ReactElement {
    return <YouTubeEmbed videoId={this.__videoId} />;
  }

  isInline(): false {
    return false;
  }

  static importJSON(serialized: SerializedYouTubeNode): YouTubeNode {
    return $createYouTubeNode(serialized.videoId, serialized.url);
  }

  exportJSON(): SerializedYouTubeNode {
    return {
      type: "youtube-embed",
      version: 1,
      videoId: this.getVideoId(),
      url: this.getUrl(),
    };
  }
}

export function $createYouTubeNode(videoId: string, url: string): YouTubeNode {
  return new YouTubeNode(videoId, url);
}

export function $isYouTubeNode(node: LexicalNode | null | undefined): node is YouTubeNode {
  return node instanceof YouTubeNode;
}

const YouTubeImportVisitor: MdastImportVisitor<Mdast.Paragraph> = {
  // Beat the default paragraph visitor for lone-URL paragraphs.
  priority: 1,
  testNode: (node) => {
    if (node.type !== "paragraph" || node.children.length !== 1) return false;
    const child = node.children[0];
    return child.type === "link" && getYouTubeId(child.url) !== null;
  },
  visitNode({ mdastNode, lexicalParent, actions }) {
    const link = mdastNode.children[0] as Mdast.Link;
    const videoId = getYouTubeId(link.url);
    if (!videoId) {
      actions.nextVisitor();
      return;
    }
    (lexicalParent as ElementNode).append($createYouTubeNode(videoId, link.url));
  },
};

const YouTubeExportVisitor: LexicalVisitor = {
  priority: 1,
  testLexicalNode: (node) => $isYouTubeNode(node),
  visitLexicalNode({ lexicalNode, mdastParent, actions }) {
    actions.appendToParent(mdastParent, {
      type: "paragraph",
      children: [{ type: "text", value: (lexicalNode as YouTubeNode).getUrl() }],
    });
  },
};

export const youtubeEmbedPlugin = realmPlugin({
  init(realm) {
    realm.pubIn({
      [addLexicalNode$]: YouTubeNode,
      [addImportVisitor$]: YouTubeImportVisitor,
      [addExportVisitor$]: YouTubeExportVisitor,
    });
  },
});

import { StateField, type Extension, type Range } from "@codemirror/state";
import { EditorView, Decoration, type DecorationSet, WidgetType } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { getEmbedPort } from "../utils/api";

let cachedEmbedPort: number | null = null;
const embedPortPromise = getEmbedPort().then(p => { cachedEmbedPort = p; return p; }).catch(() => null);

const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
  /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  /(?:music\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
];

function getYouTubeId(url: string): string | null {
  for (const p of YOUTUBE_PATTERNS) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

class MermaidWidget extends WidgetType {
  constructor(readonly code: string) { super(); }

  eq(other: MermaidWidget) { return this.code === other.code; }

  toDOM() {
    const container = document.createElement("div");
    container.className = "cm-mermaid-widget";
    container.style.display = "flex";
    container.style.justifyContent = "center";
    container.style.padding = "12px 0";

    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, theme: "default" });
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const { svg } = await mermaid.render(id, this.code);
        container.innerHTML = svg;
        const svgEl = container.querySelector("svg");
        if (svgEl) svgEl.style.maxWidth = "100%";
      } catch {
        container.innerHTML = `<pre style="color:var(--danger)">[Mermaid Error] Could not render diagram</pre>`;
      }
    })();

    return container;
  }

  ignoreEvent() { return true; }
}

class YouTubeWidget extends WidgetType {
  constructor(readonly videoId: string) { super(); }

  eq(other: YouTubeWidget) { return this.videoId === other.videoId; }

  toDOM() {
    const wrapper = document.createElement("div");
    wrapper.className = "cm-youtube-widget";
    wrapper.style.maxWidth = "640px";
    wrapper.style.aspectRatio = "16/9";
    wrapper.style.borderRadius = "var(--radius-md, 6px)";
    wrapper.style.boxShadow = "var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.06))";
    wrapper.style.margin = "4px 0";
    wrapper.style.overflow = "hidden";

    const iframe = document.createElement("iframe");
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.style.borderRadius = "var(--radius-md, 6px)";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.allowFullscreen = true;
    iframe.title = "YouTube video";

    if (cachedEmbedPort) {
      iframe.src = `http://127.0.0.1:${cachedEmbedPort}/embed?v=${this.videoId}`;
    } else {
      iframe.src = `https://www.youtube-nocookie.com/embed/${this.videoId}`;
      embedPortPromise.then(p => {
        if (p) iframe.src = `http://127.0.0.1:${p}/embed?v=${this.videoId}`;
      });
    }

    wrapper.appendChild(iframe);
    return wrapper;
  }

  ignoreEvent() { return true; }
}

function shouldShowSource(state: import("@codemirror/state").EditorState, from: number, to: number): boolean {
  for (const range of state.selection.ranges) {
    if (range.from <= to && range.to >= from) return true;
  }
  return false;
}

export const mermaidAndVideoField: StateField<DecorationSet> = StateField.define({
  create(state) { return buildDecorations(state); },
  update(deco, tr) {
    if (tr.docChanged || tr.selection) return buildDecorations(tr.state);
    return deco;
  },
  provide: f => EditorView.decorations.from(f),
});

function buildDecorations(state: import("@codemirror/state").EditorState) {
  const widgets: Range<Decoration>[] = [];
  const doc = state.doc;

  syntaxTree(state).iterate({
    enter(node) {
      if (node.name === "FencedCode") {
        const text = doc.sliceString(node.from, node.to);
        const firstLine = text.split("\n")[0];
        if (/^```mermaid\s*$/i.test(firstLine)) {
          if (!shouldShowSource(state, node.from, node.to)) {
            const lines = text.split("\n");
            const code = lines.slice(1, -1).join("\n");
            if (code.trim()) {
              widgets.push(
                Decoration.replace({
                  widget: new MermaidWidget(code),
                  block: true,
                }).range(node.from, node.to)
              );
            }
          }
        }
      }
    },
  });

  // YouTube embeds: bare URLs on their own line
  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    const trimmed = line.text.trim();
    const ytId = getYouTubeId(trimmed);
    if (ytId && /^https?:\/\//.test(trimmed)) {
      if (!shouldShowSource(state, line.from, line.to)) {
        widgets.push(
          Decoration.replace({
            widget: new YouTubeWidget(ytId),
            block: true,
          }).range(line.from, line.to)
        );
      }
    }
  }

  return Decoration.set(widgets, true);
}

export function customWidgets(): Extension {
  return mermaidAndVideoField;
}

import { useMemo, useEffect, useRef, useState } from "react";
import { getEmbedPort } from "../utils/api";

interface Block {
  id: string;
  raw: string;
  type: string;
}

let cachedEmbedPort: number | null = null;
const embedPortPromise = getEmbedPort().then(p => { cachedEmbedPort = p; return p; }).catch(() => null);

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInline(text: string): string {
  let result = escapeHtml(text);

  result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  result = result.replace(/\[\[([^\]]+)\]\]/g, '<a class="wikilink" data-wikilink="$1">$1</a>');
  result = result.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  result = result.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  result = result.replace(/\*(.+?)\*/g, "<em>$1</em>");
  result = result.replace(/__(.+?)__/g, "<strong>$1</strong>");
  result = result.replace(/_(.+?)_/g, "<em>$1</em>");
  result = result.replace(/~~(.+?)~~/g, "<del>$1</del>");
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>');

  result = result.replace(
    /(?<!["=])(https?:\/\/[^\s<>&]+)/g,
    '<a href="$1" target="_blank" rel="noopener">$1</a>'
  );

  return result;
}

function highlightCode(code: string, lang: string): string {
  const escaped = escapeHtml(code);
  const keywords: Record<string, string[]> = {
    js: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "class", "import", "export", "from", "default", "async", "await", "new", "this", "try", "catch", "throw", "switch", "case", "break", "continue", "typeof", "instanceof", "in", "of", "null", "undefined", "true", "false", "=>"],
    ts: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "class", "import", "export", "from", "default", "async", "await", "new", "this", "try", "catch", "throw", "switch", "case", "break", "continue", "typeof", "instanceof", "in", "of", "null", "undefined", "true", "false", "=>", "interface", "type", "enum", "implements", "extends", "public", "private", "protected", "readonly", "as", "is", "keyof", "never", "void"],
    py: ["def", "class", "return", "if", "elif", "else", "for", "while", "import", "from", "as", "try", "except", "raise", "with", "lambda", "yield", "pass", "break", "continue", "and", "or", "not", "in", "is", "None", "True", "False", "self", "async", "await", "print"],
    rs: ["fn", "let", "mut", "const", "if", "else", "match", "for", "while", "loop", "return", "struct", "enum", "impl", "trait", "pub", "use", "mod", "crate", "self", "super", "where", "async", "await", "move", "type", "static", "ref", "true", "false", "as", "in", "unsafe"],
    go: ["func", "var", "const", "if", "else", "for", "range", "return", "struct", "interface", "type", "import", "package", "defer", "go", "select", "case", "switch", "break", "continue", "map", "chan", "nil", "true", "false", "make", "append"],
    java: ["public", "private", "protected", "class", "interface", "extends", "implements", "return", "if", "else", "for", "while", "new", "this", "super", "static", "final", "void", "int", "String", "boolean", "import", "package", "try", "catch", "throw", "throws", "null", "true", "false"],
    c: ["int", "float", "double", "char", "void", "if", "else", "for", "while", "return", "struct", "typedef", "enum", "union", "const", "static", "extern", "sizeof", "switch", "case", "break", "continue", "NULL", "include", "define", "ifdef", "endif"],
    css: ["color", "background", "margin", "padding", "border", "display", "flex", "grid", "position", "width", "height", "font", "text", "align", "justify", "overflow", "transition", "transform", "opacity", "z-index"],
    sh: ["echo", "if", "then", "else", "fi", "for", "while", "do", "done", "case", "esac", "function", "return", "exit", "export", "source", "cd", "ls", "grep", "sed", "awk", "cat", "mkdir", "rm", "cp", "mv"],
    sql: ["SELECT", "FROM", "WHERE", "INSERT", "UPDATE", "DELETE", "CREATE", "DROP", "ALTER", "TABLE", "INTO", "VALUES", "SET", "JOIN", "LEFT", "RIGHT", "INNER", "ON", "AND", "OR", "NOT", "NULL", "ORDER", "BY", "GROUP", "HAVING", "LIMIT", "AS", "DISTINCT", "COUNT", "SUM", "AVG", "INDEX"],
    html: ["div", "span", "html", "head", "body", "script", "style", "link", "meta", "title", "p", "a", "img", "ul", "ol", "li", "table", "tr", "td", "th", "form", "input", "button", "h1", "h2", "h3", "h4", "h5", "h6", "section", "header", "footer", "nav", "main"],
  };

  const langMap: Record<string, string> = {
    javascript: "js", typescript: "ts", python: "py", rust: "rs",
    golang: "go", bash: "sh", shell: "sh", zsh: "sh",
    cpp: "c", "c++": "c", "c#": "c",
  };

  const langKey = langMap[lang.toLowerCase()] || lang.toLowerCase();
  const kwList = keywords[langKey] || [];

  let highlighted = escaped;

  highlighted = highlighted.replace(/(\/\/.*$|#.*$)/gm, '<span class="comment">$1</span>');
  highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>');
  highlighted = highlighted.replace(/(&quot;[^&]*?&quot;|&#x27;[^&]*?&#x27;)/g, '<span class="string">$1</span>');
  highlighted = highlighted.replace(/((&quot;|')[^<]*?(\2))/g, '<span class="string">$1</span>');
  highlighted = highlighted.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, '<span class="string">$1</span>');
  highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');

  if (kwList.length > 0) {
    const kwPattern = new RegExp(`\\b(${kwList.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "g");
    highlighted = highlighted.replace(kwPattern, '<span class="keyword">$1</span>');
  }

  highlighted = highlighted.replace(/\b([A-Z][a-zA-Z0-9_]*)\b/g, '<span class="type">$1</span>');
  highlighted = highlighted.replace(/\b([a-zA-Z_]\w*)\s*(?=\()/g, '<span class="function">$1</span>');

  return highlighted;
}

function renderTable(raw: string): string {
  const lines = raw.split("\n").filter(l => l.trim());
  if (lines.length < 2) return `<p>${escapeHtml(raw)}</p>`;

  const parseRow = (line: string) =>
    line.split("|").slice(1, -1).map(cell => cell.trim());

  const headers = parseRow(lines[0]);
  const rows = lines.slice(2).map(parseRow);

  let html = "<table><thead><tr>";
  headers.forEach(h => { html += `<th>${renderInline(h)}</th>`; });
  html += "</tr></thead><tbody>";
  rows.forEach(row => {
    html += "<tr>";
    row.forEach(cell => { html += `<td>${renderInline(cell)}</td>`; });
    html += "</tr>";
  });
  html += "</tbody></table>";
  return html;
}

function renderList(raw: string): string {
  const lines = raw.split("\n");
  const isOrdered = /^\s*\d+\./.test(lines[0]);
  const tag = isOrdered ? "ol" : "ul";

  const items = lines.map(line => {
    const content = line.replace(/^\s*[-*+]\s+/, "").replace(/^\s*\d+\.\s+/, "");
    const checkMatch = content.match(/^\[([xX ])\]\s*(.*)/);
    if (checkMatch) {
      const checked = checkMatch[1].toLowerCase() === "x";
      return `<li><input type="checkbox" ${checked ? "checked" : ""} disabled />${renderInline(checkMatch[2])}</li>`;
    }
    return `<li>${renderInline(content)}</li>`;
  });

  return `<${tag}>${items.join("")}</${tag}>`;
}

function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:music\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function YouTubeEmbed({ videoId }: { videoId: string }) {
  const [port, setPort] = useState<number | null>(cachedEmbedPort);

  useEffect(() => {
    if (port !== null) return;
    embedPortPromise.then(p => { if (p) setPort(p); });
  }, [port]);

  const src = port
    ? `http://127.0.0.1:${port}/embed?v=${videoId}`
    : `https://www.youtube-nocookie.com/embed/${videoId}`;

  return (
    <div className="rendered-block">
      <div className="video-embed">
        <iframe
          src={src}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="YouTube video"
        />
      </div>
    </div>
  );
}

function MermaidDiagram({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, theme: "default" });
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const { svg: rendered } = await mermaid.render(id, code);
        if (!cancelled) setSvg(rendered);
      } catch {
        if (!cancelled) setSvg(`<pre style="color:var(--danger)">[Mermaid Error] Could not render diagram</pre>`);
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  return (
    <div className="mermaid-container" ref={ref} dangerouslySetInnerHTML={{ __html: svg }} />
  );
}

function CheckboxList({ lines, onToggle }: { lines: string[]; onToggle: (lineIndex: number) => void }) {
  const isOrdered = /^\s*\d+\./.test(lines[0]);
  const Tag = isOrdered ? "ol" : "ul";

  return (
    <div className="rendered-block">
      <Tag>
        {lines.map((line, i) => {
          const content = line.replace(/^\s*[-*+]\s+/, "").replace(/^\s*\d+\.\s+/, "");
          const checkMatch = content.match(/^\[([xX ])\]\s*(.*)/);
          if (checkMatch) {
            const checked = checkMatch[1].toLowerCase() === "x";
            return (
              <li key={i}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(i)}
                />
                <span dangerouslySetInnerHTML={{ __html: renderInline(checkMatch[2]) }} />
              </li>
            );
          }
          return <li key={i} dangerouslySetInnerHTML={{ __html: renderInline(content) }} />;
        })}
      </Tag>
    </div>
  );
}

export default function RenderedBlock({ block, onToggleCheckbox }: { block: Block; onToggleCheckbox?: (lineIndex: number) => void }) {
  const html = useMemo(() => {
    switch (block.type) {
      case "heading": {
        const match = block.raw.match(/^(#{1,6})\s+(.*)/);
        if (!match) return renderInline(block.raw);
        const level = match[1].length;
        return `<h${level}>${renderInline(match[2])}</h${level}>`;
      }
      case "paragraph":
        return `<p>${renderInline(block.raw)}</p>`;

      case "code": {
        const lines = block.raw.split("\n");
        const langMatch = lines[0].match(/^```(\w*)/);
        const lang = langMatch?.[1] || "";
        const code = lines.slice(1, -1).join("\n");
        const highlighted = lang ? highlightCode(code, lang) : escapeHtml(code);
        const langLabel = lang ? `<div style="position:absolute;top:6px;right:10px;font-size:11px;color:#6c7086;text-transform:uppercase;letter-spacing:0.5px;">${escapeHtml(lang)}</div>` : "";
        return `<pre style="position:relative">${langLabel}<code>${highlighted}</code></pre>`;
      }

      case "blockquote": {
        const content = block.raw.split("\n").map(l => l.replace(/^>\s?/, "")).join("\n");
        return `<blockquote>${renderInline(content)}</blockquote>`;
      }

      case "list":
        return renderList(block.raw);

      case "table":
        return renderTable(block.raw);

      case "hr":
        return "<hr />";

      case "image": {
        const match = block.raw.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
        if (match) return `<img src="${escapeHtml(match[2])}" alt="${escapeHtml(match[1])}" />`;
        return renderInline(block.raw);
      }

      case "video":
        return "";

      case "empty":
        return "<br />";

      default:
        return `<p>${renderInline(block.raw)}</p>`;
    }
  }, [block.raw, block.type]);

  if (block.type === "mermaid") {
    const lines = block.raw.split("\n");
    const code = lines.slice(1, -1).join("\n");
    return (
      <div className="rendered-block">
        <MermaidDiagram code={code} />
      </div>
    );
  }

  if (block.type === "video") {
    const url = block.raw.trim().replace(/^\[video\]\(/, "").replace(/\)$/, "");
    const ytId = getYouTubeId(url);
    if (ytId) {
      return <YouTubeEmbed videoId={ytId} />;
    }
    return (
      <div className="rendered-block">
        <div className="video-embed">
          <video controls src={url} />
        </div>
      </div>
    );
  }

  if (block.type === "list" && onToggleCheckbox) {
    const lines = block.raw.split("\n");
    const hasCheckboxes = lines.some(l => /^\s*[-*+]\s+\[[ xX]\]/.test(l) || /^\s*\d+\.\s+\[[ xX]\]/.test(l));
    if (hasCheckboxes) {
      return <CheckboxList lines={lines} onToggle={onToggleCheckbox} />;
    }
  }

  return <div className="rendered-block" dangerouslySetInnerHTML={{ __html: html }} />;
}

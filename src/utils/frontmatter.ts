/**
 * Front-matter sidecar helpers.
 *
 * Mirrors the Rust `split_frontmatter` rules in `src-tauri/src/lib.rs`
 * (BOM tolerance, `---` fences, `\n` / `\r\n` line endings) so the
 * TypeScript side splits files exactly the way the backend parses them.
 *
 * Unlike the backend (which re-serializes YAML when tags change), these
 * helpers preserve the front-matter block byte-for-byte: the editor only
 * ever touches the body, and the original prefix is re-attached on save.
 */

export interface SplitDocument {
  /** The exact original front-matter block, including fences and trailing newline. Empty when the file has none. */
  prefix: string;
  /** Everything after the front-matter block (the editable Markdown body). */
  body: string;
}

const CLOSERS = ["\n---\n", "\n---\r\n", "\r\n---\r\n"];

export function splitFrontmatter(content: string): SplitDocument {
  let start = 0;
  if (content.startsWith("\uFEFF")) start = 1;
  if (!content.startsWith("---", start)) {
    return { prefix: "", body: content };
  }
  let rest = start + 3;
  if (content.startsWith("\r\n", rest)) {
    rest += 2;
  } else if (content.startsWith("\n", rest)) {
    rest += 1;
  } else {
    return { prefix: "", body: content };
  }
  for (const closer of CLOSERS) {
    const pos = content.indexOf(closer, rest);
    if (pos !== -1) {
      const end = pos + closer.length;
      return { prefix: content.slice(0, end), body: content.slice(end) };
    }
  }
  return { prefix: "", body: content };
}

export function joinFrontmatter(prefix: string, body: string): string {
  return prefix + body;
}

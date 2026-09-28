import { $createTextNode, type TextNode } from "lexical";
import { $createWikiLinkNode, $isWikiLinkNode, WIKILINK_GLOBAL_REGEX } from "./WikiLinkNode";

/**
 * Lexical node transform that folds literal `[[Page Name]]` text into
 * {@link WikiLinkNode}s (and unfolds nodes whose brackets were broken by
 * editing back into plain text).
 *
 * The underlying markdown text is never altered — only the node type
 * changes — so serialization round-trips exactly.
 */
export function $transformWikiLink(node: TextNode): void {
  if ($isWikiLinkNode(node)) {
    const text = node.getTextContent();
    const start = text.indexOf("[[");
    const end = text.lastIndexOf("]]");
    if (start !== 0 || end !== text.length - 2 || start === end) {
      const plain = $createTextNode(text);
      plain.setFormat(node.getFormat());
      node.replace(plain);
    }
    return;
  }

  // Never touch inline code or link content.
  if (node.hasFormat("code")) return;
  const parentType = node.getParent()?.getType();
  if (parentType === "link" || parentType === "autolink") return;

  const text = node.getTextContent();
  if (!text.includes("[[")) return;

  WIKILINK_GLOBAL_REGEX.lastIndex = 0;
  const matches = [...text.matchAll(WIKILINK_GLOBAL_REGEX)];
  if (matches.length === 0) return;

  let current: TextNode = node;
  // Original-text offset at which `current` starts.
  let consumed = 0;
  for (const m of matches) {
    const start = (m.index ?? 0) - consumed;
    const end = start + m[0].length;
    const currentText = current.getTextContent();
    if (start < 0 || end > currentText.length) continue;

    let target: TextNode;
    let after: TextNode | undefined;
    if (start === 0 && end === currentText.length) {
      target = current;
    } else if (start === 0) {
      [target, after] = current.splitText(end);
    } else if (end === currentText.length) {
      [, target] = current.splitText(start);
    } else {
      const parts = current.splitText(start, end);
      target = parts[1];
      after = parts[2];
    }

    const wikiLink = $createWikiLinkNode(m[0], m[1]);
    wikiLink.setFormat(target.getFormat());
    target.replace(wikiLink);

    if (!after) break;
    consumed += end;
    current = after;
  }
}

import { useEffect, useState } from "react";
import {
  useCodeBlockEditorContext,
  type CodeBlockEditorDescriptor,
  type CodeBlockEditorProps,
} from "@mdxeditor/editor";
import "./embeds.css";

export const mermaidDescriptor: CodeBlockEditorDescriptor = {
  priority: 10,
  match: (language) => language?.toLowerCase() === "mermaid",
  Editor: MermaidEditor,
};

function MermaidEditor({ code }: CodeBlockEditorProps) {
  const { setCode } = useCodeBlockEditorContext();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(code);
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    setDraft(code);
  }, [code]);

  useEffect(() => {
    if (!code.trim()) {
      setSvg(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, theme: "default" });
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const { svg: rendered } = await mermaid.render(id, code);
        if (!cancelled) setSvg(rendered);
      } catch {
        if (!cancelled) setSvg(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (editing) {
    return (
      <div className="fosspad-mermaid-editor">
        <textarea
          className="fosspad-mermaid-textarea"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          spellCheck={false}
          rows={Math.max(4, draft.split("\n").length + 1)}
        />
        <div className="fosspad-mermaid-actions">
          <button
            type="button"
            onClick={() => {
              setCode(draft);
              setEditing(false);
            }}
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(code);
              setEditing(false);
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fosspad-mermaid-preview">
      {svg ? (
        <div dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <pre className="fosspad-mermaid-fallback">
          {code.trim() ? "[Mermaid Error] Could not render diagram" : "Empty diagram"}
        </pre>
      )}
      <button type="button" className="fosspad-mermaid-edit" onClick={() => setEditing(true)}>
        Edit diagram source
      </button>
    </div>
  );
}

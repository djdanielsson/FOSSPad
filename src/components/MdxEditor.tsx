import { useEffect, useRef } from "react";
import {
  BoldItalicUnderlineToggles,
  CreateLink,
  DiffSourceToggleWrapper,
  InsertCodeBlock,
  InsertTable,
  ListsToggle,
  MDXEditor,
  UndoRedo,
  codeBlockPlugin,
  codeMirrorPlugin,
  diffSourcePlugin,
  headingsPlugin,
  imagePlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { wikilinkPlugin } from "./wikilink/wikilinkPlugin";
import { youtubeEmbedPlugin } from "./embeds/youtube";
import { mermaidDescriptor } from "./embeds/mermaid";
import { useMdxDarkMode } from "./useMdxDarkMode";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import "./mdxeditor-overrides.css";

interface MdxEditorProps {
  /** Markdown body WITHOUT front-matter (the sidecar lives in `useWorkspace`). */
  content: string;
  onChange: (body: string) => void;
  onWikiLinkClick?: (pageName: string) => void;
  pageNames: string[];
}

const CODE_BLOCK_LANGUAGES = {
  js: "JavaScript",
  ts: "TypeScript",
  tsx: "TypeScript",
  jsx: "JavaScript",
  py: "Python",
  rs: "Rust",
  go: "Go",
  java: "Java",
  c: "C",
  cpp: "C++",
  css: "CSS",
  html: "HTML",
  json: "JSON",
  yaml: "YAML",
  yml: "YAML",
  sh: "Shell",
  bash: "Shell",
  sql: "SQL",
  md: "Markdown",
  txt: "Plain text",
};

export default function MdxEditor({ content, onChange, onWikiLinkClick, pageNames }: MdxEditorProps) {
  const ref = useRef<MDXEditorMethods>(null);
  const dark = useMdxDarkMode();
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  // Tracks the last value pushed in either direction so parent echoes of
  // our own onChange output don't reset the editor (and the cursor).
  const appliedRef = useRef(content);

  useEffect(() => {
    if (appliedRef.current !== content) {
      appliedRef.current = content;
      ref.current?.setMarkdown(content);
    }
  }, [content]);

  return (
    <div className="fosspad-mdx">
      <MDXEditor
        ref={ref}
        markdown={content}
        className={dark ? "dark-theme" : undefined}
        contentEditableClassName="fosspad-mdx-content"
        toMarkdownOptions={{ bullet: "-", emphasis: "*" }}
        onChange={(md) => {
          appliedRef.current = md;
          onChangeRef.current(md);
        }}
        plugins={[
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          linkPlugin(),
          linkDialogPlugin(),
          imagePlugin(),
          tablePlugin(),
          codeBlockPlugin({
            defaultCodeBlockLanguage: "txt",
            codeBlockEditorDescriptors: [mermaidDescriptor],
          }),
          codeMirrorPlugin({
            codeBlockLanguages: CODE_BLOCK_LANGUAGES,
            autoLoadLanguageSupport: false,
          }),
          markdownShortcutPlugin(),
          diffSourcePlugin({ viewMode: "rich-text" }),
          wikilinkPlugin({ onNavigate: onWikiLinkClick, pageNames }),
          youtubeEmbedPlugin(),
          toolbarPlugin({
            toolbarContents: () => (
              <DiffSourceToggleWrapper>
                <UndoRedo />
                <BoldItalicUnderlineToggles />
                <ListsToggle />
                <CreateLink />
                <InsertTable />
                <InsertCodeBlock />
              </DiffSourceToggleWrapper>
            ),
          }),
        ]}
      />
    </div>
  );
}

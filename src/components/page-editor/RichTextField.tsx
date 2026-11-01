"use client";

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

// Formatted text editor for the "rich_text" block. It only offers what the public page can show (see sanitize-rich-text.ts);
// pasted content is cut down to this same set by the editor schema, so formatting from other pages survives only where it is supported.

const button = "rounded border px-2 py-1 text-xs disabled:opacity-40";

export default function RichTextField({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
        code: false,
        link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer" } },
      }),
    ],
    content: value,
    editorProps: {
      attributes: { class: "vlr-rich min-h-[220px] rounded-b-md border border-zinc-600 bg-white p-3 text-zinc-900 focus:outline-none" },
    },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? "" : e.getHTML()),
  });

  // The block was changed from outside (another block selected, undo): show its content
  useEffect(() => {
    if (editor && value !== (editor.isEmpty ? "" : editor.getHTML())) editor.commands.setContent(value, { emitUpdate: false });
  }, [value, editor]);

  if (!editor) return <div className="h-[260px] rounded-md border border-zinc-600 bg-zinc-900" />;

  const tool = (label: string, title: string, active: boolean, run: () => void, disabled = false) => (
    <button
      key={title}
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={run}
      className={`${button} ${active ? "border-emerald-500 bg-zinc-700 text-white" : "border-zinc-600 text-zinc-300 hover:bg-zinc-700"}`}
    >
      {label}
    </button>
  );

  function setLink() {
    const previous = editor?.getAttributes("link").href as string | undefined;
    const url = window.prompt("Adresa linkului (https://…, mailto:…, tel:… sau /pagina). Gol = scoate linkul:", previous ?? "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor?.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor?.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  const c = () => editor.chain().focus();
  return (
    <div>
      <div className="flex flex-wrap gap-1 rounded-t-md border border-b-0 border-zinc-600 bg-zinc-900 p-1.5">
        {tool("H1", "Titlu mare", editor.isActive("heading", { level: 1 }), () => c().toggleHeading({ level: 1 }).run())}
        {tool("H2", "Titlu", editor.isActive("heading", { level: 2 }), () => c().toggleHeading({ level: 2 }).run())}
        {tool("H3", "Subtitlu", editor.isActive("heading", { level: 3 }), () => c().toggleHeading({ level: 3 }).run())}
        {tool("B", "Îngroșat", editor.isActive("bold"), () => c().toggleBold().run())}
        {tool("I", "Cursiv", editor.isActive("italic"), () => c().toggleItalic().run())}
        {tool("U", "Subliniat", editor.isActive("underline"), () => c().toggleUnderline().run())}
        {tool("• Listă", "Listă cu buline", editor.isActive("bulletList"), () => c().toggleBulletList().run())}
        {tool("1. Listă", "Listă numerotată", editor.isActive("orderedList"), () => c().toggleOrderedList().run())}
        {tool("❝", "Citat", editor.isActive("blockquote"), () => c().toggleBlockquote().run())}
        {tool("Link", "Link", editor.isActive("link"), setLink)}
        {tool("―", "Linie despărțitoare", false, () => c().setHorizontalRule().run())}
        {tool("Curăță", "Șterge formatarea", false, () => c().clearNodes().unsetAllMarks().run())}
        {tool("↶", "Anulează", false, () => c().undo().run(), !editor.can().undo())}
        {tool("↷", "Refă", false, () => c().redo().run(), !editor.can().redo())}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

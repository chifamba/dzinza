import React, { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import EditorToolbar from "./EditorToolbar"; // Assuming EditorToolbar.tsx is in the same directory

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string; // Allow passing custom class names
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Start typing...",
  readOnly = false,
  className = "",
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2],
        },
        // Disable default blockquote to avoid conflicts if not explicitly needed
        // blockquote: false,
        // Disable default codeBlock if not explicitly needed
        // codeBlock: false,
      }),
      Link.configure({
        openOnClick: false, // Link opens on click (false means it requires ctrl/cmd + click)
        autolink: true, // Automatically detect links as you type
      }),
      Image.configure({
        inline: true, // Allows images to be part of the text flow
        allowBase64: true, // Allows pasting base64 encoded images
      }),
      Placeholder.configure({
        placeholder: placeholder,
      }),
      Underline,
    ],
    content: value,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [readOnly, editor]);

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      // Use a try-catch block in case the content is invalid HTML
      // Or if setContent triggers an update that causes a loop (though less likely with getHTML comparison)
      try {
        editor.commands.setContent(value, false); // false to not emit update
      } catch (error) {
        console.error("Error setting editor content:", error);
        // Potentially handle corrupted content or notify user
      }
    }
  }, [value, editor]);

  // Basic styling for TipTap content.
  // Ideally, this would be part of global styles or Tailwind typography.
  const editorStyles = `
    .ProseMirror {
      min-height: 150px;
      padding: 0.5rem;
      border: 1px solid #d1d5db; /* gray-300 */
      border-top: none; /* Remove top border as toolbar has bottom border */
      border-radius: 0 0 0.375rem 0.375rem; /* rounded-b-md */
      background-color: white;
    }
    .ProseMirror:focus {
      outline: 2px solid transparent;
      outline-offset: 2px;
      border-color: #2563eb; /* blue-600 focus ring, adjust as needed */
    }
    .ProseMirror p {
      margin-bottom: 1em;
    }
    .ProseMirror h1 {
      font-size: 2em;
      font-weight: bold;
      margin-bottom: 0.5em;
    }
    .ProseMirror h2 {
      font-size: 1.5em;
      font-weight: bold;
      margin-bottom: 0.5em;
    }
    .ProseMirror ul, .ProseMirror ol {
      margin-left: 1.5rem;
      margin-bottom: 1em;
    }
    .ProseMirror ul {
      list-style-type: disc;
    }
    .ProseMirror ol {
      list-style-type: decimal;
    }
    .ProseMirror a {
      color: #2563eb; /* blue-600 */
      text-decoration: underline;
      cursor: pointer;
    }
    .ProseMirror img {
      max-width: 100%;
      height: auto;
      display: block; /* or inline based on preference */
      margin: 0.5rem 0;
    }
    .ProseMirror.ProseMirror-readonly {
      background-color: #f3f4f6; /* gray-100 */
      cursor: default;
    }
    .ProseMirror-placeholder {
      color: #a1a1aa; /* gray-400 */
      pointer-events: none;
      height: 0;
    }
    .ProseMirror-focused .ProseMirror-placeholder {
        display: none;
    }
  `;

  return (
    <div className={`rich-text-editor ${className}`}>
      <style>{editorStyles}</style>
      {!readOnly && editor && <EditorToolbar editor={editor} />}
      <EditorContent
        editor={editor}
        className={readOnly ? "ProseMirror-readonly" : ""}
      />
    </div>
  );
};

export default RichTextEditor;
export { RichTextEditor };

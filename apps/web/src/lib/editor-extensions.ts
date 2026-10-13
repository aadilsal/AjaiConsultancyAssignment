import Highlight from "@tiptap/extension-highlight";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import TextAlign from "@tiptap/extension-text-align";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import StarterKit from "@tiptap/starter-kit";

// Document schema: must match the API's validator exactly.
export const schemaExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: {
      openOnClick: false,
      autolink: true,
      protocols: ["http", "https", "mailto"],
      HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
    },
  }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Highlight,
  TaskList,
  TaskItem.configure({ nested: true }),
];

// UI-only helpers: add no nodes or marks to the schema.
export const editorExtensions = [
  ...schemaExtensions,
  CharacterCount,
  Placeholder.configure({ placeholder: "Start writing…" }),
];

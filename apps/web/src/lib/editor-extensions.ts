import StarterKit from "@tiptap/starter-kit";

// Must match the API's schema validator exactly (H1-H3, no links).
export const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: false,
  }),
];

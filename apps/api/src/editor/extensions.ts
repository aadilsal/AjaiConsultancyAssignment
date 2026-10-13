import { getSchema } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

// Must match the web editor config exactly.
export const editorExtensions = [StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: false })];

export const editorSchema = getSchema(editorExtensions);

export interface TiptapJSON {
  type: string;
  content?: TiptapJSON[];
  [key: string]: unknown;
}

export const EMPTY_DOC: TiptapJSON = { type: 'doc', content: [{ type: 'paragraph' }] };

// True when content parses and checks against the editor schema.
export function isValidDoc(content: unknown): boolean {
  if (!content || typeof content !== 'object' || (content as { type?: unknown }).type !== 'doc') return false;
  try {
    editorSchema.nodeFromJSON(content).check();
    return true;
  } catch {
    return false;
  }
}

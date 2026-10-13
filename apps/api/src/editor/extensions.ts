import { getSchema } from '@tiptap/core';
import Highlight from '@tiptap/extension-highlight';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import TextAlign from '@tiptap/extension-text-align';
import StarterKit from '@tiptap/starter-kit';

export const ALLOWED_LINK_PROTOCOLS = ['http', 'https', 'mailto'];

// Must match the web editor config exactly.
export const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: {
      openOnClick: false,
      autolink: true,
      protocols: ALLOWED_LINK_PROTOCOLS,
      HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
    },
  }),
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Highlight,
  TaskList,
  TaskItem.configure({ nested: true }),
];

export const editorSchema = getSchema(editorExtensions);

export interface TiptapJSON {
  type: string;
  content?: TiptapJSON[];
  [key: string]: unknown;
}

export const EMPTY_DOC: TiptapJSON = { type: 'doc', content: [{ type: 'paragraph' }] };

const SAFE_HREF = /^(https?:\/\/|mailto:)/i;
const TEXT_ALIGNS = new Set([null, undefined, 'left', 'center', 'right', 'justify']);

export function isSafeHref(href: unknown): boolean {
  return typeof href === 'string' && SAFE_HREF.test(href.trim());
}

type Mark = { type?: unknown; attrs?: Record<string, unknown> };

// Attribute checks the ProseMirror schema itself does not enforce.
function attrsAreSafe(node: TiptapJSON): boolean {
  const attrs = (node.attrs ?? {}) as Record<string, unknown>;
  if (node.type === 'heading' && ![1, 2, 3].includes(attrs.level as number)) return false;
  if ('textAlign' in attrs && !TEXT_ALIGNS.has(attrs.textAlign as string)) return false;
  for (const mark of (node.marks as Mark[] | undefined) ?? []) {
    if (mark.type === 'link' && !isSafeHref(mark.attrs?.href)) return false;
  }
  return (node.content ?? []).every(attrsAreSafe);
}

// True when content parses, checks against the editor schema and has only safe attrs.
export function isValidDoc(content: unknown): boolean {
  if (!content || typeof content !== 'object' || (content as { type?: unknown }).type !== 'doc') return false;
  try {
    editorSchema.nodeFromJSON(content).check();
  } catch {
    return false;
  }
  return attrsAreSafe(content as TiptapJSON);
}

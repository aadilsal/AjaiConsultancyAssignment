import { HttpStatus } from '@nestjs/common';
import { DOMParser as PMDOMParser } from '@tiptap/pm/model';
import { JSDOM } from 'jsdom';
import mammoth from 'mammoth';
import { marked } from 'marked';
import { AppError } from '../common/app-error';
import { editorSchema, isSafeHref, isValidDoc, TiptapJSON } from '../editor/extensions';

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export type ImportKind = 'txt' | 'md' | 'docx';

const ALLOWED_MIME = new Set([
  'text/plain',
  'text/markdown',
  'text/x-markdown',
  'application/octet-stream',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '',
]);

// Heading 1-3 and underline survive the docx -> HTML step.
const DOCX_STYLE_MAP = [
  "p[style-name='Heading 1'] => h1:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='Title'] => h1:fresh",
  'u => u',
];

export const unsupportedType = (): AppError =>
  new AppError(HttpStatus.BAD_REQUEST, 'UNSUPPORTED_TYPE', 'Only .txt, .md and .docx files are supported');

export const unreadableFile = (): AppError =>
  new AppError(
    HttpStatus.UNPROCESSABLE_ENTITY,
    'UNREADABLE_FILE',
    "We couldn't read this file. Try saving it again as .docx or .md.",
  );

// Extension AND mimetype must both be acceptable.
export function assertSupportedFile(filename: string, mimetype = ''): ImportKind {
  const ext = /\.([a-z0-9]+)$/i.exec(filename)?.[1]?.toLowerCase();
  if (ext !== 'txt' && ext !== 'md' && ext !== 'docx') throw unsupportedType();
  if (!ALLOWED_MIME.has(mimetype.toLowerCase())) throw unsupportedType();
  return ext;
}

export function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '').trim().slice(0, 200).trim();
  return base || 'Imported document';
}

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function textToHtml(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${block.split('\n').map(escapeHtml).join('<br>')}</p>`)
    .join('');
}

async function toHtml(buffer: Buffer, kind: ImportKind): Promise<string> {
  if (kind === 'txt') return textToHtml(buffer.toString('utf8'));
  if (kind === 'md') return marked.parse(buffer.toString('utf8'), { async: false, gfm: true });
  const { value } = await mammoth.convertToHtml({ buffer }, { styleMap: DOCX_STYLE_MAP });
  return value;
}

// Schema-driven parse: unknown tags (script, style, img...) are dropped.
function htmlToDoc(html: string): TiptapJSON {
  const { document } = new JSDOM(`<!doctype html><html><body>${html}</body></html>`).window;
  markTaskLists(document);
  return stripUnsafeLinks(PMDOMParser.fromSchema(editorSchema).parse(document.body).toJSON() as TiptapJSON);
}

// GFM "- [ ] item" HTML -> the data-type markup Tiptap's TaskList/TaskItem parse.
function markTaskLists(document: Document): void {
  for (const ul of Array.from(document.querySelectorAll('ul'))) {
    const items = Array.from(ul.children).filter((el) => el.tagName === 'LI');
    const boxes = items.map((li) => li.querySelector(':scope > input[type="checkbox"], :scope > p > input[type="checkbox"]'));
    if (!items.length || boxes.some((b) => !b)) continue;
    ul.setAttribute('data-type', 'taskList');
    items.forEach((li, i) => {
      li.setAttribute('data-type', 'taskItem');
      li.setAttribute('data-checked', String(boxes[i]!.hasAttribute('checked')));
      boxes[i]!.remove();
    });
  }
}

// Drops link marks whose href is not http(s)/mailto (e.g. javascript:).
function stripUnsafeLinks(node: TiptapJSON): TiptapJSON {
  const marks = node.marks as { type: string; attrs?: { href?: unknown } }[] | undefined;
  return {
    ...node,
    ...(marks && { marks: marks.filter((m) => m.type !== 'link' || isSafeHref(m.attrs?.href)) }),
    ...(node.content && { content: node.content.map(stripUnsafeLinks) }),
  };
}

// Pure: file bytes -> schema-valid Tiptap JSON (throws UNREADABLE_FILE).
export async function convertFileToDoc(buffer: Buffer, filename: string): Promise<TiptapJSON> {
  const kind = assertSupportedFile(filename);
  let json: TiptapJSON;
  try {
    json = htmlToDoc(await toHtml(buffer, kind));
    if (!isValidDoc(json)) throw new Error('invalid');
  } catch {
    throw unreadableFile();
  }
  const hasText = JSON.stringify(json).includes('"text"');
  if (!json.content?.length || !hasText) throw unreadableFile();
  return json;
}

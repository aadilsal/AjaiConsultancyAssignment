import { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import request from 'supertest';
import { TiptapJSON } from '../src/editor/extensions';
import { assertSupportedFile, convertFileToDoc, titleFromFilename } from '../src/import/converter';
import { buildSampleDocx } from './fixtures/make-docx';
import { createApp, createUser, login, resetDb, TestUser } from './helpers';

const fixture = (name: string): Buffer => readFileSync(join(__dirname, 'fixtures', name));

// Flattens the doc tree into node types and mark types for easy assertions.
function collect(node: TiptapJSON, types = new Set<string>(), marks = new Set<string>()) {
  types.add(node.type);
  for (const m of (node.marks as { type: string }[] | undefined) ?? []) marks.add(m.type);
  for (const child of node.content ?? []) collect(child, types, marks);
  return { types, marks };
}

const allText = (node: TiptapJSON): string =>
  (typeof node.text === 'string' ? node.text : '') + (node.content ?? []).map(allText).join('');

describe('Import converter (unit)', () => {
  let docx: Buffer;

  beforeAll(async () => {
    docx = await buildSampleDocx();
  });

  it('.md -> headings, bullet list, bold and italic; scripts dropped', async () => {
    const doc = await convertFileToDoc(fixture('sample.md'), 'sample.md');
    const { types, marks } = collect(doc);
    expect(doc.type).toBe('doc');
    expect(doc.content?.[0]).toMatchObject({ type: 'heading', attrs: { level: 1 } });
    expect(types).toEqual(expect.objectContaining({}));
    expect([...types]).toEqual(expect.arrayContaining(['heading', 'bulletList', 'listItem', 'paragraph']));
    expect([...marks]).toEqual(expect.arrayContaining(['bold', 'italic']));
    expect(allText(doc)).not.toContain('alert');
  });

  it('.txt -> paragraphs per blank-line block, HTML kept as literal text', async () => {
    const doc = await convertFileToDoc(fixture('sample.txt'), 'sample.txt');
    const paragraphs = doc.content ?? [];
    expect(paragraphs.map((p) => p.type)).toEqual(['paragraph', 'paragraph', 'paragraph']);
    expect(collect(doc).types.has('hardBreak')).toBe(true);
    expect(allText(doc)).toContain('<b>not html</b>');
  });

  it('.docx -> heading, bullet list, bold, italic and underline', async () => {
    const doc = await convertFileToDoc(docx, 'sample.docx');
    const { types, marks } = collect(doc);
    expect(doc.content?.[0]).toMatchObject({ type: 'heading', attrs: { level: 1 } });
    expect([...types]).toEqual(expect.arrayContaining(['heading', 'bulletList', 'listItem']));
    expect([...marks]).toEqual(expect.arrayContaining(['bold', 'italic', 'underline']));
  });

  it('garbage bytes named .docx -> UNREADABLE_FILE', async () => {
    await expect(convertFileToDoc(Buffer.from('definitely not a zip'), 'bad.docx')).rejects.toMatchObject({
      code: 'UNREADABLE_FILE',
    });
  });

  it('whitespace-only text -> UNREADABLE_FILE (no content)', async () => {
    await expect(convertFileToDoc(Buffer.from('  \n\n  '), 'blank.txt')).rejects.toMatchObject({
      code: 'UNREADABLE_FILE',
    });
  });

  it('assertSupportedFile accepts .txt/.md/.docx and rejects .pdf and bad mimetypes', () => {
    expect(assertSupportedFile('a.TXT', 'text/plain')).toBe('txt');
    expect(assertSupportedFile('a.md', 'text/markdown')).toBe('md');
    expect(assertSupportedFile('a.docx', 'application/octet-stream')).toBe('docx');
    expect(() => assertSupportedFile('a.pdf', 'application/pdf')).toThrow(
      expect.objectContaining({ code: 'UNSUPPORTED_TYPE' }),
    );
    expect(() => assertSupportedFile('a.pdf.exe')).toThrow(expect.objectContaining({ code: 'UNSUPPORTED_TYPE' }));
    expect(() => assertSupportedFile('noext')).toThrow(expect.objectContaining({ code: 'UNSUPPORTED_TYPE' }));
    expect(() => assertSupportedFile('a.md', 'image/png')).toThrow(expect.objectContaining({ code: 'UNSUPPORTED_TYPE' }));
  });

  it('titleFromFilename strips the extension, trims, caps at 200 and falls back', () => {
    expect(titleFromFilename('  Notes.final.md')).toBe('Notes.final');
    expect(titleFromFilename(`${'a'.repeat(250)}.txt`)).toHaveLength(200);
    expect(titleFromFilename('.md')).toBe('Imported document');
  });
});

describe('POST /api/documents/import (e2e)', () => {
  const prisma = new PrismaClient();
  let app: NestExpressApplication;
  let user: TestUser;
  let cookie: string;
  let docx: Buffer;
  const upload = (buf: Buffer, filename: string, contentType?: string) =>
    request(app.getHttpServer())
      .post('/api/documents/import')
      .set('Cookie', cookie)
      .attach('file', buf, contentType ? { filename, contentType } : filename);

  beforeAll(async () => {
    await resetDb(prisma);
    user = await createUser(prisma, 'imp-user', 'Ivy Importer');
    app = await createApp();
    cookie = await login(app, user.email);
    docx = await buildSampleDocx();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('import .txt -> 201, title from filename, owned by caller', async () => {
    const res = await upload(fixture('sample.txt'), 'Meeting notes.txt', 'text/plain').expect(201);
    expect(res.body).toMatchObject({ title: 'Meeting notes', access: 'owner', version: 1, owner: { id: user.id } });
    expect(res.body.content.type).toBe('doc');
  });

  it('import .md -> 201 with a heading node', async () => {
    const res = await upload(fixture('sample.md'), 'kickoff.md', 'text/markdown').expect(201);
    expect(res.body.title).toBe('kickoff');
    expect(res.body.content.content[0]).toMatchObject({ type: 'heading', attrs: { level: 1 } });
  });

  it('import .docx -> 201 and appears in the owned list', async () => {
    const res = await upload(
      docx,
      'Quarterly Report.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ).expect(201);
    expect(res.body.title).toBe('Quarterly Report');
    const list = await request(app.getHttpServer()).get('/api/documents').set('Cookie', cookie).expect(200);
    expect(list.body.owned.map((d: { id: string }) => d.id)).toContain(res.body.id);
  });

  it('import .pdf -> 400 UNSUPPORTED_TYPE', async () => {
    const res = await upload(Buffer.from('%PDF-1.4'), 'paper.pdf', 'application/pdf').expect(400);
    expect(res.body.error).toEqual({ code: 'UNSUPPORTED_TYPE', message: 'Only .txt, .md and .docx files are supported' });
  });

  it('import .md with a disallowed mimetype -> 400 UNSUPPORTED_TYPE', async () => {
    const res = await upload(Buffer.from('# hi'), 'x.md', 'image/png').expect(400);
    expect(res.body.error.code).toBe('UNSUPPORTED_TYPE');
  });

  it('import an empty file -> 400 EMPTY_FILE', async () => {
    const res = await upload(Buffer.alloc(0), 'empty.txt', 'text/plain').expect(400);
    expect(res.body.error.code).toBe('EMPTY_FILE');
  });

  it('import with no file field -> 400 EMPTY_FILE', async () => {
    const res = await request(app.getHttpServer()).post('/api/documents/import').set('Cookie', cookie).expect(400);
    expect(res.body.error.code).toBe('EMPTY_FILE');
  });

  it('import a file over 5 MB -> 413 FILE_TOO_LARGE', async () => {
    const res = await upload(Buffer.alloc(5 * 1024 * 1024 + 1, 'a'), 'huge.txt', 'text/plain').expect(413);
    expect(res.body.error).toEqual({ code: 'FILE_TOO_LARGE', message: 'File is larger than 5 MB' });
  });

  it('import a corrupt .docx -> 422 UNREADABLE_FILE', async () => {
    const res = await upload(Buffer.from('not really a docx'), 'broken.docx', 'application/octet-stream').expect(422);
    expect(res.body.error).toEqual({
      code: 'UNREADABLE_FILE',
      message: "We couldn't read this file. Try saving it again as .docx or .md.",
    });
  });

  it('import from a foreign Origin -> 403 BAD_ORIGIN', async () => {
    const res = await upload(fixture('sample.txt'), 'x.txt', 'text/plain').set('Origin', 'https://evil.example').expect(403);
    expect(res.body.error.code).toBe('BAD_ORIGIN');
  });
});

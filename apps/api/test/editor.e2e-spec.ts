import { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { isValidDoc } from '../src/editor/extensions';
import { convertFileToDoc } from '../src/import/converter';
import { createApp, createUser, login, resetDb } from './helpers';

const t = (text: string, marks?: object[]) => ({ type: 'text', text, ...(marks && { marks }) });
const p = (...content: object[]) => ({ type: 'paragraph', content });
const link = (href: string) => ({ type: 'link', attrs: { href } });

// One doc using every node/mark the web editor can produce.
const RICH_DOC = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2, textAlign: 'center' }, content: [t('Centered heading')] },
    { type: 'paragraph', attrs: { textAlign: 'right' }, content: [t('right aligned')] },
    p(
      t('hi', [{ type: 'highlight' }]),
      t(' '),
      t('struck', [{ type: 'strike' }]),
      t(' '),
      t('code', [{ type: 'code' }]),
      t(' '),
      t('under', [{ type: 'underline' }]),
      t(' '),
      t('site', [link('https://example.com')]),
      t(' '),
      t('mail', [link('mailto:a@b.co')]),
    ),
    { type: 'blockquote', content: [p(t('quoted'))] },
    { type: 'codeBlock', attrs: { language: null }, content: [t('const x = 1;')] },
    {
      type: 'taskList',
      content: [
        { type: 'taskItem', attrs: { checked: true }, content: [p(t('done'))] },
        {
          type: 'taskItem',
          attrs: { checked: false },
          content: [p(t('todo')), { type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: false }, content: [p(t('nested'))] }] }],
        },
      ],
    },
    { type: 'horizontalRule' },
  ],
};

describe('Editor schema parity', () => {
  const prisma = new PrismaClient();
  let app: NestExpressApplication;
  let cookie: string;
  const http = () => request(app.getHttpServer());

  const newDoc = async (): Promise<string> =>
    (await http().post('/api/documents').set('Cookie', cookie).send({}).expect(201)).body.id as string;

  beforeAll(async () => {
    await resetDb(prisma);
    const user = await createUser(prisma, 'ed-user', 'Ed');
    app = await createApp();
    cookie = await login(app, user.email);
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('highlight, textAlign, taskList (nested), link, blockquote, codeBlock, strike, code and underline round-trip through PATCH', async () => {
    const id = await newDoc();
    await http().patch(`/api/documents/${id}`).set('Cookie', cookie).send({ content: RICH_DOC, baseVersion: 1 }).expect(200);
    const res = await http().get(`/api/documents/${id}`).set('Cookie', cookie).expect(200);
    expect(res.body.content).toEqual(RICH_DOC);
  });

  it('a javascript: link mark -> 400 INVALID_CONTENT and nothing is stored', async () => {
    const id = await newDoc();
    for (const href of ['javascript:alert(1)', ' JavaScript:alert(1)', 'data:text/html,x', 'vbscript:x', '/relative']) {
      const res = await http()
        .patch(`/api/documents/${id}`)
        .set('Cookie', cookie)
        .send({ content: { type: 'doc', content: [p(t('x', [link(href)]))] }, baseVersion: 1 })
        .expect(400);
      expect(res.body.error.code).toBe('INVALID_CONTENT');
    }
    const stored = await prisma.document.findUniqueOrThrow({ where: { id } });
    expect(JSON.stringify(stored.content)).not.toMatch(/javascript:/i);
    expect(stored.version).toBe(1);
  });

  it('unsafe textAlign values and out-of-range heading levels -> 400 INVALID_CONTENT', async () => {
    const id = await newDoc();
    for (const node of [
      { type: 'paragraph', attrs: { textAlign: 'left;background:url(x)' }, content: [t('x')] },
      { type: 'heading', attrs: { level: 4 }, content: [t('x')] },
    ]) {
      await http()
        .patch(`/api/documents/${id}`)
        .set('Cookie', cookie)
        .send({ content: { type: 'doc', content: [node] }, baseVersion: 1 })
        .expect(400);
    }
  });

  it('isValidDoc accepts the rich doc and rejects unknown node types', () => {
    expect(isValidDoc(RICH_DOC)).toBe(true);
    expect(isValidDoc({ type: 'doc', content: [{ type: 'image', attrs: { src: 'x' } }] })).toBe(false);
  });

  it('.md import keeps blockquote, code, codeBlock, strike, links and GFM task items', async () => {
    const md = [
      '> a quote',
      '',
      'Some `inline code`, ~~strike~~ and a [link](https://example.com).',
      '',
      '```',
      'block code',
      '```',
      '',
      '- [ ] open task',
      '- [x] closed task',
    ].join('\n');
    const doc = await convertFileToDoc(Buffer.from(md), 'x.md');
    const json = JSON.stringify(doc);
    expect(doc.content?.map((n) => n.type)).toEqual(['blockquote', 'paragraph', 'codeBlock', 'taskList']);
    expect(json).toContain('"type":"code"');
    expect(json).toContain('"type":"strike"');
    expect(json).toContain('"href":"https://example.com"');
    const items = doc.content?.[3].content ?? [];
    expect(items.map((i) => (i.attrs as { checked: boolean }).checked)).toEqual([false, true]);
  });

  it('.md import with a javascript: link stores the text but no javascript: href', async () => {
    const doc = await convertFileToDoc(Buffer.from('Click [x](javascript:alert(1)) and <a href="javascript:alert(2)">y</a>'), 'x.md');
    const json = JSON.stringify(doc);
    expect(json).not.toMatch(/javascript:/i);
    expect(json).toContain('"text":"Click ');
  });
});

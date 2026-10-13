import { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createApp, createUser, login, NIL_UUID, resetDb, TestUser } from './helpers';

const doc = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });

describe('Documents (e2e)', () => {
  const prisma = new PrismaClient();
  let app: NestExpressApplication;
  let owner: TestUser, editor: TestUser, viewer: TestUser, stranger: TestUser;
  let ownerC: string, editorC: string, viewerC: string, strangerC: string;
  const http = () => request(app.getHttpServer());

  // Fresh doc owned by `owner`, shared with editor (editor) and viewer (viewer).
  async function sharedDoc(title = 'Shared doc'): Promise<string> {
    const res = await http().post('/api/documents').set('Cookie', ownerC).send({ title }).expect(201);
    await prisma.documentShare.createMany({
      data: [
        { documentId: res.body.id, userId: editor.id, role: 'editor' },
        { documentId: res.body.id, userId: viewer.id, role: 'viewer' },
      ],
    });
    return res.body.id as string;
  }

  beforeAll(async () => {
    await resetDb(prisma);
    [owner, editor, viewer, stranger] = await Promise.all([
      createUser(prisma, 'doc-owner', 'Olivia Owner'),
      createUser(prisma, 'doc-editor', 'Eddie Editor'),
      createUser(prisma, 'doc-viewer', 'Vera Viewer'),
      createUser(prisma, 'doc-stranger', 'Sam Stranger'),
    ]);
    app = await createApp();
    [ownerC, editorC, viewerC, strangerC] = await Promise.all(
      [owner, editor, viewer, stranger].map((u) => login(app, u.email)),
    );
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  describe('authentication', () => {
    it('every document route without a cookie -> 401 UNAUTHENTICATED', async () => {
      for (const [method, path] of [
        ['get', '/api/documents'],
        ['post', '/api/documents'],
        ['get', `/api/documents/${NIL_UUID}`],
        ['patch', `/api/documents/${NIL_UUID}`],
        ['delete', `/api/documents/${NIL_UUID}`],
        ['post', '/api/documents/import'],
        ['get', `/api/documents/${NIL_UUID}/shares`],
      ] as const) {
        const res = await http()[method](path).expect(401);
        expect(res.body.error.code).toBe('UNAUTHENTICATED');
      }
    });
  });

  describe('create', () => {
    it('create without a title -> 201 "Untitled document" with empty doc at version 1', async () => {
      const res = await http().post('/api/documents').set('Cookie', ownerC).send({}).expect(201);
      expect(res.body).toMatchObject({
        title: 'Untitled document',
        version: 1,
        access: 'owner',
        content: { type: 'doc', content: [{ type: 'paragraph' }] },
        owner: { id: owner.id, name: 'Olivia Owner', email: owner.email },
      });
    });

    it('create with a custom title trims it', async () => {
      const res = await http().post('/api/documents').set('Cookie', ownerC).send({ title: '  My plan  ' }).expect(201);
      expect(res.body.title).toBe('My plan');
    });

    it('create with an empty title -> 400 VALIDATION_ERROR', async () => {
      const res = await http().post('/api/documents').set('Cookie', ownerC).send({ title: '   ' }).expect(400);
      expect(res.body.error).toMatchObject({ code: 'VALIDATION_ERROR', message: "Title can't be empty" });
    });

    it('create with a 201-char title -> 400 VALIDATION_ERROR', async () => {
      const res = await http().post('/api/documents').set('Cookie', ownerC).send({ title: 'x'.repeat(201) }).expect(400);
      expect(res.body.error).toMatchObject({ code: 'VALIDATION_ERROR', message: 'Title is too long' });
    });

    it('create with an unknown field -> 400 VALIDATION_ERROR', async () => {
      const res = await http().post('/api/documents').set('Cookie', ownerC).send({ ownerId: stranger.id }).expect(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('create from a foreign Origin -> 403 BAD_ORIGIN', async () => {
      const res = await http()
        .post('/api/documents')
        .set('Cookie', ownerC)
        .set('Origin', 'https://evil.example')
        .send({})
        .expect(403);
      expect(res.body.error.code).toBe('BAD_ORIGIN');
    });
  });

  describe('read', () => {
    it('owner, editor and viewer can GET the doc with their access role', async () => {
      const id = await sharedDoc();
      for (const [cookie, access] of [
        [ownerC, 'owner'],
        [editorC, 'editor'],
        [viewerC, 'viewer'],
      ]) {
        const res = await http().get(`/api/documents/${id}`).set('Cookie', cookie).expect(200);
        expect(res.body).toMatchObject({ id, access, version: 1 });
      }
    });

    it('stranger GET -> 404 NOT_FOUND (no existence leak)', async () => {
      const id = await sharedDoc();
      const res = await http().get(`/api/documents/${id}`).set('Cookie', strangerC).expect(404);
      expect(res.body).toMatchObject({ error: { code: 'NOT_FOUND', message: 'Document not found.' } });
    });

    it('nonexistent id -> 404 NOT_FOUND', async () => {
      await http().get(`/api/documents/${NIL_UUID}`).set('Cookie', ownerC).expect(404);
    });

    it('malformed uuid -> 404 NOT_FOUND (never 500)', async () => {
      const res = await http().get('/api/documents/not-a-uuid').set('Cookie', ownerC).expect(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
      await http().patch('/api/documents/123').set('Cookie', ownerC).send({ title: 'x' }).expect(404);
      await http().delete('/api/documents/abc').set('Cookie', ownerC).expect(404);
    });
  });

  describe('list', () => {
    it('list separates owned and shared docs, each sorted by updatedAt desc', async () => {
      await resetDocs();
      const older = await http().post('/api/documents').set('Cookie', ownerC).send({ title: 'Older' }).expect(201);
      await http().post('/api/documents').set('Cookie', ownerC).send({ title: 'Newer' }).expect(201);
      await prisma.documentShare.create({ data: { documentId: older.body.id, userId: editor.id, role: 'editor' } });
      await http().post('/api/documents').set('Cookie', strangerC).send({ title: 'Not mine' }).expect(201);

      const mine = await http().get('/api/documents').set('Cookie', ownerC).expect(200);
      expect(mine.body.owned.map((d: { title: string }) => d.title)).toEqual(['Newer', 'Older']);
      expect(mine.body.shared).toEqual([]);
      expect(mine.body.owned[0]).toMatchObject({ access: 'owner', owner: { id: owner.id } });
      expect(mine.body.owned[0].content).toBeUndefined();

      const theirs = await http().get('/api/documents').set('Cookie', editorC).expect(200);
      expect(theirs.body.owned).toEqual([]);
      expect(theirs.body.shared).toHaveLength(1);
      expect(theirs.body.shared[0]).toMatchObject({ title: 'Older', access: 'editor', owner: { id: owner.id } });

      // Editing Older moves it to the top of the owner's list.
      await http().patch(`/api/documents/${older.body.id}`).set('Cookie', ownerC).send({ title: 'Older edited' }).expect(200);
      const after = await http().get('/api/documents').set('Cookie', ownerC).expect(200);
      expect(after.body.owned.map((d: { title: string }) => d.title)).toEqual(['Older edited', 'Newer']);
    });

    async function resetDocs(): Promise<void> {
      await prisma.document.deleteMany({});
    }
  });

  describe('update', () => {
    it('owner title-only rename -> 200 and does not bump version', async () => {
      const id = await sharedDoc();
      const res = await http().patch(`/api/documents/${id}`).set('Cookie', ownerC).send({ title: ' Renamed ' }).expect(200);
      expect(res.body).toMatchObject({ id, title: 'Renamed', version: 1 });
      expect(Object.keys(res.body).sort()).toEqual(['id', 'title', 'updatedAt', 'version']);
    });

    it('editor title-only rename -> 200', async () => {
      const id = await sharedDoc();
      const res = await http().patch(`/api/documents/${id}`).set('Cookie', editorC).send({ title: 'By editor' }).expect(200);
      expect(res.body).toMatchObject({ title: 'By editor', version: 1 });
    });

    it('rename to empty title -> 400 VALIDATION_ERROR', async () => {
      const id = await sharedDoc();
      const res = await http().patch(`/api/documents/${id}`).set('Cookie', ownerC).send({ title: '' }).expect(400);
      expect(res.body.error.message).toBe("Title can't be empty");
    });

    it('owner content save bumps version and persists content', async () => {
      const id = await sharedDoc();
      const res = await http()
        .patch(`/api/documents/${id}`)
        .set('Cookie', ownerC)
        .send({ content: doc('hello'), baseVersion: 1 })
        .expect(200);
      expect(res.body.version).toBe(2);
      const got = await http().get(`/api/documents/${id}`).set('Cookie', ownerC).expect(200);
      expect(got.body.content).toEqual(doc('hello'));
    });

    it('editor (grantee) content save -> 200', async () => {
      const id = await sharedDoc();
      const res = await http()
        .patch(`/api/documents/${id}`)
        .set('Cookie', editorC)
        .send({ content: doc('from editor'), baseVersion: 1, title: 'Edited' })
        .expect(200);
      expect(res.body).toMatchObject({ version: 2, title: 'Edited' });
    });

    it('viewer PATCH -> 403 FORBIDDEN', async () => {
      const id = await sharedDoc();
      const res = await http().patch(`/api/documents/${id}`).set('Cookie', viewerC).send({ title: 'nope' }).expect(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('stranger PATCH -> 404 NOT_FOUND', async () => {
      const id = await sharedDoc();
      await http().patch(`/api/documents/${id}`).set('Cookie', strangerC).send({ title: 'nope' }).expect(404);
    });

    it('content without baseVersion -> 400 VALIDATION_ERROR', async () => {
      const id = await sharedDoc();
      const res = await http().patch(`/api/documents/${id}`).set('Cookie', ownerC).send({ content: doc('x') }).expect(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('stale baseVersion -> 409 VERSION_CONFLICT with currentVersion', async () => {
      const id = await sharedDoc();
      await http().patch(`/api/documents/${id}`).set('Cookie', ownerC).send({ content: doc('a'), baseVersion: 1 }).expect(200);
      const res = await http()
        .patch(`/api/documents/${id}`)
        .set('Cookie', editorC)
        .send({ content: doc('b'), baseVersion: 1 })
        .expect(409);
      expect(res.body.error).toMatchObject({ code: 'VERSION_CONFLICT', currentVersion: 2 });
    });

    it('content larger than 1 MB -> 413 CONTENT_TOO_LARGE', async () => {
      const id = await sharedDoc();
      const res = await http()
        .patch(`/api/documents/${id}`)
        .set('Cookie', ownerC)
        .send({ content: doc('x'.repeat(1024 * 1024 + 10)), baseVersion: 1 })
        .expect(413);
      expect(res.body.error).toMatchObject({ code: 'CONTENT_TOO_LARGE', message: 'Document is too large to save' });
    });

    it('request body over the 2 MB JSON limit -> 413 CONTENT_TOO_LARGE', async () => {
      const id = await sharedDoc();
      const res = await http()
        .patch(`/api/documents/${id}`)
        .set('Cookie', ownerC)
        .send({ content: doc('x'.repeat(2.5 * 1024 * 1024)), baseVersion: 1 })
        .expect(413);
      expect(res.body.error.code).toBe('CONTENT_TOO_LARGE');
    });

    it('content that is not a valid Tiptap doc -> 400 INVALID_CONTENT', async () => {
      const id = await sharedDoc();
      for (const content of [
        { type: 'paragraph' },
        { type: 'doc', content: [{ type: 'script', text: 'alert(1)' }] },
        { type: 'doc', content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'paragraph' }] }] },
      ]) {
        const res = await http().patch(`/api/documents/${id}`).set('Cookie', ownerC).send({ content, baseVersion: 1 }).expect(400);
        expect(res.body.error.code).toBe('INVALID_CONTENT');
      }
    });
  });

  describe('delete', () => {
    it('grantee DELETE -> 403 FORBIDDEN', async () => {
      const id = await sharedDoc();
      const res = await http().delete(`/api/documents/${id}`).set('Cookie', editorC).expect(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      await http().delete(`/api/documents/${id}`).set('Cookie', viewerC).expect(403);
    });

    it('stranger DELETE -> 404 NOT_FOUND', async () => {
      const id = await sharedDoc();
      await http().delete(`/api/documents/${id}`).set('Cookie', strangerC).expect(404);
    });

    it('owner DELETE -> 204, shares cascade, grantee then gets 404 and loses it from shared list', async () => {
      const id = await sharedDoc('To delete');
      await http().delete(`/api/documents/${id}`).set('Cookie', ownerC).expect(204);
      await http().get(`/api/documents/${id}`).set('Cookie', editorC).expect(404);
      await http().get(`/api/documents/${id}`).set('Cookie', ownerC).expect(404);
      const list = await http().get('/api/documents').set('Cookie', editorC).expect(200);
      expect(list.body.shared.find((d: { id: string }) => d.id === id)).toBeUndefined();
      expect(await prisma.documentShare.count({ where: { documentId: id } })).toBe(0);
    });
  });

  describe('sharing permissions', () => {
    it('grantee (editor) cannot share or list shares -> 403', async () => {
      const id = await sharedDoc();
      const res = await http()
        .post(`/api/documents/${id}/shares`)
        .set('Cookie', editorC)
        .send({ email: stranger.email })
        .expect(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      await http().get(`/api/documents/${id}/shares`).set('Cookie', editorC).expect(403);
      await http().delete(`/api/documents/${id}/shares/${viewer.id}`).set('Cookie', editorC).expect(403);
    });

    it('stranger share routes -> 404', async () => {
      const id = await sharedDoc();
      await http().get(`/api/documents/${id}/shares`).set('Cookie', strangerC).expect(404);
      await http().post(`/api/documents/${id}/shares`).set('Cookie', strangerC).send({ email: stranger.email }).expect(404);
    });
  });
});

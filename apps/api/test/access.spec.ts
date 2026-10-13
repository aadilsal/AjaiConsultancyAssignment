import { PrismaClient } from '@prisma/client';
import { AccessService } from '../src/access/access.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { createUser, NIL_UUID, resetDb, TestUser } from './helpers';

describe('AccessService.getDocumentAccess', () => {
  const prisma = new PrismaClient();
  const access = new AccessService(prisma as unknown as PrismaService);
  let owner: TestUser, editor: TestUser, viewer: TestUser, stranger: TestUser;
  let docId: string;

  beforeAll(async () => {
    await resetDb(prisma);
    [owner, editor, viewer, stranger] = await Promise.all(
      ['owner', 'editor', 'viewer', 'stranger'].map((k) => createUser(prisma, `acc-${k}`)),
    );
    const doc = await prisma.document.create({ data: { ownerId: owner.id, title: 'Doc', content: { type: 'doc' } } });
    docId = doc.id;
    await prisma.documentShare.createMany({
      data: [
        { documentId: docId, userId: editor.id, role: 'editor' },
        { documentId: docId, userId: viewer.id, role: 'viewer' },
      ],
    });
  });

  afterAll(() => prisma.$disconnect());

  it('owner gets owner', async () => {
    expect(await access.getDocumentAccess(owner.id, docId)).toBe('owner');
  });

  it('editor grantee gets editor', async () => {
    expect(await access.getDocumentAccess(editor.id, docId)).toBe('editor');
  });

  it('viewer grantee gets viewer', async () => {
    expect(await access.getDocumentAccess(viewer.id, docId)).toBe('viewer');
  });

  it('stranger gets null', async () => {
    expect(await access.getDocumentAccess(stranger.id, docId)).toBeNull();
  });

  it('nonexistent doc gets null', async () => {
    expect(await access.getDocumentAccess(owner.id, NIL_UUID)).toBeNull();
  });

  it('malformed doc id gets null instead of throwing', async () => {
    expect(await access.getDocumentAccess(owner.id, 'not-a-uuid')).toBeNull();
  });

  it('revoked grantee gets null', async () => {
    await prisma.documentShare.deleteMany({ where: { documentId: docId, userId: editor.id } });
    expect(await access.getDocumentAccess(editor.id, docId)).toBeNull();
  });

  it('requireAccess: no access -> 404 NOT_FOUND, wrong role -> 403 FORBIDDEN', async () => {
    await expect(access.requireAccess(stranger.id, docId, ['owner'])).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(access.requireAccess(viewer.id, docId, ['owner', 'editor'])).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await expect(access.requireAccess(owner.id, docId, ['owner'])).resolves.toBe('owner');
  });
});

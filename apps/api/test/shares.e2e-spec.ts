import { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createApp, createUser, login, NIL_UUID, resetDb, TestUser } from './helpers';

describe('Shares (e2e)', () => {
  const prisma = new PrismaClient();
  let app: NestExpressApplication;
  let owner: TestUser, bob: TestUser, carol: TestUser;
  let ownerC: string, bobC: string, carolC: string;
  const http = () => request(app.getHttpServer());

  const newDoc = async (title = 'Plan'): Promise<string> =>
    (await http().post('/api/documents').set('Cookie', ownerC).send({ title }).expect(201)).body.id as string;

  beforeAll(async () => {
    await resetDb(prisma);
    [owner, bob, carol] = await Promise.all([
      createUser(prisma, 'sh-owner', 'Olivia Owner'),
      createUser(prisma, 'sh-bob', 'Bob Smith'),
      createUser(prisma, 'sh-carol', 'Carol Diaz'),
    ]);
    app = await createApp();
    [ownerC, bobC, carolC] = await Promise.all([owner, bob, carol].map((u) => login(app, u.email)));
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('share with an unknown email -> 404 USER_NOT_FOUND', async () => {
    const id = await newDoc();
    const res = await http().post(`/api/documents/${id}/shares`).set('Cookie', ownerC).send({ email: 'nobody@test.local' }).expect(404);
    expect(res.body.error).toEqual({ code: 'USER_NOT_FOUND', message: 'No user with that email' });
  });

  it('share with yourself -> 422 SELF_SHARE', async () => {
    const id = await newDoc();
    const res = await http().post(`/api/documents/${id}/shares`).set('Cookie', ownerC).send({ email: owner.email }).expect(422);
    expect(res.body.error).toEqual({ code: 'SELF_SHARE', message: 'You already own this document' });
  });

  it('share with an invalid email or role -> 400 VALIDATION_ERROR', async () => {
    const id = await newDoc();
    await http().post(`/api/documents/${id}/shares`).set('Cookie', ownerC).send({ email: 'bad' }).expect(400);
    await http().post(`/api/documents/${id}/shares`).set('Cookie', ownerC).send({ email: bob.email, role: 'owner' }).expect(400);
  });

  it('share success -> 201 editor by default; grantee sees it under shared and can open it', async () => {
    const id = await newDoc('Shared plan');
    const res = await http()
      .post(`/api/documents/${id}/shares`)
      .set('Cookie', ownerC)
      .send({ email: `  ${bob.email.toUpperCase()} ` })
      .expect(201);
    expect(res.body).toMatchObject({ userId: bob.id, name: 'Bob Smith', email: bob.email, role: 'editor' });
    expect(res.body.createdAt).toBeDefined();

    const list = await http().get('/api/documents').set('Cookie', bobC).expect(200);
    expect(list.body.shared).toEqual([expect.objectContaining({ id, title: 'Shared plan', access: 'editor' })]);
    await http().get(`/api/documents/${id}`).set('Cookie', bobC).expect(200);
  });

  it('share as viewer -> grantee has viewer access', async () => {
    const id = await newDoc();
    await http().post(`/api/documents/${id}/shares`).set('Cookie', ownerC).send({ email: carol.email, role: 'viewer' }).expect(201);
    const res = await http().get(`/api/documents/${id}`).set('Cookie', carolC).expect(200);
    expect(res.body.access).toBe('viewer');
  });

  it('duplicate share -> 409 ALREADY_SHARED naming the user', async () => {
    const id = await newDoc();
    await http().post(`/api/documents/${id}/shares`).set('Cookie', ownerC).send({ email: bob.email }).expect(201);
    const res = await http().post(`/api/documents/${id}/shares`).set('Cookie', ownerC).send({ email: bob.email }).expect(409);
    expect(res.body.error).toEqual({ code: 'ALREADY_SHARED', message: 'Already shared with Bob Smith' });
  });

  it('owner lists shares -> owner plus each grantee', async () => {
    const id = await newDoc();
    await http().post(`/api/documents/${id}/shares`).set('Cookie', ownerC).send({ email: bob.email }).expect(201);
    await http().post(`/api/documents/${id}/shares`).set('Cookie', ownerC).send({ email: carol.email, role: 'viewer' }).expect(201);
    const res = await http().get(`/api/documents/${id}/shares`).set('Cookie', ownerC).expect(200);
    expect(res.body.owner).toEqual({ id: owner.id, name: 'Olivia Owner', email: owner.email });
    expect(res.body.shares).toEqual([
      expect.objectContaining({ userId: bob.id, role: 'editor' }),
      expect.objectContaining({ userId: carol.id, role: 'viewer' }),
    ]);
  });

  it('revoke -> 204; grantee immediately gets 404 and loses it from shared list', async () => {
    const id = await newDoc();
    await http().post(`/api/documents/${id}/shares`).set('Cookie', ownerC).send({ email: bob.email }).expect(201);
    await http().delete(`/api/documents/${id}/shares/${bob.id}`).set('Cookie', ownerC).expect(204);
    const res = await http().get(`/api/documents/${id}`).set('Cookie', bobC).expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    const list = await http().get('/api/documents').set('Cookie', bobC).expect(200);
    expect(list.body.shared.find((d: { id: string }) => d.id === id)).toBeUndefined();
  });

  it('revoke a share that does not exist -> 404', async () => {
    const id = await newDoc();
    await http().delete(`/api/documents/${id}/shares/${carol.id}`).set('Cookie', ownerC).expect(404);
    await http().delete(`/api/documents/${id}/shares/${NIL_UUID}`).set('Cookie', ownerC).expect(404);
    await http().delete(`/api/documents/${id}/shares/not-a-uuid`).set('Cookie', ownerC).expect(404);
  });

  it('share from a foreign Origin -> 403 BAD_ORIGIN', async () => {
    const id = await newDoc();
    const res = await http()
      .post(`/api/documents/${id}/shares`)
      .set('Cookie', ownerC)
      .set('Origin', 'https://evil.example')
      .send({ email: bob.email })
      .expect(403);
    expect(res.body.error.code).toBe('BAD_ORIGIN');
  });
});

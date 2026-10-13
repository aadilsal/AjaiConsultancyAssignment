import { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createApp, createUser, login, randomIp, resetDb } from './helpers';

describe('Register (e2e)', () => {
  const prisma = new PrismaClient();
  let app: NestExpressApplication;
  const register = (body: object, ip = randomIp()) =>
    request(app.getHttpServer()).post('/api/auth/register').set('X-Forwarded-For', ip).send(body);

  beforeAll(async () => {
    await resetDb(prisma);
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('register -> 201 {user}, Location /api/auth/me, session cookie that works on /me', async () => {
    const res = await register({ name: '  Dana Lee ', email: ' Dana@Test.Local ', password: 'secret123' }).expect(201);
    expect(res.body.user).toMatchObject({ name: 'Dana Lee', email: 'dana@test.local', id: expect.any(String) });
    expect(res.headers.location).toBe('/api/auth/me');
    const cookie = ([] as string[]).concat(res.headers['set-cookie'])[0];
    expect(cookie).toMatch(/^ajaia_session=.*HttpOnly/i);
    const me = await request(app.getHttpServer()).get('/api/auth/me').set('Cookie', cookie.split(';')[0]).expect(200);
    expect(me.body.user.email).toBe('dana@test.local');
    const stored = await prisma.user.findUniqueOrThrow({ where: { email: 'dana@test.local' } });
    expect(stored.passwordHash).not.toBe('secret123');
  });

  it('registered user can log in with the new password', async () => {
    await register({ name: 'Eve', email: 'eve@test.local', password: 'passw0rd!' }).expect(201);
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('X-Forwarded-For', randomIp())
      .send({ email: 'eve@test.local', password: 'passw0rd!' })
      .expect(200);
  });

  it('duplicate email (case-insensitive) -> 409 EMAIL_TAKEN', async () => {
    await register({ name: 'Finn', email: 'finn@test.local', password: 'secret123' }).expect(201);
    const res = await register({ name: 'Finn 2', email: 'FINN@test.local', password: 'secret123' }).expect(409);
    expect(res.body.error).toMatchObject({ code: 'EMAIL_TAKEN', message: 'An account with this email already exists.' });
  });

  it.each([
    ['too short', 'abc12'],
    ['no number', 'abcdefgh'],
    ['no letter', '12345678'],
    ['longer than 72 chars', `a1${'x'.repeat(71)}`],
  ])('weak password (%s) -> 400 VALIDATION_ERROR with details', async (_label, password) => {
    const res = await register({ name: 'Gus', email: 'gus@test.local', password }).expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  it('invalid email, empty name or unknown field -> 400 VALIDATION_ERROR', async () => {
    await register({ name: 'Hal', email: 'not-an-email', password: 'secret123' }).expect(400);
    await register({ name: '   ', email: 'hal@test.local', password: 'secret123' }).expect(400);
    await register({ name: 'x'.repeat(81), email: 'hal@test.local', password: 'secret123' }).expect(400);
    await register({ name: 'Hal', email: 'hal@test.local', password: 'secret123', role: 'admin' }).expect(400);
    expect(await prisma.user.count({ where: { email: 'hal@test.local' } })).toBe(0);
  });

  it('register from a foreign Origin -> 403 BAD_ORIGIN', async () => {
    const res = await register({ name: 'Ivy', email: 'ivy@test.local', password: 'secret123' })
      .set('Origin', 'https://evil.example')
      .expect(403);
    expect(res.body.error.code).toBe('BAD_ORIGIN');
  });

  it('6th register attempt within a minute from one IP -> 429 RATE_LIMITED', async () => {
    const ip = '192.0.2.44';
    for (let i = 0; i < 5; i++) await register({ name: 'R', email: `r${i}@x`, password: 'x' }, ip).expect(400);
    const res = await register({ name: 'R', email: 'r6@test.local', password: 'secret123' }, ip).expect(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });

  it('newly registered user can receive a share by email and sees it under shared', async () => {
    const owner = await createUser(prisma, 'reg-owner', 'Olive');
    const ownerC = await login(app, owner.email);
    const reg = await register({ name: 'Newbie', email: 'newbie@test.local', password: 'secret123' }).expect(201);
    const newbieC = ([] as string[]).concat(reg.headers['set-cookie'])[0].split(';')[0];

    const doc = await request(app.getHttpServer()).post('/api/documents').set('Cookie', ownerC).send({ title: 'Welcome' }).expect(201);
    await request(app.getHttpServer())
      .post(`/api/documents/${doc.body.id}/shares`)
      .set('Cookie', ownerC)
      .send({ email: 'newbie@test.local' })
      .expect(201);
    const list = await request(app.getHttpServer()).get('/api/documents').set('Cookie', newbieC).expect(200);
    expect(list.body.shared).toEqual([expect.objectContaining({ id: doc.body.id, title: 'Welcome', access: 'editor' })]);
  });
});

import { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createApp, createUser, login, PASSWORD, randomIp, resetDb, TestUser } from './helpers';

describe('Auth (e2e)', () => {
  const prisma = new PrismaClient();
  let app: NestExpressApplication;
  let alice: TestUser;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    await resetDb(prisma);
    alice = await createUser(prisma, 'auth-alice', 'Alice');
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('login with valid credentials returns the user and sets an httpOnly SameSite=Lax cookie', async () => {
    const res = await http()
      .post('/api/auth/login')
      .set('X-Forwarded-For', randomIp())
      .send({ email: alice.email, password: PASSWORD })
      .expect(200);
    expect(res.body).toEqual({ user: { id: alice.id, email: alice.email, name: 'Alice' } });
    const cookie = ([] as string[]).concat(res.headers['set-cookie'])[0];
    expect(cookie).toMatch(/^ajaia_session=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Max-Age=604800/);
    expect(cookie).toMatch(/Path=\//);
  });

  it('login normalises email case and whitespace', async () => {
    await http()
      .post('/api/auth/login')
      .set('X-Forwarded-For', randomIp())
      .send({ email: `  ${alice.email.toUpperCase()} `, password: PASSWORD })
      .expect(200);
  });

  it('wrong password -> 401 INVALID_CREDENTIALS', async () => {
    const res = await http()
      .post('/api/auth/login')
      .set('X-Forwarded-For', randomIp())
      .send({ email: alice.email, password: 'nope' })
      .expect(401);
    expect(res.body).toEqual({ error: { code: 'INVALID_CREDENTIALS', message: 'Incorrect email or password' } });
  });

  it('unknown email -> same 401 INVALID_CREDENTIALS', async () => {
    const res = await http()
      .post('/api/auth/login')
      .set('X-Forwarded-For', randomIp())
      .send({ email: 'ghost@test.local', password: PASSWORD })
      .expect(401);
    expect(res.body).toEqual({ error: { code: 'INVALID_CREDENTIALS', message: 'Incorrect email or password' } });
  });

  it('invalid login body -> 400 VALIDATION_ERROR with details', async () => {
    const res = await http()
      .post('/api/auth/login')
      .set('X-Forwarded-For', randomIp())
      .send({ email: 'not-an-email', password: PASSWORD, extra: 1 })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(typeof res.body.error.message).toBe('string');
    expect(res.body.error.details.length).toBeGreaterThanOrEqual(2);
  });

  it('GET /me without a cookie -> 401 UNAUTHENTICATED', async () => {
    const res = await http().get('/api/auth/me').expect(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('GET /me with a tampered cookie -> 401 UNAUTHENTICATED', async () => {
    const res = await http().get('/api/auth/me').set('Cookie', 'ajaia_session=garbage.token.here').expect(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('GET /me with a session cookie returns the user', async () => {
    const cookie = await login(app, alice.email);
    const res = await http().get('/api/auth/me').set('Cookie', cookie).expect(200);
    expect(res.body.user).toEqual({ id: alice.id, email: alice.email, name: 'Alice' });
  });

  it('logout -> 204 and clears the session cookie', async () => {
    const cookie = await login(app, alice.email);
    const res = await http().post('/api/auth/logout').set('Cookie', cookie).expect(204);
    const cleared = ([] as string[]).concat(res.headers['set-cookie'])[0];
    expect(cleared).toMatch(/^ajaia_session=;/);
    expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970/);
  });

  it('login from a foreign Origin -> 403 BAD_ORIGIN', async () => {
    const res = await http()
      .post('/api/auth/login')
      .set('Origin', 'https://evil.example')
      .send({ email: alice.email, password: PASSWORD })
      .expect(403);
    expect(res.body.error.code).toBe('BAD_ORIGIN');
  });

  it('login from an allowed Origin succeeds', async () => {
    await http()
      .post('/api/auth/login')
      .set('Origin', 'http://localhost:3000')
      .set('X-Forwarded-For', randomIp())
      .send({ email: alice.email, password: PASSWORD })
      .expect(200);
  });

  it('6th login attempt within a minute from one IP -> 429 RATE_LIMITED', async () => {
    const ip = '203.0.113.7';
    for (let i = 0; i < 5; i++) {
      await http().post('/api/auth/login').set('X-Forwarded-For', ip).send({ email: alice.email, password: 'x' }).expect(401);
    }
    const res = await http()
      .post('/api/auth/login')
      .set('X-Forwarded-For', ip)
      .send({ email: alice.email, password: PASSWORD })
      .expect(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });
});

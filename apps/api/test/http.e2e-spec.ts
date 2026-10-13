import { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { validateEnv } from '../src/config/env';
import { createApp, createUser, login, randomIp, resetDb, TestUser } from './helpers';

const UUID = /^[0-9a-f-]{36}$/;

describe('HTTP conventions (e2e)', () => {
  const prisma = new PrismaClient();
  let app: NestExpressApplication;
  let alice: TestUser, bob: TestUser;
  let aliceC: string, bobC: string;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    await resetDb(prisma);
    [alice, bob] = await Promise.all([createUser(prisma, 'http-alice', 'Alice'), createUser(prisma, 'http-bob', 'Bob')]);
    app = await createApp();
    [aliceC, bobC] = await Promise.all([login(app, alice.email), login(app, bob.email)]);
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  describe('request ids', () => {
    it('generates an X-Request-Id when none is sent', async () => {
      const res = await http().get('/api/health/live').expect(200);
      expect(res.headers['x-request-id']).toMatch(UUID);
    });

    it('echoes a sane incoming X-Request-Id', async () => {
      const res = await http().get('/api/health/live').set('X-Request-Id', 'trace-abc_123').expect(200);
      expect(res.headers['x-request-id']).toBe('trace-abc_123');
    });

    it('replaces an unsafe incoming X-Request-Id', async () => {
      const res = await http().get('/api/health/live').set('X-Request-Id', 'bad id <script>').expect(200);
      expect(res.headers['x-request-id']).toMatch(UUID);
    });

    it('error bodies include the requestId matching the header', async () => {
      const res = await http().get('/api/auth/me').set('X-Request-Id', 'err-trace-1').expect(401);
      expect(res.body.error).toMatchObject({ code: 'UNAUTHENTICATED', requestId: 'err-trace-1' });
    });
  });

  describe('versioning', () => {
    it('/api/v1/... serves the same routes as /api/...', async () => {
      const v1 = await http().get('/api/v1/documents').set('Cookie', aliceC).expect(200);
      const plain = await http().get('/api/documents').set('Cookie', aliceC).expect(200);
      expect(v1.body).toEqual(plain.body);
      await http().get('/api/v1/health').expect(200);
    });

    it('login works through /api/v1', async () => {
      await http()
        .post('/api/v1/auth/login')
        .set('X-Forwarded-For', randomIp())
        .send({ email: alice.email, password: 'demo1234' })
        .expect(200);
    });

    it('OpenAPI lists v1 paths, servers, contact and licence', async () => {
      const res = await http().get('/api/docs-json').expect(200);
      expect(Object.keys(res.body.paths)).toEqual(expect.arrayContaining(['/api/v1/documents', '/api/documents']));
      expect(res.body.servers.length).toBeGreaterThan(0);
      expect(res.body.info).toMatchObject({ version: '1.0.0', license: { name: 'UNLICENSED' } });
      expect(res.body.info.contact).toBeDefined();
      expect(res.body.components.schemas.ErrorBody.properties).toHaveProperty('requestId');
    });
  });

  describe('HTTP semantics', () => {
    it('POST /documents -> 201 with a Location header for the new resource', async () => {
      const res = await http().post('/api/documents').set('Cookie', aliceC).send({ title: 'Loc' }).expect(201);
      expect(res.headers.location).toBe(`/api/documents/${res.body.id}`);
    });

    it('POST /documents/import -> 201 with a Location header', async () => {
      const res = await http()
        .post('/api/documents/import')
        .set('Cookie', aliceC)
        .attach('file', Buffer.from('hello'), { filename: 'n.txt', contentType: 'text/plain' })
        .expect(201);
      expect(res.headers.location).toBe(`/api/documents/${res.body.id}`);
    });

    it('POST /documents/:id/shares -> 201 with a Location header for the share', async () => {
      const doc = await http().post('/api/documents').set('Cookie', aliceC).send({}).expect(201);
      const res = await http()
        .post(`/api/documents/${doc.body.id}/shares`)
        .set('Cookie', aliceC)
        .send({ email: bob.email })
        .expect(201);
      expect(res.headers.location).toBe(`/api/documents/${doc.body.id}/shares/${bob.id}`);
    });

    it('API responses (success and error) send Cache-Control: no-store', async () => {
      const ok = await http().get('/api/documents').set('Cookie', aliceC).expect(200);
      expect(ok.headers['cache-control']).toBe('no-store');
      const err = await http().get('/api/documents').expect(401);
      expect(err.headers['cache-control']).toBe('no-store');
    });

    it('non-JSON body on a JSON route -> 415 UNSUPPORTED_MEDIA_TYPE', async () => {
      const res = await http()
        .post('/api/documents')
        .set('Cookie', aliceC)
        .set('Content-Type', 'text/plain')
        .send('title=hi')
        .expect(415);
      expect(res.body.error).toMatchObject({ code: 'UNSUPPORTED_MEDIA_TYPE', requestId: expect.any(String) });
    });

    it('form-encoded login -> 415 UNSUPPORTED_MEDIA_TYPE', async () => {
      await http().post('/api/auth/login').type('form').send({ email: alice.email, password: 'demo1234' }).expect(415);
    });

    it('JSON body on the multipart import route -> 415', async () => {
      await http().post('/api/documents/import').set('Cookie', aliceC).send({ file: 'x' }).expect(415);
    });

    it('malformed JSON -> 400 VALIDATION_ERROR', async () => {
      const res = await http()
        .post('/api/documents')
        .set('Cookie', aliceC)
        .set('Content-Type', 'application/json')
        .send('{"title":')
        .expect(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('unknown route or method -> 404 NOT_FOUND envelope', async () => {
      const res = await http().put('/api/documents').set('Cookie', aliceC).send({}).expect(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('responses expose rate-limit headers', async () => {
      const res = await http().get('/api/documents').set('Cookie', aliceC).expect(200);
      expect(res.headers['x-ratelimit-limit']).toBeDefined();
      expect(res.headers['x-ratelimit-remaining']).toBeDefined();
    });

    it('429 responses include Retry-After', async () => {
      const ip = '198.51.100.9';
      for (let i = 0; i < 5; i++) {
        await http().post('/api/auth/login').set('X-Forwarded-For', ip).send({ email: 'x@y.z', password: 'x' });
      }
      const res = await http().post('/api/auth/login').set('X-Forwarded-For', ip).send({ email: 'x@y.z', password: 'x' }).expect(429);
      expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
    });

    it('large responses are gzip-compressed when the client accepts it', async () => {
      const res = await http().get('/api/docs-json').set('Accept-Encoding', 'gzip').expect(200);
      expect(res.headers['content-encoding']).toBe('gzip');
    });

    it('no X-Powered-By, and no HSTS when COOKIE_SECURE=false', async () => {
      const res = await http().get('/api/health').expect(200);
      expect(res.headers['x-powered-by']).toBeUndefined();
      expect(res.headers['strict-transport-security']).toBeUndefined();
    });
  });

  describe('health probes', () => {
    it('GET /api/health/live -> 200 without touching the DB', async () => {
      const res = await http().get('/api/health/live').expect(200);
      expect(res.body).toMatchObject({ status: 'ok', uptimeSeconds: expect.any(Number) });
    });

    it('GET /api/health/ready -> 200 when the DB is reachable', async () => {
      const res = await http().get('/api/health/ready').expect(200);
      expect(res.body).toEqual({ status: 'ok', db: 'ok' });
    });
  });

  describe('pagination', () => {
    it('GET /documents pages owned and shared lists with limit + cursor', async () => {
      await prisma.document.deleteMany({});
      for (let i = 1; i <= 5; i++) {
        await http().post('/api/documents').set('Cookie', aliceC).send({ title: `A${i}` }).expect(201);
      }
      for (let i = 1; i <= 3; i++) {
        const d = await http().post('/api/documents').set('Cookie', bobC).send({ title: `B${i}` }).expect(201);
        await prisma.documentShare.create({ data: { documentId: d.body.id, userId: alice.id } });
      }

      const p1 = await http().get('/api/documents?limit=2').set('Cookie', aliceC).expect(200);
      expect(p1.body.owned.map((d: { title: string }) => d.title)).toEqual(['A5', 'A4']);
      expect(p1.body.shared.map((d: { title: string }) => d.title)).toEqual(['B3', 'B2']);
      expect(p1.body.nextCursor.owned).toEqual(expect.any(String));
      expect(p1.body.nextCursor.shared).toEqual(expect.any(String));

      const titles: string[] = p1.body.owned.map((d: { title: string }) => d.title);
      let cursor: string | null = p1.body.nextCursor.owned;
      while (cursor) {
        const page = await http().get(`/api/documents?limit=2&cursor=${cursor}`).set('Cookie', aliceC).expect(200);
        expect(page.body.shared).toEqual([]);
        titles.push(...page.body.owned.map((d: { title: string }) => d.title));
        cursor = page.body.nextCursor.owned;
      }
      expect(titles).toEqual(['A5', 'A4', 'A3', 'A2', 'A1']);

      const s2 = await http().get(`/api/documents?limit=2&cursor=${p1.body.nextCursor.shared}`).set('Cookie', aliceC).expect(200);
      expect(s2.body.owned).toEqual([]);
      expect(s2.body.shared.map((d: { title: string }) => d.title)).toEqual(['B1']);
      expect(s2.body.nextCursor).toEqual({ owned: null, shared: null });
    });

    it('default page returns everything under 50 with null cursors (backwards compatible)', async () => {
      const res = await http().get('/api/documents').set('Cookie', aliceC).expect(200);
      expect(res.body.owned).toHaveLength(5);
      expect(res.body.nextCursor).toEqual({ owned: null, shared: null });
    });

    it('bad limit or cursor -> 400 VALIDATION_ERROR', async () => {
      for (const qs of ['limit=0', 'limit=101', 'limit=abc', 'cursor=not-a-cursor', 'foo=bar']) {
        const res = await http().get(`/api/documents?${qs}`).set('Cookie', aliceC).expect(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('config validation', () => {
    const base = { DATABASE_URL: 'postgres://x', SESSION_SECRET: 'x'.repeat(32) };

    it('TRUST_PROXY_HOPS defaults to 1 and accepts 2', () => {
      expect(validateEnv(base).TRUST_PROXY_HOPS).toBe(1);
      expect(validateEnv({ ...base, TRUST_PROXY_HOPS: '2' }).TRUST_PROXY_HOPS).toBe(2);
    });

    it('rejects a bad TRUST_PROXY_HOPS, short secret or missing DATABASE_URL at boot', () => {
      expect(() => validateEnv({ ...base, TRUST_PROXY_HOPS: 'abc' })).toThrow(/TRUST_PROXY_HOPS/);
      expect(() => validateEnv({ ...base, SESSION_SECRET: 'short' })).toThrow(/SESSION_SECRET/);
      expect(() => validateEnv({ SESSION_SECRET: 'x'.repeat(32) })).toThrow(/DATABASE_URL/);
    });

    it('COOKIE_SECURE defaults to true in production', () => {
      expect(validateEnv({ ...base, NODE_ENV: 'production' }).COOKIE_SECURE).toBe(true);
      expect(validateEnv({ ...base, NODE_ENV: 'production', COOKIE_SECURE: 'false' }).COOKIE_SECURE).toBe(false);
    });
  });
});

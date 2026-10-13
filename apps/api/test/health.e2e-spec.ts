import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createApp } from './helpers';

describe('Health + docs (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(() => app.close());

  it('GET /api/health is public and reports db ok', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.body).toEqual({ status: 'ok', db: 'ok' });
  });

  it('GET /api/health -> 503 when the database is down', async () => {
    const prisma = app.get(PrismaService);
    const spy = jest.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('db down'));
    const res = await request(app.getHttpServer()).get('/api/health').expect(503);
    expect(res.body).toEqual({ status: 'error', db: 'down' });
    spy.mockRestore();
  });

  it('responses carry helmet security headers', async () => {
    const res = await request(app.getHttpServer()).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBeDefined();
  });

  it('OpenAPI JSON is served at /api/docs-json and lists the document routes', async () => {
    const res = await request(app.getHttpServer()).get('/api/docs-json').expect(200);
    expect(res.body.openapi).toMatch(/^3\./);
    expect(Object.keys(res.body.paths)).toEqual(
      expect.arrayContaining(['/api/documents', '/api/documents/{id}', '/api/documents/import', '/api/auth/login']),
    );
  });

  it('Swagger UI is served at /api/docs', async () => {
    const res = await request(app.getHttpServer()).get('/api/docs').redirects(1).expect(200);
    expect(res.text).toMatch(/swagger/i);
  });

  it('unknown route -> 404 in the error envelope', async () => {
    const res = await request(app.getHttpServer()).get('/api/nope').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

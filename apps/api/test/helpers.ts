import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/setup';

export const PASSWORD = 'demo1234';

export interface TestUser {
  id: string;
  email: string;
  name: string;
}

export async function createApp(): Promise<NestExpressApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false, logger: false });
  configureApp(app);
  await app.init();
  return app;
}

export async function resetDb(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe('TRUNCATE document_shares, documents, users RESTART IDENTITY CASCADE');
}

let hash: string | undefined;

export async function createUser(prisma: PrismaClient, key: string, name = key): Promise<TestUser> {
  hash ??= await bcrypt.hash(PASSWORD, 4);
  return prisma.user.create({
    data: { email: `${key}@test.local`, name, passwordHash: hash },
    select: { id: true, email: true, name: true },
  });
}

// Random client IP per login so the 5/min login limit never trips other tests.
export const randomIp = (): string => `10.${randomInt(255)}.${randomInt(255)}.${randomInt(1, 255)}`;

export async function login(app: NestExpressApplication, email: string): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .set('X-Forwarded-For', randomIp())
    .send({ email, password: PASSWORD })
    .expect(200);
  const cookie = ([] as string[]).concat(res.headers['set-cookie'] ?? [])[0];
  return cookie.split(';')[0];
}

export const NIL_UUID = '00000000-0000-4000-8000-000000000000';

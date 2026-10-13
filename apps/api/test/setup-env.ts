import { readFileSync } from 'fs';
import { join } from 'path';

// Loads .env.test into process.env before any module (Prisma, Nest) reads it.
export function loadTestEnv(): void {
  process.env.NODE_ENV = 'test';
  const raw = readFileSync(join(__dirname, '..', '.env.test'), 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m) process.env[m[1]] = m[2];
  }
}

loadTestEnv();

import { execSync } from 'child_process';
import { join } from 'path';
import { loadTestEnv } from './setup-env';

// Applies migrations to the test database once per run.
export default function globalSetup(): void {
  loadTestEnv();
  execSync('npx prisma migrate deploy', {
    cwd: join(__dirname, '..'),
    env: process.env,
    stdio: 'ignore',
  });
}

export interface AppEnv {
  DATABASE_URL: string;
  SESSION_SECRET: string;
  COOKIE_SECURE: boolean;
  ALLOWED_ORIGINS: string[];
  PORT: number;
  NODE_ENV: string;
  THROTTLE_LIMIT: number;
}

// Fails fast at boot on missing or weak config.
export function validateEnv(raw: Record<string, unknown>): AppEnv {
  const get = (k: string): string => (typeof raw[k] === 'string' ? (raw[k] as string).trim() : '');
  const nodeEnv = get('NODE_ENV') || 'development';
  const errors: string[] = [];
  if (!get('DATABASE_URL')) errors.push('DATABASE_URL is required');
  if (get('SESSION_SECRET').length < 32) errors.push('SESSION_SECRET must be at least 32 characters');
  const cookieRaw = get('COOKIE_SECURE');
  if (cookieRaw && !['true', 'false'].includes(cookieRaw)) errors.push('COOKIE_SECURE must be "true" or "false"');
  const port = Number(get('PORT') || 4000);
  if (!Number.isInteger(port) || port <= 0) errors.push('PORT must be a positive integer');
  if (errors.length) throw new Error(`Invalid environment: ${errors.join('; ')}`);
  return {
    DATABASE_URL: get('DATABASE_URL'),
    SESSION_SECRET: get('SESSION_SECRET'),
    COOKIE_SECURE: cookieRaw ? cookieRaw === 'true' : nodeEnv === 'production',
    ALLOWED_ORIGINS: get('ALLOWED_ORIGINS')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    PORT: port,
    NODE_ENV: nodeEnv,
    THROTTLE_LIMIT: Number(get('THROTTLE_LIMIT') || 120),
  };
}

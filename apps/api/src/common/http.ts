import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { AuthUser } from './decorators';

export const REQUEST_ID_HEADER = 'X-Request-Id';
const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{1,128}$/;

export type AppRequest = Request & { id?: string; user?: AuthUser };

// Reuses a sane incoming X-Request-Id or mints a UUID; echoes it back.
export function requestId(req: AppRequest, res: Response, next: NextFunction): void {
  const incoming = req.header(REQUEST_ID_HEADER);
  req.id = incoming && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader(REQUEST_ID_HEADER, req.id);
  next();
}

// API data is per-user; never let browsers or proxies cache it.
export function noStore(req: Request, res: Response, next: NextFunction): void {
  if (!req.path.startsWith('/api/docs')) res.setHeader('Cache-Control', 'no-store');
  next();
}

const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH']);

function hasBody(req: Request): boolean {
  return Number(req.headers['content-length'] ?? 0) > 0 || req.headers['transfer-encoding'] !== undefined;
}

// 415 for bodies in the wrong media type (JSON everywhere, multipart for import).
export function enforceContentType(req: Request, res: Response, next: NextFunction): void {
  if (!BODY_METHODS.has(req.method) || !hasBody(req)) return next();
  const isImport = /^\/api(\/v1)?\/documents\/import\/?$/.test(req.path);
  const expected = isImport ? 'multipart/form-data' : 'application/json';
  if (req.is(expected)) return next();
  res.status(415).json({
    error: {
      code: 'UNSUPPORTED_MEDIA_TYPE',
      message: `Content-Type must be ${expected}`,
      requestId: (req as AppRequest).id,
    },
  });
}

// One line per request; JSON in production. Never logs bodies, cookies or headers.
export function requestLogger(json: boolean): (req: AppRequest, res: Response, next: NextFunction) => void {
  const logger = new Logger('HTTP');
  return (req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const entry = {
        level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
        msg: 'request',
        method: req.method,
        path: req.originalUrl.split('?')[0],
        status: res.statusCode,
        durationMs: Number((process.hrtime.bigint() - start) / 1_000_000n),
        requestId: req.id,
        userId: req.user?.id,
      };
      if (json) process.stdout.write(`${JSON.stringify({ time: new Date().toISOString(), ...entry })}\n`);
      else logger.log(`${entry.method} ${entry.path} ${entry.status} ${entry.durationMs}ms rid=${entry.requestId}`);
    });
    next();
  };
}

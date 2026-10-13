import { VERSION_NEUTRAL, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { SESSION_COOKIE } from './common/guards';
import { enforceContentType, noStore, REQUEST_ID_HEADER, requestId, requestLogger } from './common/http';
import { createValidationPipe } from './common/pipes';

// Shared by main.ts and e2e tests so both run the same pipeline.
export function configureApp(app: NestExpressApplication): void {
  const config = app.get(ConfigService);
  // Number of reverse proxies in front of us, so req.ip is the real client IP.
  app.set('trust proxy', config.get<number>('TRUST_PROXY_HOPS') ?? 1);
  app.disable('x-powered-by');
  app.setGlobalPrefix('api');
  // /api/... (unversioned, used by the web app) and /api/v1/... resolve to the same handlers.
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: [VERSION_NEUTRAL, '1'] });

  app.use(requestId);
  app.use(requestLogger(process.env.NODE_ENV === 'production'));
  // HSTS only makes sense when served over HTTPS.
  const hsts = config.get<boolean>('COOKIE_SECURE') ? { maxAge: 31_536_000, includeSubDomains: true } : false;
  const strict = helmet({ hsts });
  // Swagger UI needs inline scripts/styles; relax CSP for /api/docs only.
  const docs = helmet({ hsts, contentSecurityPolicy: false });
  app.use((req: Request, res: Response, next: NextFunction) =>
    (req.path.startsWith('/api/docs') ? docs : strict)(req, res, next),
  );
  app.use(compression());
  app.use(noStore);
  app.use(enforceContentType);
  app.useBodyParser('json', { limit: '2mb' });
  app.use(cookieParser());
  app.useGlobalPipes(createValidationPipe());
  app.enableShutdownHooks();

  const openApi = new DocumentBuilder()
    .setTitle('Ajaia Docs API')
    .setDescription(
      [
        'Documents, sharing and file import for Ajaia Docs.',
        '',
        'Auth: `POST /api/auth/login` sets the httpOnly `ajaia_session` cookie used by every other route.',
        'Versioning: every route is served at `/api/...` and `/api/v1/...`.',
        'Errors: every non-2xx body is `{ "error": { "code", "message", "requestId", ...extra } }`.',
        `Tracing: send \`${REQUEST_ID_HEADER}\` to correlate logs; it is echoed back (or generated).`,
        'Rate limits: 120 req/min/IP globally, 5/min/IP on login; `X-RateLimit-*` and `Retry-After` headers.',
      ].join('\n'),
    )
    .setVersion('1.0.0')
    .setContact('Ajaia Docs', 'https://github.com/', 'support@ajaia.test')
    .setLicense('UNLICENSED', 'https://choosealicense.com/no-permission/')
    .addServer('/', 'Same origin (via the web proxy or direct)')
    .addServer('http://localhost:4000', 'Local API')
    .addCookieAuth(SESSION_COOKIE, { type: 'apiKey', in: 'cookie', name: SESSION_COOKIE })
    .build();
  SwaggerModule.setup('api/docs', app, () => SwaggerModule.createDocument(app, openApi), {
    jsonDocumentUrl: 'api/docs-json',
  });
}

import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { createValidationPipe } from './common/pipes';
import { SESSION_COOKIE } from './common/guards';

// Shared by main.ts and e2e tests so both run the same pipeline.
export function configureApp(app: NestExpressApplication): void {
  app.set('trust proxy', 1);
  app.setGlobalPrefix('api');
  app.useBodyParser('json', { limit: '2mb' });

  const strict = helmet();
  // Swagger UI needs inline scripts/styles; relax CSP for /api/docs only.
  const docs = helmet({ contentSecurityPolicy: false });
  app.use((req: Request, res: Response, next: NextFunction) =>
    (req.path.startsWith('/api/docs') ? docs : strict)(req, res, next),
  );
  app.use(cookieParser());
  app.useGlobalPipes(createValidationPipe());
  app.enableShutdownHooks();

  const config = new DocumentBuilder()
    .setTitle('Ajaia Docs API')
    .setDescription('Documents, sharing and import. Errors use { error: { code, message } }.')
    .setVersion('1.0')
    .addCookieAuth(SESSION_COOKIE, { type: 'apiKey', in: 'cookie', name: SESSION_COOKIE })
    .build();
  SwaggerModule.setup('api/docs', app, () => SwaggerModule.createDocument(app, config), {
    jsonDocumentUrl: 'api/docs-json',
  });
}

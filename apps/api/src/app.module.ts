import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AccessModule } from './access/access.service';
import { AuthModule } from './auth/auth.controller';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { OriginGuard, SessionAuthGuard } from './common/guards';
import { validateEnv } from './config/env';
import { DocumentsModule } from './documents/documents.controller';
import { HealthModule } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      // THROTTLE_LIMIT only exists so test suites are not throttled globally.
      useFactory: (config: ConfigService) => [
        { name: 'default', ttl: 60_000, limit: Number(config.get('THROTTLE_LIMIT') ?? 120) },
      ],
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('SESSION_SECRET'),
        signOptions: { algorithm: 'HS256', expiresIn: '7d' },
      }),
    }),
    PrismaModule,
    AccessModule,
    AuthModule,
    DocumentsModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: OriginGuard },
    { provide: APP_GUARD, useClass: SessionAuthGuard },
  ],
})
export class AppModule {}

import { Controller, Get, Module, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { Public } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

type DbStatus = { status: 'ok' | 'error'; db: 'ok' | 'down' };

@ApiTags('health')
@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  private async dbCheck(res: Response): Promise<DbStatus> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'ok' };
    } catch {
      res.status(503);
      return { status: 'error', db: 'down' };
    }
  }

  @Get()
  @ApiOperation({ summary: 'Combined health check (process + database)' })
  @ApiResponse({ status: 200, schema: { example: { status: 'ok', db: 'ok' } } })
  @ApiResponse({ status: 503, schema: { example: { status: 'error', db: 'down' } } })
  check(@Res({ passthrough: true }) res: Response): Promise<DbStatus> {
    return this.dbCheck(res);
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness: the process is up (no dependencies checked)' })
  @ApiResponse({ status: 200, schema: { example: { status: 'ok', uptimeSeconds: 42 } } })
  live(): { status: 'ok'; uptimeSeconds: number } {
    return { status: 'ok', uptimeSeconds: Math.round(process.uptime()) };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness: the database is reachable' })
  @ApiResponse({ status: 200, schema: { example: { status: 'ok', db: 'ok' } } })
  @ApiResponse({ status: 503, schema: { example: { status: 'error', db: 'down' } } })
  ready(@Res({ passthrough: true }) res: Response): Promise<DbStatus> {
    return this.dbCheck(res);
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}

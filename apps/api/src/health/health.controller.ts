import { Controller, Get, Module, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { Public } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @SkipThrottle()
  @Get()
  @ApiOperation({ summary: 'Liveness + database check' })
  @ApiResponse({ status: 200, schema: { example: { status: 'ok', db: 'ok' } } })
  @ApiResponse({ status: 503, schema: { example: { status: 'error', db: 'down' } } })
  async check(@Res({ passthrough: true }) res: Response): Promise<{ status: string; db: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'ok' };
    } catch {
      res.status(503);
      return { status: 'error', db: 'down' };
    }
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}

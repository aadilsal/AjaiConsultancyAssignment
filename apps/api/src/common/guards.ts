import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from './app-error';
import { AuthUser, IS_PUBLIC_KEY } from './decorators';

export const SESSION_COOKIE = 'ajaia_session';

const unauthenticated = (): AppError =>
  new AppError(HttpStatus.UNAUTHORIZED, 'UNAUTHENTICATED', 'Please sign in to continue.');

// Global guard: valid session cookie unless the route is @Public().
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const token = (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
    if (!token) throw unauthenticated();

    let sub: string;
    try {
      ({ sub } = await this.jwt.verifyAsync<{ sub: string }>(token, { algorithms: ['HS256'] }));
    } catch {
      throw unauthenticated();
    }
    const user = await this.prisma.user.findUnique({ where: { id: sub }, select: { id: true, email: true, name: true } });
    if (!user) throw unauthenticated();
    req.user = user;
    return true;
  }
}

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// CSRF defense-in-depth: reject foreign Origin on state-changing requests.
@Injectable()
export class OriginGuard implements CanActivate {
  private readonly allowed: Set<string>;

  constructor(config: ConfigService) {
    this.allowed = new Set(config.get<string[]>('ALLOWED_ORIGINS') ?? []);
  }

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (!UNSAFE_METHODS.has(req.method)) return true;
    const origin = req.headers.origin;
    if (origin && !this.allowed.has(origin)) {
      throw new AppError(HttpStatus.FORBIDDEN, 'BAD_ORIGIN', 'Request origin is not allowed.');
    }
    return true;
  }
}

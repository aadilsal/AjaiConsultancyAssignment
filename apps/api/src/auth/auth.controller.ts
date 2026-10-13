import { Body, Controller, Get, HttpCode, HttpStatus, Injectable, Module, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import * as bcrypt from 'bcryptjs';
import type { CookieOptions, Response } from 'express';
import { AppError } from '../common/app-error';
import { CurrentUser, Public, type AuthUser } from '../common/decorators';
import { ErrorResponse } from '../common/error-response.dto';
import { SESSION_COOKIE } from '../common/guards';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { LoginDto, RegisterDto, UserResponseDto } from './auth.dto';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
// Equalises timing for unknown emails.
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser', 10);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async validate(email: string, password: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) {
      throw new AppError(HttpStatus.UNAUTHORIZED, 'INVALID_CREDENTIALS', 'Incorrect email or password');
    }
    return { id: user.id, email: user.email, name: user.name };
  }

  async register(dto: RegisterDto): Promise<AuthUser> {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    try {
      return await this.prisma.user.create({
        data: { name: dto.name, email: dto.email, passwordHash },
        select: { id: true, email: true, name: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new AppError(HttpStatus.CONFLICT, 'EMAIL_TAKEN', 'An account with this email already exists.');
      }
      throw e;
    }
  }

  sign(userId: string): Promise<string> {
    return this.jwt.signAsync({ sub: userId });
  }
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  private cookieOptions(): CookieOptions {
    return { httpOnly: true, sameSite: 'lax', secure: this.config.get<boolean>('COOKIE_SECURE'), path: '/' };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with email + password; sets the ajaia_session cookie' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponse, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 401, type: ErrorResponse, description: 'INVALID_CREDENTIALS' })
  @ApiResponse({ status: 403, type: ErrorResponse, description: 'BAD_ORIGIN' })
  @ApiResponse({ status: 429, type: ErrorResponse, description: 'RATE_LIMITED (5/min/IP)' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response): Promise<UserResponseDto> {
    const user = await this.auth.validate(dto.email, dto.password);
    res.cookie(SESSION_COOKIE, await this.auth.sign(user.id), { ...this.cookieOptions(), maxAge: SEVEN_DAYS_MS });
    return { user };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  @ApiOperation({ summary: 'Create an account and sign in (sets the ajaia_session cookie)' })
  @ApiResponse({ status: 201, type: UserResponseDto, description: 'Location: /api/auth/me' })
  @ApiResponse({ status: 400, type: ErrorResponse, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 403, type: ErrorResponse, description: 'BAD_ORIGIN' })
  @ApiResponse({ status: 409, type: ErrorResponse, description: 'EMAIL_TAKEN' })
  @ApiResponse({ status: 415, type: ErrorResponse, description: 'UNSUPPORTED_MEDIA_TYPE' })
  @ApiResponse({ status: 429, type: ErrorResponse, description: 'RATE_LIMITED (5/min/IP)' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response): Promise<UserResponseDto> {
    const user = await this.auth.register(dto);
    res.cookie(SESSION_COOKIE, await this.auth.sign(user.id), { ...this.cookieOptions(), maxAge: SEVEN_DAYS_MS });
    res.location('/api/auth/me');
    return { user };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear the session cookie' })
  @ApiResponse({ status: 204, description: 'Signed out' })
  @ApiResponse({ status: 403, type: ErrorResponse, description: 'BAD_ORIGIN' })
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(SESSION_COOKIE, this.cookieOptions());
  }

  @Get('me')
  @ApiCookieAuth(SESSION_COOKIE)
  @ApiOperation({ summary: 'Current signed-in user' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponse, description: 'UNAUTHENTICATED' })
  me(@CurrentUser() user: AuthUser): UserResponseDto {
    return { user };
  }
}

@Module({ controllers: [AuthController], providers: [AuthService] })
export class AuthModule {}

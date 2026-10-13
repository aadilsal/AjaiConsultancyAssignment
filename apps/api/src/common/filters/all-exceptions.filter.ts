import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AppError } from '../app-error';

const GENERIC_500 = 'Something went wrong. Please try again.';

const DEFAULT_CODES: Record<number, string> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  413: 'PAYLOAD_TOO_LARGE',
  429: 'RATE_LIMITED',
};

// Single error envelope for every non-2xx response.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const { status, body } = this.toEnvelope(exception);

    if (status >= 500) {
      const docId = (req.params as Record<string, string> | undefined)?.id ?? '-';
      this.logger.error(
        `${req.method} ${req.originalUrl} doc=${docId} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }
    res.status(status).json({ error: body });
  }

  private toEnvelope(exception: unknown): { status: number; body: Record<string, unknown> } {
    if (exception instanceof AppError) {
      return { status: exception.getStatus(), body: { code: exception.code, message: exception.message, ...exception.extra } };
    }
    if (exception instanceof ThrottlerException) {
      return {
        status: HttpStatus.TOO_MANY_REQUESTS,
        body: { code: 'RATE_LIMITED', message: 'Too many requests. Please wait a minute and try again.' },
      };
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status >= 500) return { status, body: { code: 'INTERNAL_ERROR', message: GENERIC_500 } };
      const raw = exception.getResponse();
      const msg = typeof raw === 'string' ? raw : (raw as { message?: unknown }).message;
      const message = Array.isArray(msg) ? String(msg[0]) : typeof msg === 'string' ? msg : exception.message;
      const code = DEFAULT_CODES[status] ?? 'ERROR';
      return { status, body: status === 400 ? { code, message, details: [message] } : { code, message } };
    }
    if (isBodyParserError(exception)) {
      if (exception.status === 413) {
        return { status: 413, body: { code: 'CONTENT_TOO_LARGE', message: 'Document is too large to save' } };
      }
      if (exception.status === 400) {
        const message = 'Malformed request body';
        return { status: 400, body: { code: 'VALIDATION_ERROR', message, details: [message] } };
      }
    }
    return { status: 500, body: { code: 'INTERNAL_ERROR', message: GENERIC_500 } };
  }
}

// body-parser errors carry status + type but are not HttpExceptions.
function isBodyParserError(e: unknown): e is { status: number; type: string } {
  return typeof e === 'object' && e !== null && typeof (e as { status?: unknown }).status === 'number' && 'type' in e;
}

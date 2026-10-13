import { HttpException, HttpStatus } from '@nestjs/common';

// Domain error rendered as { error: { code, message, ...extra } }.
export class AppError extends HttpException {
  constructor(
    status: HttpStatus,
    public readonly code: string,
    message: string,
    public readonly extra: Record<string, unknown> = {},
  ) {
    super({ code, message, ...extra }, status);
    this.message = message;
  }
}

export const notFound = (): AppError => new AppError(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Document not found.');

export const forbidden = (message = "You don't have permission to do that."): AppError =>
  new AppError(HttpStatus.FORBIDDEN, 'FORBIDDEN', message);

import { HttpStatus, ParseUUIDPipe, ValidationError, ValidationPipe } from '@nestjs/common';
import { AppError, notFound } from './app-error';

function flatten(errors: ValidationError[]): string[] {
  return errors.flatMap((e) => [...Object.values(e.constraints ?? {}), ...flatten(e.children ?? [])]);
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) => {
      const details = flatten(errors);
      return new AppError(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', details[0] ?? 'Invalid request', { details });
    },
  });
}

// Malformed ids look exactly like missing docs.
export const UuidParam = new ParseUUIDPipe({ exceptionFactory: () => notFound() });

import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-codes';

export interface AppExceptionPayload {
  code: ErrorCode;
  message: string;
  details?: unknown[];
}

export class AppException extends HttpException {
  constructor(
    status: HttpStatus,
    private readonly payload: AppExceptionPayload,
  ) {
    super(payload, status);
  }

  getPayload(): AppExceptionPayload {
    return this.payload;
  }
}

export const Errors = {
  auth: {
    invalidCredentials: () =>
      new AppException(HttpStatus.UNAUTHORIZED, {
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Correo o contraseña incorrectos',
      }),
    emailNotVerified: () =>
      new AppException(HttpStatus.FORBIDDEN, {
        code: 'AUTH_EMAIL_NOT_VERIFIED',
        message:
          'Correo no verificado. Revisa tu bandeja de entrada para ingresar el código.',
      }),
    emailAlreadyExists: () =>
      new AppException(HttpStatus.CONFLICT, {
        code: 'AUTH_EMAIL_ALREADY_EXISTS',
        message: 'El correo ya se encuentra registrado',
      }),
    documentAlreadyExists: () =>
      new AppException(HttpStatus.CONFLICT, {
        code: 'AUTH_DOCUMENT_ALREADY_EXISTS',
        message: 'El número de documento ya se encuentra registrado',
      }),
  },
  rateLimit: () =>
    new AppException(HttpStatus.TOO_MANY_REQUESTS, {
      code: 'RATE_LIMITED',
      message: 'Demasiados intentos, espera un momento',
    }),
  internal: () =>
    new AppException(HttpStatus.INTERNAL_SERVER_ERROR, {
      code: 'INTERNAL_ERROR',
      message: 'Error interno del servidor',
    }),
};

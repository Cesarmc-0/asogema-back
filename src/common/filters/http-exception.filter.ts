import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AppException, ErrorCodes, ErrorCode } from 'src/common/errors';

const TOO_MANY_REQUESTS = 429;

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() !== 'http') {
      throw exception;
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status: number =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let code: ErrorCode = ErrorCodes.INTERNAL_ERROR;
    let message = 'Error interno del servidor';
    let details: unknown[] = [];

    if (exception instanceof AppException) {
      const payload = exception.getPayload();
      code = payload.code;
      message = payload.message;
      details = payload.details ?? [];
    } else if (exception instanceof HttpException) {
      const raw = exception.getResponse() as Record<string, unknown>;
      const rawMessage = raw.message;

      if (typeof rawMessage === 'string') {
        message = rawMessage;
      } else if (Array.isArray(rawMessage)) {
        message = (rawMessage as string[])[0] ?? message;
      }

      if (typeof raw.code === 'string') {
        code = raw.code as ErrorCode;
      }

      if (Array.isArray(raw.details)) {
        details = raw.details as unknown[];
      }

      if (status === TOO_MANY_REQUESTS) {
        code = ErrorCodes.RATE_LIMITED;
        message = 'Demasiados intentos, espera un momento';
      }
    }

    response.status(status).json({
      statusCode: status,
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

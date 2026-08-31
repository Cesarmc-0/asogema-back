import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';
import { Errors } from '../errors';
import { ErrorCodes } from '../errors';

function createMockHost(payload: object | string, status: number) {
  const json = jest.fn();
  const response = {
    status: jest.fn().mockReturnValue({ json }),
    json,
  };
  const request = { url: '/auth/tokens', method: 'POST' };

  const host = {
    getType: () => 'http',
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;

  return { json, host, response };
}

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  it('emite el código de un AppException', () => {
    const { json, host } = createMockHost({}, 401);
    filter.catch(Errors.auth.emailNotVerified(), host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        code: ErrorCodes.AUTH_EMAIL_NOT_VERIFIED,
        message: expect.stringContaining('Correo no verificado'),
      }),
    );
  });

  it('mapea un payload de validación con code y details', () => {
    const err = new BadRequestException({
      code: ErrorCodes.VALIDATION_ERROR,
      message: 'Los datos enviados no son válidos',
      details: [{ field: 'correo', message: 'El correo no es válido' }],
    });

    const { json, host } = createMockHost({}, 400);
    filter.catch(err, host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        code: ErrorCodes.VALIDATION_ERROR,
        details: [{ field: 'correo', message: 'El correo no es válido' }],
      }),
    );
  });

  it('fuerza RATE_LIMITED y mensaje en español para 429', () => {
    const err = new HttpException('ThrottlerException: Too Many Requests', 429);

    const { json, host } = createMockHost({}, 429);
    filter.catch(err, host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 429,
        code: ErrorCodes.RATE_LIMITED,
        message: 'Demasiados intentos, espera un momento',
      }),
    );
  });

  it('usa por defecto INTERNAL_ERROR cuando no hay excepción HTTP', () => {
    const { json, host } = createMockHost({}, 500);
    filter.catch(new Error('boom'), host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        code: ErrorCodes.INTERNAL_ERROR,
      }),
    );
  });
});

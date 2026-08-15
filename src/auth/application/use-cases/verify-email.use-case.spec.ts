import {
  UnauthorizedException,
  TooManyRequestsException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { VerifyEmailUseCase } from './verify-email.use-case';
import { AuthRepository } from '../../domain/repositories/auth.repository.interface';
import { EmailVerificationService } from '../services/email-verification.service';

const mockUser = {
  id: 2n,
  correo: 'correo@test.com',
  nombre: 'Juan',
} as any;

const mockAuthRepository = {
  findByEmail: jest.fn(),
} as unknown as AuthRepository;

const mockEmailVerification = {
  validateCode: jest.fn(),
  markVerified: jest.fn(),
  clearCode: jest.fn(),
} as unknown as EmailVerificationService;

describe('VerifyEmailUseCase', () => {
  let useCase: VerifyEmailUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new VerifyEmailUseCase(mockAuthRepository, mockEmailVerification);
    (mockAuthRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
    (mockEmailVerification.validateCode as jest.Mock).mockResolvedValue(true);
    (mockEmailVerification.markVerified as jest.Mock).mockResolvedValue(
      undefined,
    );
    (mockEmailVerification.clearCode as jest.Mock).mockResolvedValue(undefined);
  });

  it('verifica el correo correctamente', async () => {
    const result = await useCase.execute({
      correo: 'correo@test.com',
      codigo: '123456',
    });

    expect(result).toEqual({ message: 'Correo verificado correctamente' });
    expect(mockEmailVerification.markVerified).toHaveBeenCalledWith(2n);
    expect(mockEmailVerification.clearCode).toHaveBeenCalledWith(
      'correo@test.com',
    );
  });

  it('lanza UnauthorizedException si el correo no está registrado', async () => {
    (mockAuthRepository.findByEmail as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({ correo: 'nadie@test.com', codigo: '123456' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('lanza UnauthorizedException si el código es incorrecto', async () => {
    (mockEmailVerification.validateCode as jest.Mock).mockResolvedValue(false);

    await expect(
      useCase.execute({ correo: 'correo@test.com', codigo: '000000' }),
    ).rejects.toThrow(UnauthorizedException);
    expect(mockEmailVerification.markVerified).not.toHaveBeenCalled();
  });

  it('lanza TooManyRequestsException si se agotaron los intentos', async () => {
    (mockEmailVerification.validateCode as jest.Mock).mockRejectedValue(
      new Error(
        'Demasiados intentos de verificación. Solicita un nuevo código.',
      ),
    );

    await expect(
      useCase.execute({ correo: 'correo@test.com', codigo: '123456' }),
    ).rejects.toThrow(TooManyRequestsException);
  });

  it('lanza ServiceUnavailableException si falla el marcado en BD', async () => {
    (mockEmailVerification.markVerified as jest.Mock).mockRejectedValue(
      new Error('columna correo_verificado no existe'),
    );

    await expect(
      useCase.execute({ correo: 'correo@test.com', codigo: '123456' }),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});

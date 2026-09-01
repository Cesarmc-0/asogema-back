import {
  UnauthorizedException,
  TooManyRequestsException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ResetPasswordUseCase } from './reset-password.use-case';
import { AuthRepository } from '../../domain/repositories/auth.repository.interface';
import { PasswordRecoveryService } from '../services/password-recovery.service';

const mockUser = {
  id: 2n,
  correo: 'correo@test.com',
  nombre: 'Juan',
  password_hash: 'hash_viejo',
} as any;

const mockAuthRepository = {
  findByEmail: jest.fn(),
  updatePassword: jest.fn(),
} as unknown as AuthRepository;

const mockPasswordRecovery = {
  validateCode: jest.fn(),
  clearCode: jest.fn(),
} as unknown as PasswordRecoveryService;

describe('ResetPasswordUseCase', () => {
  let useCase: ResetPasswordUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ResetPasswordUseCase(
      mockAuthRepository,
      mockPasswordRecovery,
    );
    (mockAuthRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
    (mockPasswordRecovery.validateCode as jest.Mock).mockResolvedValue(true);
    (mockAuthRepository.updatePassword as jest.Mock).mockResolvedValue(
      mockUser,
    );
    (mockPasswordRecovery.clearCode as jest.Mock).mockResolvedValue(undefined);
  });

  it('restablece la contraseña, la hashea y limpia el código', async () => {
    const result = await useCase.execute({
      correo: 'correo@test.com',
      codigo: '123456',
      new_password: 'nueva123',
    });

    expect(result).toEqual({
      message: 'Contraseña restablecida correctamente',
    });
    expect(mockAuthRepository.updatePassword).toHaveBeenCalledWith(
      2n,
      expect.any(String),
    );
    expect(mockAuthRepository.updatePassword).toHaveBeenCalledWith(
      2n,
      expect.not.stringMatching('nueva123'),
    );
    expect(mockPasswordRecovery.clearCode).toHaveBeenCalledWith(
      'correo@test.com',
    );
  });

  it('lanza UnauthorizedException si el correo no está registrado', async () => {
    (mockAuthRepository.findByEmail as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({
        correo: 'nadie@test.com',
        codigo: '123456',
        new_password: 'nueva123',
      }),
    ).rejects.toThrow(UnauthorizedException);
    expect(mockAuthRepository.updatePassword).not.toHaveBeenCalled();
  });

  it('lanza UnauthorizedException si el código es incorrecto', async () => {
    (mockPasswordRecovery.validateCode as jest.Mock).mockResolvedValue(false);

    await expect(
      useCase.execute({
        correo: 'correo@test.com',
        codigo: '000000',
        new_password: 'nueva123',
      }),
    ).rejects.toThrow(UnauthorizedException);
    expect(mockAuthRepository.updatePassword).not.toHaveBeenCalled();
  });

  it('lanza TooManyRequestsException si se agotaron los intentos', async () => {
    (mockPasswordRecovery.validateCode as jest.Mock).mockRejectedValue(
      new Error(
        'Demasiados intentos de recuperación. Solicita un nuevo código.',
      ),
    );

    await expect(
      useCase.execute({
        correo: 'correo@test.com',
        codigo: '123456',
        new_password: 'nueva123',
      }),
    ).rejects.toThrow(TooManyRequestsException);
  });

  it('lanza ServiceUnavailableException si falla la actualización en BD', async () => {
    (mockAuthRepository.updatePassword as jest.Mock).mockRejectedValue(
      new Error('BD caída'),
    );

    await expect(
      useCase.execute({
        correo: 'correo@test.com',
        codigo: '123456',
        new_password: 'nueva123',
      }),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});

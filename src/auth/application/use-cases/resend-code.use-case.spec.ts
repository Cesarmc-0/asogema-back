import {
  ConflictException,
  NotFoundException,
  TooManyRequestsException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ResendCodeUseCase } from './resend-code.use-case';
import { AuthRepository } from '../../domain/repositories/auth.repository.interface';
import { EmailVerificationService } from '../services/email-verification.service';
import { EmailSender } from 'src/infrastructure/mail/domain/email-sender.interface';

const mockUser = {
  id: 2n,
  correo: 'correo@test.com',
  nombre: 'Juan',
  apellido: 'Pérez',
  correo_verificado: false,
} as any;

const mockAuthRepository = {
  findByEmail: jest.fn(),
} as unknown as AuthRepository;

const mockEmailVerification = {
  assertResendAllowed: jest.fn(),
  generateCode: jest.fn(),
  markResendSent: jest.fn(),
} as unknown as EmailVerificationService;

const mockEmailSender = {
  sendWelcomeVerification: jest.fn(),
} as unknown as EmailSender;

describe('ResendCodeUseCase', () => {
  let useCase: ResendCodeUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ResendCodeUseCase(
      mockAuthRepository,
      mockEmailVerification,
      mockEmailSender,
    );
    (mockAuthRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
    (mockEmailVerification.assertResendAllowed as jest.Mock).mockResolvedValue(
      undefined,
    );
    (mockEmailVerification.generateCode as jest.Mock).mockResolvedValue(
      '123456',
    );
    (mockEmailVerification.markResendSent as jest.Mock).mockResolvedValue(
      undefined,
    );
    (mockEmailSender.sendWelcomeVerification as jest.Mock).mockResolvedValue(
      undefined,
    );
  });

  it('reenvía el código y lo envía por correo', async () => {
    const result = await useCase.execute({ correo: 'correo@test.com' });

    expect(result).toEqual({ message: 'Código reenviado correctamente' });
    expect(mockEmailVerification.generateCode).toHaveBeenCalledWith(
      'correo@test.com',
    );
    expect(mockEmailSender.sendWelcomeVerification).toHaveBeenCalledWith({
      nombre: 'Juan Pérez',
      correo: 'correo@test.com',
      codigo: '123456',
    });
    expect(mockEmailVerification.markResendSent).toHaveBeenCalledWith(
      'correo@test.com',
    );
  });

  it('lanza NotFoundException si el correo no está registrado', async () => {
    (mockAuthRepository.findByEmail as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute({ correo: 'nadie@test.com' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('lanza ConflictException si el correo ya está verificado', async () => {
    (mockAuthRepository.findByEmail as jest.Mock).mockResolvedValue({
      ...mockUser,
      correo_verificado: true,
    });

    await expect(
      useCase.execute({ correo: 'correo@test.com' }),
    ).rejects.toThrow(ConflictException);
    expect(mockEmailVerification.generateCode).not.toHaveBeenCalled();
  });

  it('lanza TooManyRequestsException si está en cooldown', async () => {
    (mockEmailVerification.assertResendAllowed as jest.Mock).mockRejectedValue(
      new Error('Espera 60 segundos antes de solicitar otro código'),
    );

    await expect(
      useCase.execute({ correo: 'correo@test.com' }),
    ).rejects.toThrow(TooManyRequestsException);
    expect(mockEmailVerification.generateCode).not.toHaveBeenCalled();
  });

  it('lanza ServiceUnavailableException si falla el envío del correo', async () => {
    (mockEmailSender.sendWelcomeVerification as jest.Mock).mockRejectedValue(
      new Error('SMTP caído'),
    );

    await expect(
      useCase.execute({ correo: 'correo@test.com' }),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(mockEmailVerification.markResendSent).not.toHaveBeenCalled();
  });
});

import { ForgotPasswordUseCase } from './forgot-password.use-case';
import { AuthRepository } from '../../domain/repositories/auth.repository.interface';
import { PasswordRecoveryService } from '../services/password-recovery.service';
import { EmailSender } from 'src/infrastructure/mail/domain/email-sender.interface';

const mockUser = {
  id: 2n,
  correo: 'correo@test.com',
  nombre: 'Juan',
  apellido: 'Pérez',
  estado: true,
} as any;

const mockAuthRepository = {
  findByEmail: jest.fn(),
} as unknown as AuthRepository;

const mockPasswordRecovery = {
  generateCode: jest.fn(),
} as unknown as PasswordRecoveryService;

const mockEmailSender = {
  sendPasswordRecovery: jest.fn(),
} as unknown as EmailSender;

describe('ForgotPasswordUseCase', () => {
  let useCase: ForgotPasswordUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ForgotPasswordUseCase(
      mockAuthRepository,
      mockPasswordRecovery,
      mockEmailSender,
    );
  });

  it('genera el código y envía el correo de recuperación', async () => {
    (mockAuthRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
    (mockPasswordRecovery.generateCode as jest.Mock).mockResolvedValue(
      '123456',
    );
    (mockEmailSender.sendPasswordRecovery as jest.Mock).mockResolvedValue(
      undefined,
    );

    const result = await useCase.execute({ correo: 'correo@test.com' });

    expect(result.message).toContain('recibirás un código de recuperación');
    expect(mockEmailSender.sendPasswordRecovery).toHaveBeenCalledWith({
      nombre: 'Juan Pérez',
      correo: 'correo@test.com',
      codigo: '123456',
    });
  });

  it('no revela si el correo no está registrado', async () => {
    (mockAuthRepository.findByEmail as jest.Mock).mockResolvedValue(null);

    const result = await useCase.execute({ correo: 'nadie@test.com' });

    expect(result.message).toContain('recibirás un código de recuperación');
    expect(mockPasswordRecovery.generateCode).not.toHaveBeenCalled();
    expect(mockEmailSender.sendPasswordRecovery).not.toHaveBeenCalled();
  });

  it('no rompe el flujo si el envío del correo falla', async () => {
    (mockAuthRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
    (mockPasswordRecovery.generateCode as jest.Mock).mockResolvedValue(
      '123456',
    );
    (mockEmailSender.sendPasswordRecovery as jest.Mock).mockRejectedValue(
      new Error('SMTP caído'),
    );

    const result = await useCase.execute({ correo: 'correo@test.com' });

    expect(result.message).toContain('recibirás un código de recuperación');
  });
});

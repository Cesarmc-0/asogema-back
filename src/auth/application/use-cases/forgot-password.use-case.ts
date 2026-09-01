import { Injectable, Logger } from '@nestjs/common';
import { AuthRepository } from '../../domain/repositories/auth.repository.interface';
import { PasswordRecoveryService } from '../services/password-recovery.service';
import { EmailSender } from 'src/infrastructure/mail/domain/email-sender.interface';
import { ForgotPasswordDto } from '../../presentation/dto/forgot-password.dto';

@Injectable()
export class ForgotPasswordUseCase {
  private readonly logger = new Logger(ForgotPasswordUseCase.name);

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly passwordRecovery: PasswordRecoveryService,
    private readonly emailSender: EmailSender,
  ) {}

  async execute(_dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.authRepository.findByEmail(_dto.correo);

    if (!user || !user.estado) {
      return {
        message:
          'Si el correo está registrado, recibirás un código de recuperación.',
      };
    }

    const codigo = await this.passwordRecovery.generateCode(user.correo);

    try {
      await this.emailSender.sendPasswordRecovery({
        nombre: `${user.nombre} ${user.apellido ?? ''}`.trim(),
        correo: user.correo,
        codigo,
      });
    } catch (error) {
      this.logger.error(
        `No se pudo enviar el correo de recuperación a ${user.correo}: ${
          error instanceof Error ? error.message : 'error desconocido'
        }`,
      );
    }

    return {
      message:
        'Si el correo está registrado, recibirás un código de recuperación.',
    };
  }
}

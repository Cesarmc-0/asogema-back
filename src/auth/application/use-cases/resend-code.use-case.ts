import {
  Injectable,
  ConflictException,
  NotFoundException,
  HttpException,
  HttpStatus,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AuthRepository } from '../../domain/repositories/auth.repository.interface';
import { EmailVerificationService } from '../services/email-verification.service';
import { EmailSender } from 'src/infrastructure/mail/domain/email-sender.interface';
import { ResendCodeDto } from '../../presentation/dto/resend-code.dto';

@Injectable()
export class ResendCodeUseCase {
  private readonly logger = new Logger(ResendCodeUseCase.name);

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly emailVerification: EmailVerificationService,
    private readonly emailSender: EmailSender,
  ) {}

  async execute(dto: ResendCodeDto): Promise<{ message: string }> {
    const user = await this.authRepository.findByEmail(dto.correo);
    if (!user) {
      throw new NotFoundException('El correo no se encuentra registrado');
    }

    if (user.correo_verificado) {
      throw new ConflictException('El correo ya está verificado');
    }

    try {
      await this.emailVerification.assertResendAllowed(dto.correo);
    } catch (error) {
      throw new HttpException(
        error instanceof Error
          ? error.message
          : 'Demasiados intentos de reenvío',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    let codigo: string;
    try {
      codigo = await this.emailVerification.generateCode(dto.correo);
    } catch (error) {
      this.logger.error(
        `No se pudo generar el código para ${dto.correo}: ${
          error instanceof Error ? error.message : 'error desconocido'
        }`,
      );
      throw new ServiceUnavailableException(
        'No se pudo generar el código. Intenta nuevamente en unos minutos.',
      );
    }

    try {
      await this.emailSender.sendWelcomeVerification({
        nombre: `${user.nombre} ${user.apellido ?? ''}`.trim(),
        correo: user.correo,
        codigo,
      });
    } catch (error) {
      this.logger.error(
        `No se pudo reenviar el código a ${dto.correo}: ${
          error instanceof Error ? error.message : 'error desconocido'
        }`,
      );
      throw new ServiceUnavailableException(
        'No se pudo enviar el código. Intenta nuevamente en unos minutos.',
      );
    }

    await this.emailVerification.markResendSent(dto.correo);

    return { message: 'Código reenviado correctamente' };
  }
}

import {
  Injectable,
  UnauthorizedException,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AuthRepository } from '../../domain/repositories/auth.repository.interface';
import { EmailVerificationService } from '../services/email-verification.service';
import { VerifyEmailDto } from '../../presentation/dto/verify-email.dto';

@Injectable()
export class VerifyEmailUseCase {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly emailVerification: EmailVerificationService,
  ) {}

  async execute(dto: VerifyEmailDto): Promise<{ message: string }> {
    const user = await this.authRepository.findByEmail(dto.correo);
    if (!user) {
      throw new UnauthorizedException('El correo no se encuentra registrado');
    }

    let isValid: boolean;
    try {
      isValid = await this.emailVerification.validateCode(
        dto.correo,
        dto.codigo,
      );
    } catch (error) {
      throw new HttpException(
        error instanceof Error
          ? error.message
          : 'Demasiados intentos de verificación',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!isValid) {
      throw new UnauthorizedException('Código incorrecto o expirado');
    }

    try {
      await this.emailVerification.markVerified(user.id);
    } catch {
      throw new ServiceUnavailableException(
        'No se pudo completar la verificación. Intenta nuevamente en unos minutos.',
      );
    }

    await this.emailVerification.clearCode(dto.correo);

    return { message: 'Correo verificado correctamente' };
  }
}

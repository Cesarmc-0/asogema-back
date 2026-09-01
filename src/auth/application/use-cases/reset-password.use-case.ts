import {
  Injectable,
  UnauthorizedException,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthRepository } from '../../domain/repositories/auth.repository.interface';
import { PasswordRecoveryService } from '../services/password-recovery.service';
import { ResetPasswordDto } from '../../presentation/dto/reset-password.dto';

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly passwordRecovery: PasswordRecoveryService,
  ) {}

  async execute(dto: ResetPasswordDto): Promise<{ message: string }> {
    const user = await this.authRepository.findByEmail(dto.correo);
    if (!user) {
      throw new UnauthorizedException('Código incorrecto o expirado');
    }

    let isValid: boolean;
    try {
      isValid = await this.passwordRecovery.validateCode(
        dto.correo,
        dto.codigo,
      );
    } catch (error) {
      throw new HttpException(
        error instanceof Error
          ? error.message
          : 'Demasiados intentos de recuperación',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!isValid) {
      throw new UnauthorizedException('Código incorrecto o expirado');
    }

    const password_hash = await bcrypt.hash(dto.new_password, 10);

    try {
      await this.authRepository.updatePassword(user.id, password_hash);
    } catch {
      throw new ServiceUnavailableException(
        'No se pudo restablecer la contraseña. Intenta nuevamente en unos minutos.',
      );
    }

    await this.passwordRecovery.clearCode(dto.correo);

    return { message: 'Contraseña restablecida correctamente' };
  }
}

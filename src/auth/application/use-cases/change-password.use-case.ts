import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthRepository } from 'src/auth/domain/repositories/auth.repository.interface';

@Injectable()
export class ChangePasswordUseCase {
  constructor(private authRepository: AuthRepository) {}

  async execute(
    id: bigint,
    dto: { current_password: string; new_password: string },
  ) {
    const user = await this.authRepository.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const valid = await bcrypt.compare(
      dto.current_password,
      user.password_hash,
    );
    if (!valid) {
      throw new UnauthorizedException('La contraseña actual no es correcta');
    }

    const password_hash = await bcrypt.hash(dto.new_password, 10);

    return this.authRepository.updatePassword(id, password_hash);
  }
}

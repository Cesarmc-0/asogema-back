import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AuthRepository,
  UpdateProfileInput,
} from 'src/auth/domain/repositories/auth.repository.interface';

@Injectable()
export class UpdateProfileUseCase {
  constructor(private authRepository: AuthRepository) {}

  async execute(id: bigint, dto: UpdateProfileInput) {
    const user = await this.authRepository.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.authRepository.update(id, dto);
  }
}

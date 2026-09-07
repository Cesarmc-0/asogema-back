import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthRepository } from 'src/auth/domain/repositories/auth.repository.interface';
import {
  toUserProfileResponse,
  type UserProfileResponse,
} from 'src/auth/application/mappers/user-profile.mapper';

@Injectable()
export class GetProfileUseCase {
  constructor(private authRepository: AuthRepository) {}

  async execute(id: bigint): Promise<UserProfileResponse> {
    const user = await this.authRepository.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return toUserProfileResponse(user);
  }
}

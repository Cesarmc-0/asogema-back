import { Injectable } from '@nestjs/common';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository.interface';

@Injectable()
export class LogoutUseCase {
  constructor(private refreshTokenRepository: RefreshTokenRepository) {}

  async execute(dto: { refresh_token: string }) {
    await this.refreshTokenRepository.delete(dto.refresh_token);
    return { message: 'Sesión cerrada correctamente' };
  }
}

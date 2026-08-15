import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthRepository } from '../../domain/repositories/auth.repository.interface';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository.interface';
import { TokenService } from '../services/token.service';

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    private authRepository: AuthRepository,
    private refreshTokenRepository: RefreshTokenRepository,
    private tokenService: TokenService,
  ) {}

  async execute(dto: { refresh_token: string }) {
    const userId = await this.refreshTokenRepository.findUserIdByToken(
      dto.refresh_token,
    );
    if (!userId) throw new UnauthorizedException('refresh token invalido');

    const user = await this.authRepository.findById(BigInt(userId));
    if (!user || !user.estado)
      throw new UnauthorizedException('refresh token invalido');

    await this.refreshTokenRepository.delete(dto.refresh_token);

    const newRefreshToken = this.tokenService.generateRefreshToken();
    await this.refreshTokenRepository.save(
      newRefreshToken,
      user.id.toString(),
      this.tokenService.getRefreshTtlSeconds(),
    );

    return {
      access_token: this.tokenService.signAccessToken(user),
      expires_in: this.tokenService.getAccessExpiresIn(),
      refresh_token: newRefreshToken,
    };
  }
}

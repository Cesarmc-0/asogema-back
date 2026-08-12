import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthRepository } from '../../domain/repositories/auth.repository.interface';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository.interface';
import { TokenService } from '../services/token.service';
import { LoginDto } from '../../presentation/dto/login.dto';

@Injectable()
export class LoginUseCase {
  constructor(
    private authRepository: AuthRepository,
    private tokenService: TokenService,
    private refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async execute(dto: LoginDto) {
    const user = await this.authRepository.findByEmail(dto.correo);
    if (!user || !user.estado)
      throw new UnauthorizedException('credenciales invalidas');

    const valid = await bcrypt.compare(dto.password, user.password_hash);
    if (!valid) throw new UnauthorizedException('credenciales invalidas');
    
    const access_token = this.tokenService.signAccessToken(user);
    const refresh_token = this.tokenService.generateRefreshToken();

    await this.refreshTokenRepository.save(
      refresh_token,
      user.id.toString(),
      this.tokenService.getRefreshTtlSeconds(),
    );

    return {
      access_token,
      expires_in: this.tokenService.getAccessExpiresIn(),
      refresh_token,
      usuario: {
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        correo: user.correo,
        rol_id: Number(user.rol_id),
        rol_nombre: user.roles.nombre,
      },
    };
  }
}

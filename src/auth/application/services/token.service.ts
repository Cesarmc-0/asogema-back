import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import type { StringValue } from 'ms';
import type { UsuarioWithRoles } from 'src/auth/domain/repositories/auth.repository.interface';

const DEFAULT_ACCESS_EXPIRES_IN = '15m';
const DEFAULT_REFRESH_EXPIRES_IN = '7d';

export interface JwtPayload {
  sub: string;
  correo: string;
  rol: string;
  rol_nombre: string;
}

@Injectable()
export class TokenService {
  private readonly accessExpiresIn: StringValue = (process.env.JWT_EXPIRES_IN ??
    DEFAULT_ACCESS_EXPIRES_IN) as StringValue;
  private readonly refreshExpiresIn =
    process.env.JWT_REFRESH_EXPIRES_IN ?? DEFAULT_REFRESH_EXPIRES_IN;

  constructor(private readonly jwtService: JwtService) {}

  getAccessExpiresIn(): StringValue {
    return this.accessExpiresIn;
  }

  getRefreshTtlSeconds(): number {
    return this.parseDurationToSeconds(this.refreshExpiresIn);
  }

  signAccessToken(
    user: Pick<UsuarioWithRoles, 'id' | 'correo' | 'rol_id' | 'roles'>,
  ): string {
    const payload: JwtPayload = {
      sub: user.id.toString(),
      correo: user.correo,
      rol: user.rol_id.toString(),
      rol_nombre: user.roles.nombre,
    };
    return this.jwtService.sign(payload, {
      expiresIn: this.accessExpiresIn,
    });
  }

  generateRefreshToken(): string {
    return randomBytes(48).toString('hex');
  }

  private parseDurationToSeconds(duration: string): number {
    const match = /^(\d+)\s*([smhd])$/.exec(duration);
    if (!match) {
      const seconds = Number(duration);
      return Number.isFinite(seconds) && seconds > 0
        ? seconds
        : parseInt(DEFAULT_REFRESH_EXPIRES_IN, 10) * 24 * 60 * 60;
    }
    const value = parseInt(match[1], 10);
    switch (match[2]) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return value * 24 * 60 * 60;
    }
  }
}

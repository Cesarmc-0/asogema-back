import { TokenService } from './token.service';
import { JwtService } from '@nestjs/jwt';

const mockJwtService = {
  sign: jest.fn(() => 'signed_jwt'),
} as unknown as JwtService;

const user = {
  id: 1n,
  correo: 'test@test.com',
  rol_id: 2n,
  roles: { nombre: 'RolTest' },
};

describe('TokenService', () => {
  let service: TokenService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('firma el access token con payload y expiración de env', () => {
    process.env.JWT_EXPIRES_IN = '15m';
    service = new TokenService(mockJwtService);

    const token = service.signAccessToken(user);

    expect(token).toBe('signed_jwt');
    expect(mockJwtService.sign).toHaveBeenCalledWith(
      {
        sub: '1',
        correo: 'test@test.com',
        rol: '2',
        rol_nombre: 'RolTest',
      },
      { expiresIn: '15m' },
    );
    delete process.env.JWT_EXPIRES_IN;
  });

  it('genera un refresh token opaco de 96 caracteres', () => {
    service = new TokenService(mockJwtService);

    const token = service.generateRefreshToken();

    expect(token).toHaveLength(96);
  });

  it('calcula TTL en segundos desde JWT_REFRESH_EXPIRES_IN', () => {
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
    service = new TokenService(mockJwtService);

    expect(service.getRefreshTtlSeconds()).toBe(604800);
    delete process.env.JWT_REFRESH_EXPIRES_IN;
  });

  it('usa valores por defecto cuando no hay env configurado', () => {
    delete process.env.JWT_EXPIRES_IN;
    delete process.env.JWT_REFRESH_EXPIRES_IN;
    service = new TokenService(mockJwtService);

    expect(service.getAccessExpiresIn()).toBe('15m');
    expect(service.getRefreshTtlSeconds()).toBe(604800);
  });
});

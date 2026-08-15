import { RefreshTokenUseCase } from './refresh-token.use-case';
import { AuthRepository } from '../../../auth/domain/repositories/auth.repository.interface';
import { RefreshTokenRepository } from '../../../auth/domain/repositories/refresh-token.repository.interface';
import { TokenService } from '../services/token.service';
import { UnauthorizedException } from '@nestjs/common';

const mockUser = {
  id: 1n,
  correo: 'test@test.com',
  password_hash: 'hashed_password',
  rol_id: 2n,
  estado: true,
  nombre: 'Test',
  apellido: 'User',
  roles: { nombre: 'RolTest' },
};

const mockAuthRepository = {
  findById: jest.fn().mockResolvedValue(mockUser),
} as unknown as AuthRepository;

const mockRefreshTokenRepository = {
  findUserIdByToken: jest.fn().mockResolvedValue('1'),
  delete: jest.fn().mockResolvedValue(undefined),
  save: jest.fn().mockResolvedValue(undefined),
} as unknown as RefreshTokenRepository;

const mockTokenService = {
  signAccessToken: jest.fn(() => 'new_access_token'),
  generateRefreshToken: jest.fn(() => 'new_refresh_token'),
  getRefreshTtlSeconds: jest.fn(() => 604800),
  getAccessExpiresIn: jest.fn(() => '15m'),
} as unknown as TokenService;

describe('RefreshTokenUseCase', () => {
  let useCase: RefreshTokenUseCase;

  beforeEach(() => {
    useCase = new RefreshTokenUseCase(
      mockAuthRepository,
      mockRefreshTokenRepository,
      mockTokenService,
    );
    jest.clearAllMocks();
    (
      mockRefreshTokenRepository.findUserIdByToken as jest.Mock
    ).mockResolvedValue('1');
    (mockAuthRepository.findById as jest.Mock).mockResolvedValue(mockUser);
    (mockTokenService.signAccessToken as jest.Mock).mockReturnValue(
      'new_access_token',
    );
    (mockTokenService.generateRefreshToken as jest.Mock).mockReturnValue(
      'new_refresh_token',
    );
    (mockTokenService.getRefreshTtlSeconds as jest.Mock).mockReturnValue(
      604800,
    );
    (mockTokenService.getAccessExpiresIn as jest.Mock).mockReturnValue('15m');
  });

  it('renueva tokens y rota el refresh token', async () => {
    const result = await useCase.execute({ refresh_token: 'old_refresh' });

    expect(result.access_token).toBe('new_access_token');
    expect(result.refresh_token).toBe('new_refresh_token');
    expect(result.expires_in).toBe('15m');

    expect(mockRefreshTokenRepository.delete).toHaveBeenCalledWith(
      'old_refresh',
    );
    expect(mockRefreshTokenRepository.save).toHaveBeenCalledWith(
      'new_refresh_token',
      '1',
      604800,
    );
  });

  it('token inexistente: lanza UnauthorizedException', async () => {
    (
      mockRefreshTokenRepository.findUserIdByToken as jest.Mock
    ).mockResolvedValue(null);

    await expect(
      useCase.execute({ refresh_token: 'invalido' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('usuario inexistente: lanza UnauthorizedException', async () => {
    (mockAuthRepository.findById as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute({ refresh_token: 'token' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('usuario inactivo: lanza UnauthorizedException', async () => {
    (mockAuthRepository.findById as jest.Mock).mockResolvedValue({
      ...mockUser,
      estado: false,
    });

    await expect(useCase.execute({ refresh_token: 'token' })).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

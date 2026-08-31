jest.mock('bcrypt');
import { LoginUseCase } from './login.use-case';
import { AuthRepository } from '../../../auth/domain/repositories/auth.repository.interface';
import { RefreshTokenRepository } from '../../../auth/domain/repositories/refresh-token.repository.interface';
import { TokenService } from '../services/token.service';
import { LoginDto } from '../../../auth/presentation/dto/login.dto';
import { AppException } from '../../../common/errors';
import * as bcrypt from 'bcrypt';

// mocks
const mockUser = {
  id: 1n,
  correo: 'test@test.com',
  password_hash: 'hashed_password',
  rol_id: 2n,
  estado: true,
  correo_verificado: true,
  nombre: 'Test',
  apellido: 'User',
  roles: { nombre: 'RolTest' },
};

type MockUser = typeof mockUser;

function expectAppError(
  promise: Promise<unknown>,
  code: string,
): Promise<void> {
  return promise.then(
    () => {
      throw new Error('Se esperaba una excepción');
    },
    (err) => {
      expect(err).toBeInstanceOf(AppException);
      expect(err.getPayload().code).toBe(code);
    },
  );
}

const mockAuthRepository = {
  findByEmail: () => Promise.resolve(mockUser),
} as unknown as AuthRepository;

const mockRefreshTokenRepository = {
  save: jest.fn().mockResolvedValue(undefined),
} as unknown as RefreshTokenRepository;

const mockTokenService = {
  signAccessToken: jest.fn(() => 'fake_jwt_token'),
  generateRefreshToken: jest.fn(() => 'fake_refresh_token'),
  getRefreshTtlSeconds: jest.fn(() => 604800),
  getAccessExpiresIn: jest.fn(() => '15m'),
} as unknown as TokenService;

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;

  beforeEach(() => {
    useCase = new LoginUseCase(
      mockAuthRepository,
      mockTokenService,
      mockRefreshTokenRepository,
    );

    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (mockRefreshTokenRepository.save as jest.Mock).mockClear();
  });
  //--------------caso exitoso-----------------
  it('login exitoso: devuelve access token, refresh token y usuario', async () => {
    const dto: LoginDto = {
      correo: 'test@test.com',
      password: '123456',
    };

    const result = await useCase.execute(dto);

    expect(result.access_token).toBe('fake_jwt_token');
    expect(result.refresh_token).toBe('fake_refresh_token');
    expect(result.expires_in).toBe('15m');

    expect(result.usuario).toEqual({
      id: 1n,
      nombre: 'Test',
      apellido: 'User',
      correo: 'test@test.com',
      rol_id: 2,
      rol_nombre: 'RolTest',
    });
  });

  it('persiste el refresh token en el repositorio', async () => {
    const dto: LoginDto = {
      correo: 'test@test.com',
      password: '123456',
    };

    await useCase.execute(dto);

    expect(mockRefreshTokenRepository.save).toHaveBeenCalledWith(
      'fake_refresh_token',
      '1',
      604800,
    );
  });

  //--------------Usario no encontrado---------------
  it('user no existe: lanza AUTH_INVALID_CREDENTIALS', async () => {
    const dto: LoginDto = {
      correo: 'noexite@test.com',
      password: '123456',
    };

    mockAuthRepository.findByEmail = () => Promise.resolve(null);

    await expectAppError(useCase.execute(dto), 'AUTH_INVALID_CREDENTIALS');
  });

  //--------------Password incorrecta------------------
  it('password incorrecta: lanza AUTH_INVALID_CREDENTIALS', async () => {
    const dto: LoginDto = {
      correo: 'test@test.com',
      password: 'mala',
    };

    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expectAppError(useCase.execute(dto), 'AUTH_INVALID_CREDENTIALS');
  });

  it('user inactivo: lanza AUTH_INVALID_CREDENTIALS', async () => {
    const dto: LoginDto = {
      correo: 'inactivo@test.com',
      password: '123456',
    };

    mockAuthRepository.findByEmail = () =>
      Promise.resolve({
        ...mockUser,
        estado: false,
      } as MockUser);
    await expectAppError(useCase.execute(dto), 'AUTH_INVALID_CREDENTIALS');
  });

  it('user con credenciales correctas pero correo sin verificar: lanza AUTH_EMAIL_NOT_VERIFIED y no emite tokens', async () => {
    const dto: LoginDto = {
      correo: 'sinverificar@test.com',
      password: '123456',
    };

    mockAuthRepository.findByEmail = () =>
      Promise.resolve({
        ...mockUser,
        correo: 'sinverificar@test.com',
        correo_verificado: false,
      } as MockUser);

    await expectAppError(useCase.execute(dto), 'AUTH_EMAIL_NOT_VERIFIED');
    expect(mockRefreshTokenRepository.save).not.toHaveBeenCalled();
  });
});

describe('LoginUseCase - mensaje de error', () => {
  it('el mensaje de credenciales inválidas es en español', async () => {
    mockAuthRepository.findByEmail = () => Promise.resolve(null);
    const useCase = new LoginUseCase(
      mockAuthRepository,
      mockTokenService,
      mockRefreshTokenRepository,
    );

    try {
      await useCase.execute({
        correo: 'x@x.com',
        password: '123456',
      });
    } catch (err) {
      expect((err as AppException).getPayload().message).toBe(
        'Correo o contraseña incorrectos',
      );
    }
  });
});

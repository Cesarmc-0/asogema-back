jest.mock('bcrypt');
import { LoginUseCase } from './login.use-case';
import { AuthRepository } from '../../../auth/domain/repositories/auth.repository.interface';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { LoginDto } from '../../../auth/presentation/dto/login.dto';
import * as bcrypt from 'bcrypt';

// mocks
const mockUser = {
  id: 1n,
  correo: 'test@test.com',
  password_hash: 'hashed_password',
  rol_id: 2n,
  estado: true,
  nombre: 'Test',
  apellido: 'User',
};

type MockUser = typeof mockUser;

const mockAuthRepository = {
  findByEmail: () => Promise.resolve(mockUser),
} as unknown as AuthRepository;

const mockJwtService = {
  sign: () => 'fake_jwt_token',
} as unknown as JwtService;

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;

  beforeEach(() => {
    useCase = new LoginUseCase(mockAuthRepository, mockJwtService);

    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
  });
  //--------------caso exitoso-----------------
  it('login exitoso: devuelve acces_token y usuario', async () => {
    const dto: LoginDto = {
      correo: 'test@test.com',
      password: '123456',
    };

    const result = await useCase.execute(dto);

    expect(result.access_token).toBe('fake_jwt_token');

    expect(result.usuario).toEqual({
      id: 1n,
      nombre: 'Test',
      apellido: 'User',
      correo: 'test@test.com',
      rol_id: 2,
    });
  });

  //--------------Usario no encontrado---------------
  it('user no existe: lanza  UnauthorizedException', async () => {
    const dto: LoginDto = {
      correo: 'noexite@test.com',
      password: '123456',
    };

    mockAuthRepository.findByEmail = () => Promise.resolve(null);

    await expect(useCase.execute(dto)).rejects.toThrow(UnauthorizedException);
  });

  //--------------Password incorrecta------------------
  it('password incorrecta: lanza UnauthorizedException', async () => {
    const dto: LoginDto = {
      correo: 'test@test.com',
      password: 'mala',
    };

    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(useCase.execute(dto)).rejects.toThrow(UnauthorizedException);
  });

  it('user inactivo: lanza UnauthorizedException', async () => {
    const dto: LoginDto = {
      correo: 'inactivo@test.com',
      password: '123456',
    };

    mockAuthRepository.findByEmail = () =>
      Promise.resolve({
        ...mockUser,
        estado: false,
      } as MockUser);
    await expect(useCase.execute(dto)).rejects.toThrow(UnauthorizedException);
  });
});

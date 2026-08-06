import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import { UnauthorizedException } from '@nestjs/common';

process.env.JWT_SECRET = 'test_secret';

const mockUser = {
  id: 1n,
  correo: 'test@test.com',
  estado: true,
  rol_id: 2n,
  nombre: 'Test',
  apellido: 'User',
};

const mockPrismaService = {
  usuarios: {
    findUnique: jest.fn(),
  },
} as unknown as PrismaService;

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    strategy = new JwtStrategy(mockPrismaService);
    jest.clearAllMocks();
  });

  it('token válido: retorna AuthenticatedUser', async () => {
    (mockPrismaService.usuarios.findUnique as jest.Mock).mockResolvedValue(
      mockUser,
    );

    const result = await strategy.validate({ sub: '1' });

    expect(result).toEqual({
      id: 1n,
      correo: 'test@test.com',
      rol: 2n,
    });
    expect(mockPrismaService.usuarios.findUnique).toHaveBeenCalledWith({
      where: { id: 1n },
    });
  });

  it('usuario no encontrado: lanza UnauthorizedException', async () => {
    (mockPrismaService.usuarios.findUnique as jest.Mock).mockResolvedValue(
      null,
    );

    await expect(strategy.validate({ sub: '999' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('usuario inactivo: lanza UnauthorizedException', async () => {
    (mockPrismaService.usuarios.findUnique as jest.Mock).mockResolvedValue({
      ...mockUser,
      estado: false,
    });

    await expect(strategy.validate({ sub: '1' })).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

import { AuthRepositoryImpl } from './auth.repository';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';

const mockUser = {
  id: 1n,
  correo: 'test@test.com',
  password_hash: 'hashed',
  estado: true,
  nombre: 'Test',
  apellido: 'User',
  rol_id: 2n,
  numero_documento: '12345678',
  tipo_documento_id: 1,
  telefono: '3001234567',
};

const mockPrismaService = {
  usuarios: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
} as unknown as PrismaService;

describe('AuthRepositoryImpl', () => {
  let repo: AuthRepositoryImpl;

  beforeEach(() => {
    repo = new AuthRepositoryImpl(mockPrismaService);
  });

  describe('findByEmail', () => {
    it('retorna usuario si existe', async () => {
      (mockPrismaService.usuarios.findUnique as jest.Mock).mockResolvedValue(
        mockUser,
      );

      const result = await repo.findByEmail('test@test.com');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.usuarios.findUnique).toHaveBeenCalledWith({
        where: { correo: 'test@test.com' },
      });
    });

    it('retorna null si no existe', async () => {
      (mockPrismaService.usuarios.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      const result = await repo.findByEmail('noexiste@test.com');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('crea un usuario y lo retorna', async () => {
      (mockPrismaService.usuarios.create as jest.Mock).mockResolvedValue(
        mockUser,
      );

      const input = {
        correo: 'test@test.com',
        nombre: 'Test',
        apellido: 'User',
        numero_documento: '12345678',
        tipo_documento_id: 1,
        telefono: '3001234567',
        password_hash: 'hashed',
        rol_id: 5,
      };

      const result = await repo.create(input);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.usuarios.create).toHaveBeenCalledWith({
        data: input,
      });
    });
  });
});

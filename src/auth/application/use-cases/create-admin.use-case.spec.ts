jest.mock('bcrypt');
import { CreateAdminService } from './create-admin.use-case';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import * as bcrypt from 'bcrypt';

const mockAdminRole = {
  id: 1n,
  nombre: 'Administrador',
  estado: true,
};

const mockAdminUser = {
  id: 1n,
  rol_id: 1n,
  tipo_documento_id: 1,
  nombre: 'Administrador',
  apellido: 'Sistema',
  numero_documento: '0000000000',
  correo: 'admin@asogema.com',
  password_hash: 'hashed_password',
  telefono: '0000000000',
  correo_verificado: true,
  estado: true,
};

const mockPrismaService = {
  roles: {
    findFirst: jest.fn(),
  },
  usuarios: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
} as unknown as PrismaService;

describe('CreateAdminService', () => {
  let service: CreateAdminService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CreateAdminService(mockPrismaService);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
    (mockPrismaService.roles.findFirst as jest.Mock).mockResolvedValue(
      mockAdminRole,
    );
    (mockPrismaService.usuarios.findUnique as jest.Mock).mockResolvedValue(
      null,
    );
    (mockPrismaService.usuarios.create as jest.Mock).mockResolvedValue(
      mockAdminUser,
    );
  });

  it('crea admin si no existe', async () => {
    await service.ensureAdmin();

    expect(mockPrismaService.usuarios.create).toHaveBeenCalledWith({
      data: {
        rol_id: 1n,
        tipo_documento_id: 1,
        nombre: 'Administrador',
        apellido: 'Sistema',
        numero_documento: '0000000000',
        correo: 'admin@asogema.com',
        password_hash: 'hashed_password',
        telefono: '0000000000',
        correo_verificado: true,
      },
    });
  });

  it('no modifica si el admin ya existe y está correcto', async () => {
    (mockPrismaService.usuarios.findUnique as jest.Mock).mockResolvedValue({
      ...mockAdminUser,
      rol_id: 1n,
      nombre: 'Administrador',
      apellido: 'Sistema',
    });

    await service.ensureAdmin();

    expect(mockPrismaService.usuarios.create).not.toHaveBeenCalled();
    expect(mockPrismaService.usuarios.update).not.toHaveBeenCalled();
  });

  it('actualiza el admin si existe pero con datos incorrectos', async () => {
    (mockPrismaService.usuarios.findUnique as jest.Mock).mockResolvedValue({
      ...mockAdminUser,
      rol_id: 3n,
      nombre: 'Admin',
      apellido: 'Viejo',
    });

    await service.ensureAdmin();

    expect(mockPrismaService.usuarios.update).toHaveBeenCalledWith({
      where: { id: 1n },
      data: {
        rol_id: 1n,
        nombre: 'Administrador',
        apellido: 'Sistema',
        password_hash: 'hashed_password',
        correo_verificado: true,
      },
    });
  });

  it('loguea warning si no encuentra el rol de administrador', async () => {
    (mockPrismaService.roles.findFirst as jest.Mock).mockResolvedValue(null);

    await service.ensureAdmin();

    expect(mockPrismaService.usuarios.findUnique).not.toHaveBeenCalled();
    expect(mockPrismaService.usuarios.create).not.toHaveBeenCalled();
  });

  it('atrapa errores y no lanza excepción', async () => {
    (mockPrismaService.roles.findFirst as jest.Mock).mockRejectedValue(
      new Error('DB error'),
    );

    await expect(service.ensureAdmin()).resolves.toBeUndefined();
  });
});

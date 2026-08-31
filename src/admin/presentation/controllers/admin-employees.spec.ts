import { ConflictException, NotFoundException } from '@nestjs/common';
import { AdminController } from './admin.controller';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$10$hashedpassword'),
}));

const FAKE_STORAGE = { upload: jest.fn() } as any;

function buildMocks() {
  return {
    usuarios: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    roles: {
      findFirst: jest.fn(),
    },
  } as any;
}

describe('AdminController - Empleados', () => {
  let prisma: ReturnType<typeof buildMocks>;
  let controller: AdminController;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = buildMocks();
    controller = new AdminController(prisma, FAKE_STORAGE);
  });

  describe('POST /admin/employees', () => {
    const dto = {
      nombre: 'Juan',
      apellido: 'Pérez',
      tipo_documento_id: 1,
      numero_documento: '1234567890',
      telefono: '3001234567',
      correo: 'juan@asogema.com',
      password: 'Secret123',
    };

    it('crea un empleado válido con rol Empleado y correo_verificado=true', async () => {
      prisma.usuarios.findFirst.mockResolvedValue(null);
      prisma.roles.findFirst.mockResolvedValue({ id: 2n, nombre: 'Empleado' });
      prisma.usuarios.create.mockResolvedValue({
        id: 10n,
        nombre: 'Juan',
        apellido: 'Pérez',
        correo: 'juan@asogema.com',
        telefono: '3001234567',
      });

      const result = (await controller.createEmployee(dto)) as any;

      expect(prisma.usuarios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            correo_verificado: true,
            estado: true,
          }),
        }),
      );
      expect(result.id).toBe(10);
      expect(result.nombre).toBe('Juan Pérez');
    });

   it('lanza 409 si el correo ya está registrado', async () => {
      prisma.usuarios.findFirst.mockResolvedValue({
        id: 5n,
        correo: 'juan@asogema.com',
      });

      await expect(controller.createEmployee(dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('lanza 409 si el número de documento ya está registrado', async () => {
      prisma.usuarios.findFirst.mockResolvedValue({
        id: 5n,
        correo: 'otro@asogema.com',
        numero_documento: '1234567890',
      });

      await expect(controller.createEmployee(dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('lanza 400 si no existe rol Empleado', async () => {
      prisma.usuarios.findFirst.mockResolvedValue(null);
      prisma.roles.findFirst.mockResolvedValue(null);

      await expect(controller.createEmployee(dto)).rejects.toThrow(
        'Rol de empleado no encontrado',
      );
    });
  });

  describe('GET /admin/employees/:id', () => {
    it('devuelve el detalle del empleado', async () => {
      prisma.usuarios.findUnique.mockResolvedValue({
        id: 10n,
        nombre: 'Juan',
        apellido: 'Pérez',
        correo: 'juan@asogema.com',
        telefono: '3001234567',
        tipo_documento_id: 1n,
        numero_documento: '1234567890',
        estado: true,
        roles: { nombre: 'Empleado' },
      });

      const result = (await controller.getEmployee('10')) as any;

      expect(result.id).toBe(10);
      expect(result.numero_documento).toBe('1234567890');
    });

    it('lanza 404 si el usuario no es empleado', async () => {
      prisma.usuarios.findUnique.mockResolvedValue({
        id: 5n,
        roles: { nombre: 'Cliente' },
      });

      await expect(controller.getEmployee('5')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza 404 si el usuario no existe', async () => {
      prisma.usuarios.findUnique.mockResolvedValue(null);

      await expect(controller.getEmployee('99')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('PATCH /admin/employees/:id', () => {
    it('actualiza campos del empleado', async () => {
      prisma.usuarios.findUnique.mockResolvedValue({
        id: 10n,
        roles: { nombre: 'Empleado' },
      });
      prisma.usuarios.findFirst.mockResolvedValue(null);
      prisma.usuarios.update.mockResolvedValue({
        id: 10n,
        nombre: 'Juan Actualizado',
        apellido: 'Pérez',
        correo: 'juan@asogema.com',
        telefono: '3009999999',
      });

      const result = (await controller.updateEmployee('10', {
        nombre: 'Juan Actualizado',
        telefono: '3009999999',
      })) as any;

      expect(result.nombre).toBe('Juan Actualizado Pérez');
      expect(prisma.usuarios.update).toHaveBeenCalled();
    });

    it('lanza 409 si el nuevo correo ya existe en otro usuario', async () => {
      prisma.usuarios.findUnique.mockResolvedValue({
        id: 10n,
        roles: { nombre: 'Empleado' },
      });
      prisma.usuarios.findFirst.mockResolvedValue({
        id: 99n,
        correo: 'existente@asogema.com',
      });

      await expect(
        controller.updateEmployee('10', { correo: 'existente@asogema.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('lanza 404 si el empleado no existe', async () => {
      prisma.usuarios.findUnique.mockResolvedValue(null);

      await expect(
        controller.updateEmployee('99', { nombre: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('DELETE /admin/employees/:id', () => {
    it('desactiva el empleado (soft delete)', async () => {
      prisma.usuarios.findUnique.mockResolvedValue({
        id: 10n,
        roles: { nombre: 'Empleado' },
      });
      prisma.usuarios.update.mockResolvedValue({ id: 10n });

      const result = (await controller.deleteEmployee('10')) as any;

      expect(prisma.usuarios.update).toHaveBeenCalledWith({
        where: { id: 10n },
        data: { estado: false },
      });
      expect(result.deleted).toBe(true);
    });

    it('lanza 404 si el empleado no existe', async () => {
      prisma.usuarios.findUnique.mockResolvedValue(null);

      await expect(controller.deleteEmployee('99')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza 404 si el usuario no es empleado', async () => {
      prisma.usuarios.findUnique.mockResolvedValue({
        id: 5n,
        roles: { nombre: 'Cliente' },
      });

      await expect(controller.deleteEmployee('5')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

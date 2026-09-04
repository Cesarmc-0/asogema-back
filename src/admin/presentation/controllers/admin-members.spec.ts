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
    reservas_hotel: { findMany: jest.fn().mockResolvedValue([]) },
    reservas_restaurante: { findMany: jest.fn().mockResolvedValue([]) },
    reservas_evento: { findMany: jest.fn().mockResolvedValue([]) },
    facturas: { findMany: jest.fn().mockResolvedValue([]) },
  } as any;
}

describe('AdminController - Socios', () => {
  let prisma: ReturnType<typeof buildMocks>;
  let controller: AdminController;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = buildMocks();
    controller = new AdminController(prisma, FAKE_STORAGE);
  });

  describe('GET /admin/members', () => {
    it('devuelve activos e inactivos con campo activo', async () => {
      prisma.usuarios.findMany.mockResolvedValue([
        {
          id: 1n,
          nombre: 'Ana',
          apellido: 'López',
          correo: 'ana@asogema.com',
          telefono: '3001112222',
          estado: true,
          tipo_documento_id: 1n,
          numero_documento: '111',
        },
        {
          id: 2n,
          nombre: 'Luis',
          apellido: 'Pérez',
          correo: 'luis@asogema.com',
          telefono: '3003334444',
          estado: false,
          tipo_documento_id: 1n,
          numero_documento: '222',
        },
      ]);

      const result = (await controller.getMembers()) as any;

      expect(prisma.usuarios.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { roles: { nombre: 'Cliente' } },
        }),
      );
      expect(result).toHaveLength(2);
      expect(result[0].activo).toBe(true);
      expect(result[1].activo).toBe(false);
    });
  });

  describe('POST /admin/members', () => {
    const dto = {
      nombre: 'Ana',
      apellido: 'López',
      tipo_documento_id: 1,
      numero_documento: '1234567890',
      telefono: '3001234567',
      correo: 'ana@asogema.com',
      password: 'Secret123',
    };

    it('crea un socio válido con rol Cliente y correo_verificado=true', async () => {
      prisma.usuarios.findFirst.mockResolvedValue(null);
      prisma.roles.findFirst.mockResolvedValue({ id: 3n, nombre: 'Cliente' });
      prisma.usuarios.create.mockResolvedValue({
        id: 11n,
        nombre: 'Ana',
        apellido: 'López',
        correo: 'ana@asogema.com',
        telefono: '3001234567',
        estado: true,
      });

      const result = (await controller.createMember(dto)) as any;

      expect(prisma.usuarios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            apellido: 'López',
            correo_verificado: true,
            estado: true,
          }),
        }),
      );
      expect(result.id).toBe(11);
      expect(result.nombre).toBe('Ana López');
      expect(result.activo).toBe(true);
    });

    it('lanza 409 si el correo ya está registrado', async () => {
      prisma.usuarios.findFirst.mockResolvedValue({
        id: 5n,
        correo: 'ana@asogema.com',
      });

      await expect(controller.createMember(dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('lanza 409 si el número de documento ya está registrado', async () => {
      prisma.usuarios.findFirst.mockResolvedValue({
        id: 5n,
        correo: 'otro@asogema.com',
        numero_documento: '1234567890',
      });

      await expect(controller.createMember(dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('lanza 400 si no existe rol Cliente', async () => {
      prisma.usuarios.findFirst.mockResolvedValue(null);
      prisma.roles.findFirst.mockResolvedValue(null);

      await expect(controller.createMember(dto)).rejects.toThrow(
        'Rol de cliente no encontrado',
      );
    });
  });

  describe('GET /admin/members/:id', () => {
    it('devuelve bloque usuario + reservas y facturas', async () => {
      prisma.usuarios.findUnique.mockResolvedValue({
        id: 11n,
        nombre: 'Ana',
        apellido: 'López',
        correo: 'ana@asogema.com',
        telefono: '3001234567',
        tipo_documento_id: 1n,
        numero_documento: '1234567890',
        estado: true,
        roles: { nombre: 'Cliente' },
      });

      const result = (await controller.getMemberDetail('11')) as any;

      expect(result.usuario.nombre).toBe('Ana');
      expect(result.usuario.activo).toBe(true);
      expect(result.reservas_hotel).toEqual([]);
    });

    it('lanza 404 si el usuario no es cliente', async () => {
      prisma.usuarios.findUnique.mockResolvedValue({
        id: 5n,
        roles: { nombre: 'Empleado' },
      });

      await expect(controller.getMemberDetail('5')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('PATCH /admin/members/:id', () => {
    it('actualiza campos del socio', async () => {
      prisma.usuarios.findUnique.mockResolvedValue({
        id: 11n,
        roles: { nombre: 'Cliente' },
      });
      prisma.usuarios.findFirst.mockResolvedValue(null);
      prisma.usuarios.update.mockResolvedValue({
        id: 11n,
        nombre: 'Ana María',
        apellido: 'López',
        correo: 'ana@asogema.com',
        telefono: '3009999999',
        estado: true,
      });

      const result = (await controller.updateMember('11', {
        nombre: 'Ana María',
        telefono: '3009999999',
      })) as any;

      expect(result.nombre).toBe('Ana María López');
      expect(prisma.usuarios.update).toHaveBeenCalled();
    });

    it('lanza 409 si el nuevo correo ya existe en otro usuario', async () => {
      prisma.usuarios.findUnique.mockResolvedValue({
        id: 11n,
        roles: { nombre: 'Cliente' },
      });
      prisma.usuarios.findFirst.mockResolvedValue({
        id: 99n,
        correo: 'existente@asogema.com',
      });

      await expect(
        controller.updateMember('11', { correo: 'existente@asogema.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('lanza 404 si el socio no existe', async () => {
      prisma.usuarios.findUnique.mockResolvedValue(null);

      await expect(
        controller.updateMember('99', { nombre: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('PATCH /admin/members/:id/status', () => {
    it('desactiva el socio (activo=false)', async () => {
      prisma.usuarios.findUnique.mockResolvedValue({
        id: 11n,
        roles: { nombre: 'Cliente' },
      });
      prisma.usuarios.update.mockResolvedValue({ id: 11n, estado: false });

      const result = (await controller.updateMemberStatus('11', {
        activo: false,
      })) as any;

      expect(prisma.usuarios.update).toHaveBeenCalledWith({
        where: { id: 11n },
        data: { estado: false },
      });
      expect(result.activo).toBe(false);
    });

    it('lanza 404 si el usuario no es cliente', async () => {
      prisma.usuarios.findUnique.mockResolvedValue({
        id: 5n,
        roles: { nombre: 'Empleado' },
      });

      await expect(
        controller.updateMemberStatus('5', { activo: false }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

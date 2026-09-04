import { NotFoundException } from '@nestjs/common';
import { AdminController } from './admin.controller';

const FAKE_STORAGE = { upload: jest.fn() } as any;

function buildMocks() {
  return {
    salones: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    imagenes: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  } as any;
}

describe('AdminController - Salones (borrado lógico)', () => {
  let prisma: ReturnType<typeof buildMocks>;
  let controller: AdminController;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = buildMocks();
    prisma.imagenes.findMany.mockResolvedValue([]);
    controller = new AdminController(prisma, FAKE_STORAGE);
  });

  describe('GET /admin/events/salons', () => {
    it('excluye ELIMINADO por defecto', async () => {
      prisma.salones.findMany.mockResolvedValue([]);

      await controller.getEventSalons();

      expect(prisma.salones.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { estado: { not: 'ELIMINADO' } },
        }),
      );
    });

    it('incluye todo con incluir_inactivos=true', async () => {
      prisma.salones.findMany.mockResolvedValue([]);

      await controller.getEventSalons('true');

      expect(prisma.salones.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });
  });

  describe('DELETE /admin/events/salons/:id', () => {
    it('marca estado ELIMINADO en vez de borrar el registro', async () => {
      prisma.salones.findUnique.mockResolvedValue({ id: 1n });
      prisma.salones.update.mockResolvedValue({ id: 1n, estado: 'ELIMINADO' });

      const result = await controller.deleteEventSalon(1);

      expect(prisma.salones.update).toHaveBeenCalledWith({
        where: { id: 1n },
        data: { estado: 'ELIMINADO' },
      });
      expect(result).toEqual({ id: 1n, estado: 'ELIMINADO' });
    });

    it('lanza 404 si el salón no existe', async () => {
      prisma.salones.findUnique.mockResolvedValue(null);

      await expect(controller.deleteEventSalon(99)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.salones.update).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /admin/events/salons/:id/reactivate', () => {
    it('reactiva el salón como DISPONIBLE', async () => {
      prisma.salones.findUnique.mockResolvedValue({ id: 1n });
      prisma.salones.update.mockResolvedValue({ id: 1n, estado: 'DISPONIBLE' });

      const result = await controller.reactivateEventSalon(1);

      expect(prisma.salones.update).toHaveBeenCalledWith({
        where: { id: 1n },
        data: { estado: 'DISPONIBLE' },
      });
      expect(result).toEqual({ id: 1n, estado: 'DISPONIBLE' });
    });

    it('lanza 404 si el salón no existe', async () => {
      prisma.salones.findUnique.mockResolvedValue(null);

      await expect(controller.reactivateEventSalon(99)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.salones.update).not.toHaveBeenCalled();
    });
  });
});

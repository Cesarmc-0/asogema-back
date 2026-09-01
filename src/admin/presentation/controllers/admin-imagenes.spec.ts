import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminController } from './admin.controller';

const FAKE_STORAGE = { upload: jest.fn() } as any;

function buildMocks() {
  return {
    salones: { findUnique: jest.fn(), update: jest.fn() },
    habitaciones: { findUnique: jest.fn(), update: jest.fn() },
    productos_menu: { findUnique: jest.fn(), update: jest.fn() },
    imagenes: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  } as any;
}

describe('AdminController - Galería de imágenes', () => {
  let prisma: ReturnType<typeof buildMocks>;
  let controller: AdminController;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = buildMocks();
    controller = new AdminController(prisma, FAKE_STORAGE);
  });

  it('la primera imagen de un ítem se marca principal y sincroniza imagen_url', async () => {
    prisma.salones.findUnique.mockResolvedValue({ id: 1n });
    prisma.imagenes.count.mockResolvedValue(0);
    prisma.imagenes.updateMany.mockResolvedValue({ count: 0 });
    prisma.imagenes.create.mockResolvedValue({
      id: 10n,
      url: 'https://s3/salon/a.jpg',
      es_principal: true,
      orden: 0,
      activo: true,
    });
    prisma.salones.update.mockResolvedValue({ id: 1n });

    const result = (await controller.createImagen({
      entidad: 'salon',
      entidad_id: 1,
      url: 'https://s3/salon/a.jpg',
    })) as any;

    expect(prisma.imagenes.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { entidad: 'salon', entidad_id: 1n },
        data: { es_principal: false },
      }),
    );
    expect(prisma.salones.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { imagen_url: 'https://s3/salon/a.jpg' },
      }),
    );
    expect(result.es_principal).toBe(true);
  });

  it('rechaza una entidad inválida', async () => {
    await expect(
      controller.createImagen({
        entidad: 'pizza',
        entidad_id: 1,
        url: 'https://s3/x.jpg',
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('lanza 404 si el ítem dueño no existe', async () => {
    prisma.salones.findUnique.mockResolvedValue(null);

    await expect(
      controller.createImagen({
        entidad: 'salon',
        entidad_id: 99,
        url: 'https://s3/x.jpg',
      } as any),
    ).rejects.toThrow(NotFoundException);
  });

  it('al marcar principal: desmarca las demás y sincroniza imagen_url', async () => {
    const current = {
      id: 5n,
      entidad: 'salon',
      entidad_id: 1n,
      url: 'https://s3/b.jpg',
      es_principal: false,
      orden: 1,
    };
    prisma.imagenes.findUnique.mockResolvedValue(current);
    prisma.imagenes.updateMany.mockResolvedValue({ count: 1 });
    prisma.imagenes.update.mockResolvedValue({
      ...current,
      es_principal: true,
    });
    prisma.salones.update.mockResolvedValue({ id: 1n });

    const result = (await controller.updateImagen('5', {
      es_principal: true,
    })) as any;

    expect(prisma.imagenes.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ entidad_id: 1n, NOT: { id: 5n } }),
      }),
    );
    expect(prisma.salones.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { imagen_url: 'https://s3/b.jpg' } }),
    );
    expect(result.es_principal).toBe(true);
  });

  it('al eliminar la principal, reasigna la portada al de menor orden', async () => {
    prisma.imagenes.findUnique.mockResolvedValue({
      id: 5n,
      entidad: 'producto',
      entidad_id: 2n,
      url: 'https://s3/a.jpg',
      es_principal: true,
      orden: 0,
    });
    prisma.imagenes.update.mockResolvedValue({});
    prisma.imagenes.findFirst.mockResolvedValue({
      id: 8n,
      url: 'https://s3/b.jpg',
      es_principal: false,
      orden: 1,
      activo: true,
    });
    prisma.productos_menu.update.mockResolvedValue({ id: 2n });

    const result = await controller.deleteImagen('5');

    expect(prisma.imagenes.update).toHaveBeenCalledWith({
      where: { id: 5n },
      data: { activo: false },
    });
    expect(prisma.imagenes.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ activo: true }),
      }),
    );
    expect(prisma.imagenes.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 8n },
        data: { es_principal: true },
      }),
    );
    expect(prisma.productos_menu.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { imagen_url: 'https://s3/b.jpg' } }),
    );
    expect(result).toEqual({ deleted: true, id: '5' });
  });

  it('eliminar imagen inexistente lanza 404', async () => {
    prisma.imagenes.findUnique.mockResolvedValue(null);
    await expect(controller.deleteImagen('5')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('GET lista la galería ordenada por orden', async () => {
    prisma.salones.findUnique.mockResolvedValue({ id: 1n });
    prisma.imagenes.findMany.mockResolvedValue([
      { id: 1n, url: 'a.jpg', es_principal: true, orden: 0, activo: true },
      { id: 2n, url: 'b.jpg', es_principal: false, orden: 1, activo: true },
    ]);

    const result = await controller.getImagenes('salon', '1');

    expect(prisma.imagenes.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          entidad: 'salon',
          entidad_id: 1n,
          activo: true,
        },
        orderBy: [{ orden: 'asc' }, { id: 'asc' }],
      }),
    );
    expect(result).toHaveLength(2);
  });
});

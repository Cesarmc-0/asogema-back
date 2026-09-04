import { ConflictException } from '@nestjs/common';
import { AdminController } from './admin.controller';

const FAKE_STORAGE = { upload: jest.fn() } as any;

function buildMocks() {
  return {
    tipos_habitacion: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    habitaciones: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    categorias_menu: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    productos_menu: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    salones: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  } as any;
}

describe('AdminController - Validaciones de duplicados', () => {
  let prisma: ReturnType<typeof buildMocks>;
  let controller: AdminController;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = buildMocks();
    controller = new AdminController(prisma, FAKE_STORAGE);
  });

  describe.each([
    [
      'createRoomType',
      'tipos_habitacion',
      { nombre: 'Suite', capacidad: 2, precio_noche: 100, imagen_url: null },
    ],
    [
      'createRoom',
      'habitaciones',
      { numero: '101', piso: 1, tipo_id: 1, imagen_url: null },
    ],
    ['createMenuCategory', 'categorias_menu', { nombre: 'Desayunos' }],
    [
      'createMenuProduct',
      'productos_menu',
      {
        nombre: 'Café',
        categoria_id: 1,
        precio: 5,
        stock: 10,
        descripcion: null,
        imagen_url: null,
      },
    ],
    [
      'createEventSalon',
      'salones',
      {
        nombre: 'Salón A',
        capacidad: 50,
        precio_base: 500,
        imagen_url: null,
        ubicacion: null,
      },
    ],
  ])('%s', (methodName, model, dto) => {
    it('lanza ConflictException si ya existe un registro con el mismo nombre', async () => {
      prisma[model].findFirst.mockResolvedValue({ id: 1n });

      await expect(controller[methodName](dto)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma[model].create).not.toHaveBeenCalled();
    });

    it('crea el registro cuando no hay duplicados', async () => {
      prisma[model].findFirst.mockResolvedValue(null);
      prisma[model].create.mockResolvedValue({ id: 1n });

      const result = await controller[methodName](dto);

      expect(prisma[model].findFirst).toHaveBeenCalled();
      expect(result).toEqual({ id: 1n });
      expect(prisma[model].create).toHaveBeenCalled();
    });
  });
});

describe('AdminController - Soft delete', () => {
  let prisma: ReturnType<typeof buildMocks>;
  let controller: AdminController;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = buildMocks();
    controller = new AdminController(prisma, FAKE_STORAGE);
  });

  it.each([
    ['deleteRoomType', 'tipos_habitacion'],
    ['deleteRoom', 'habitaciones'],
    ['deleteMenuCategory', 'categorias_menu'],
  ])(
    '%s marca activo:false en vez de borrar el registro',
    async (methodName, model) => {
      prisma[model].update.mockResolvedValue({ id: 1n });

      const result = await controller[methodName](1);

      expect(prisma[model].update).toHaveBeenCalledWith({
        where: { id: 1n },
        data: { activo: false },
      });
      expect(result).toEqual({ id: 1n });
    },
  );

  it('deleteMenuProduct marca activo:"inactivo" en vez de borrar el registro', async () => {
    prisma.productos_menu.update.mockResolvedValue({ id: 1n });

    const result = await controller.deleteMenuProduct(1);

    expect(prisma.productos_menu.update).toHaveBeenCalledWith({
      where: { id: 1n },
      data: { activo: 'inactivo' },
    });
    expect(result).toEqual({ id: 1n });
  });

  it.each([
    ['reactivateRoomType', 'tipos_habitacion'],
    ['reactivateRoom', 'habitaciones'],
    ['reactivateMenuCategory', 'categorias_menu'],
  ])(
    '%s marca activo:true para reactivar el registro',
    async (methodName, model) => {
      prisma[model].update.mockResolvedValue({ id: 1n });

      const result = await controller[methodName](1);

      expect(prisma[model].update).toHaveBeenCalledWith({
        where: { id: 1n },
        data: { activo: true },
      });
      expect(result).toEqual({ id: 1n });
    },
  );

  it('reactivateMenuProduct marca activo:"activo" para reactivar el registro', async () => {
    prisma.productos_menu.update.mockResolvedValue({ id: 1n });

    const result = await controller.reactivateMenuProduct(1);

    expect(prisma.productos_menu.update).toHaveBeenCalledWith({
      where: { id: 1n },
      data: { activo: 'activo' },
    });
    expect(result).toEqual({ id: 1n });
  });
});

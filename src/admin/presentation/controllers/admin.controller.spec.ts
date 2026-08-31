import { ConflictException } from '@nestjs/common';
import { AdminController } from './admin.controller';

const FAKE_STORAGE = { upload: jest.fn() } as any;

function buildMocks() {
  return {
    tipos_habitacion: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    habitaciones: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    categorias_menu: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    productos_menu: {
      findFirst: jest.fn(),
      create: jest.fn(),
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

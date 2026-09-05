import { BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import {
  CreatePedidoOnlineUseCase,
  MESA_FEE,
} from './create-pedido-online.use-case';

const productos = [
  {
    id: 1n,
    nombre: 'Hamburguesa',
    precio: new Decimal(20000),
    stock: 10,
    activo: 'activo',
    aplica_iva: true,
  },
  {
    id: 2n,
    nombre: 'Gaseosa',
    precio: new Decimal(5000),
    stock: 3,
    activo: 'activo',
    aplica_iva: false,
  },
];

const mockPrisma = {
  productos_menu: {
    findMany: jest
      .fn()
      .mockImplementation(({ where }) =>
        Promise.resolve(productos.filter((p) => where.id.in.includes(p.id))),
      ),
  },
};

const mockRestaurantRepo = {
  createPedidoOnline: jest.fn().mockImplementation((data) =>
    Promise.resolve({
      id: 50n,
      tipo: data.tipo,
      incluye_mesa: data.incluye_mesa,
      detalle_pedido_online: data.items,
    }),
  ),
};

const mockComandaGateway = {
  notificarCambio: jest.fn(),
};

describe('CreatePedidoOnlineUseCase', () => {
  let useCase: CreatePedidoOnlineUseCase;

  beforeEach(() => {
    useCase = new CreatePedidoOnlineUseCase(
      mockPrisma as never,
      mockRestaurantRepo as never,
      mockComandaGateway as never,
    );
    jest.clearAllMocks();
  });

  it('para llevar: subtotal = suma de items, sin cargo de mesa', async () => {
    const result = await useCase.execute(10n, {
      items: [
        { producto_id: 1n, cantidad: 2 },
        { producto_id: 2n, cantidad: 1 },
      ],
      tipo: 'PARA_LLEVAR',
    });

    // Hamburguesa 2x20000 (con IVA) + Gaseosa 5000 (exenta) → IVA solo sobre 40000
    expect(result.subtotal).toBe(45000);
    expect(result.impuestos).toBe(7600);
    expect(result.cargo_mesa).toBe(0);
    expect(result.total).toBe(52600);
    expect(result.incluye_mesa).toBe(false);
    expect(mockRestaurantRepo.createPedidoOnline).toHaveBeenCalledWith(
      expect.objectContaining({
        total: new Decimal(52600),
        impuestos: new Decimal(7600),
      }),
    );
  });

  it('notifica el cambio en el tablero tras crear el pedido', async () => {
    await useCase.execute(10n, {
      items: [{ producto_id: 1n, cantidad: 1 }],
      tipo: 'PARA_LLEVAR',
    });

    expect(mockComandaGateway.notificarCambio).toHaveBeenCalledWith({
      pedido_id: 50,
    });
  });

  it('en mesa: agrega el cargo de mesa de $5.000', async () => {
    const result = await useCase.execute(10n, {
      items: [{ producto_id: 1n, cantidad: 1 }],
      tipo: 'EN_MESA',
    });

    expect(result.subtotal).toBe(20000);
    expect(result.impuestos).toBe(3800);
    expect(result.cargo_mesa).toBe(MESA_FEE);
    expect(result.total).toBe(28800);
    expect(result.incluye_mesa).toBe(true);
  });

  it('cantidad mayor al stock: lanza BadRequestException', async () => {
    await expect(
      useCase.execute(10n, {
        items: [{ producto_id: 2n, cantidad: 5 }],
        tipo: 'PARA_LLEVAR',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('items vacíos: lanza BadRequestException', async () => {
    await expect(
      useCase.execute(10n, { items: [], tipo: 'PARA_LLEVAR' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('producto inexistente: lanza BadRequestException', async () => {
    mockPrisma.productos_menu.findMany.mockResolvedValueOnce([productos[0]]);

    await expect(
      useCase.execute(10n, {
        items: [
          { producto_id: 1n, cantidad: 1 },
          { producto_id: 999n, cantidad: 1 },
        ],
        tipo: 'PARA_LLEVAR',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});

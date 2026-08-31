import { NotFoundException } from '@nestjs/common';
import { GetPedidoDetalleUseCase } from './get-pedido-detalle.use-case';

const mockPrisma = {
  pedidos_online: {
    findUnique: jest.fn(),
  },
};

describe('GetPedidoDetalleUseCase', () => {
  let useCase: GetPedidoDetalleUseCase;

  beforeEach(() => {
    useCase = new GetPedidoDetalleUseCase(mockPrisma as never);
    jest.clearAllMocks();
  });

  it('devuelve el detalle del pedido con items y cliente', async () => {
    mockPrisma.pedidos_online.findUnique.mockResolvedValueOnce({
      id: 1n,
      tipo: 'PARA_LLEVAR',
      estado: 'PENDIENTE',
      total: 30000,
      subtotal: 30000,
      descuento: 0,
      impuestos: 0,
      created_at: new Date('2026-08-19T10:00:00Z'),
      usuarios: { nombre: 'Carlos', apellido: 'Martinez' },
      detalle_pedido_online: [
        {
          producto_id: 2n,
          cantidad: 5,
          precio_unitario: 6000,
          subtotal: 30000,
          productos_menu: { nombre: 'Empanadas' },
        },
      ],
    });

    const result = await useCase.execute(1n);

    expect(result.pedido_id).toBe(1n);
    expect(result.cliente).toBe('Carlos Martinez');
    expect(result.items[0].nombre).toBe('Empanadas');
    expect(result.items[0].subtotal).toBe(30000);
  });

  it('lanza NotFoundException cuando el pedido no existe', async () => {
    mockPrisma.pedidos_online.findUnique.mockResolvedValueOnce(null);

    await expect(useCase.execute(999n)).rejects.toThrow(NotFoundException);
  });

  it('deja cliente null cuando el usuario no tiene nombre', async () => {
    mockPrisma.pedidos_online.findUnique.mockResolvedValueOnce({
      id: 1n,
      tipo: 'PARA_LLEVAR',
      estado: 'PENDIENTE',
      total: 30000,
      subtotal: 30000,
      descuento: 0,
      impuestos: 0,
      created_at: new Date(),
      usuarios: null,
      detalle_pedido_online: [],
    });

    const result = await useCase.execute(1n);

    expect(result.cliente).toBeNull();
  });
});

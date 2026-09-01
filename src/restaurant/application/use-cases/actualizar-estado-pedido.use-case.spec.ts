import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ActualizarEstadoPedidoUseCase } from './actualizar-estado-pedido.use-case';

const mockPrisma = {
  pedidos_online: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

describe('ActualizarEstadoPedidoUseCase', () => {
  let useCase: ActualizarEstadoPedidoUseCase;

  beforeEach(() => {
    useCase = new ActualizarEstadoPedidoUseCase(mockPrisma as never);
    jest.clearAllMocks();
  });

  it('avanza PENDIENTE → EN_PREPARACION', async () => {
    mockPrisma.pedidos_online.findUnique.mockResolvedValueOnce({
      id: 1n,
      estado: 'PENDIENTE',
    });

    const result = await useCase.execute(1n, 'EN_PREPARACION');

    expect(result).toEqual({ pedido_id: 1n, estado: 'EN_PREPARACION' });
    expect(mockPrisma.pedidos_online.update).toHaveBeenCalledWith({
      where: { id: 1n },
      data: { estado: 'EN_PREPARACION' },
    });
  });

  it('avanza EN_PREPARACION → ENTREGADO', async () => {
    mockPrisma.pedidos_online.findUnique.mockResolvedValueOnce({
      id: 1n,
      estado: 'EN_PREPARACION',
    });

    const result = await useCase.execute(1n, 'ENTREGADO');

    expect(result.estado).toBe('ENTREGADO');
  });

  it('no permite saltarse estados (PENDIENTE → ENTREGADO)', async () => {
    mockPrisma.pedidos_online.findUnique.mockResolvedValueOnce({
      id: 1n,
      estado: 'PENDIENTE',
    });

    await expect(useCase.execute(1n, 'ENTREGADO')).rejects.toThrow(
      BadRequestException,
    );
    expect(mockPrisma.pedidos_online.update).not.toHaveBeenCalled();
  });

  it('no permite retroceder (ENTREGADO → EN_PREPARACION)', async () => {
    mockPrisma.pedidos_online.findUnique.mockResolvedValueOnce({
      id: 1n,
      estado: 'ENTREGADO',
    });

    await expect(useCase.execute(1n, 'EN_PREPARACION')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('es idempotente: repetir el mismo estado no actualiza', async () => {
    mockPrisma.pedidos_online.findUnique.mockResolvedValueOnce({
      id: 1n,
      estado: 'EN_PREPARACION',
    });

    const result = await useCase.execute(1n, 'EN_PREPARACION');

    expect(result.estado).toBe('EN_PREPARACION');
    expect(mockPrisma.pedidos_online.update).not.toHaveBeenCalled();
  });

  it('rechaza un estado no válido', async () => {
    await expect(useCase.execute(1n, 'CANCELADO' as never)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('lanza NotFoundException si el pedido no existe', async () => {
    mockPrisma.pedidos_online.findUnique.mockResolvedValueOnce(null);

    await expect(useCase.execute(999n, 'ENTREGADO')).rejects.toThrow(
      NotFoundException,
    );
  });
});

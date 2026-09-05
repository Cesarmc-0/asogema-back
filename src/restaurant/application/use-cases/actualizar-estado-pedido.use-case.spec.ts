import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ActualizarEstadoPedidoUseCase } from './actualizar-estado-pedido.use-case';

const mockPrisma = {
  pedidos_online: {
    findUnique: jest.fn(),
    update: jest.fn().mockResolvedValue({}),
  },
};

const mockComandaQueue = {
  enqueuePedidoListo: jest.fn().mockResolvedValue(undefined),
};

const mockComandaGateway = {
  notificarCambio: jest.fn(),
};

describe('ActualizarEstadoPedidoUseCase', () => {
  let useCase: ActualizarEstadoPedidoUseCase;

  beforeEach(() => {
    useCase = new ActualizarEstadoPedidoUseCase(
      mockPrisma as never,
      mockComandaQueue as never,
      mockComandaGateway as never,
    );
    jest.clearAllMocks();
  });

  it('avanza RECIBIDO → LISTO', async () => {
    mockPrisma.pedidos_online.findUnique.mockResolvedValueOnce({
      id: 1n,
      estado: 'RECIBIDO',
      usuario_id: 10n,
    });

    const result = await useCase.execute(1n, 'LISTO');

    expect(result).toEqual({ pedido_id: 1n, estado: 'LISTO' });
    expect(mockPrisma.pedidos_online.update).toHaveBeenCalledWith({
      where: { id: 1n },
      data: { estado: 'LISTO' },
    });
    expect(mockComandaQueue.enqueuePedidoListo).toHaveBeenCalledWith(1, 10);
    expect(mockComandaGateway.notificarCambio).toHaveBeenCalledWith({ pedido_id: 1 });
  });

  it('avanza LISTO → ENTREGADO', async () => {
    mockPrisma.pedidos_online.findUnique.mockResolvedValueOnce({
      id: 1n,
      estado: 'LISTO',
      usuario_id: 10n,
    });

    const result = await useCase.execute(1n, 'ENTREGADO');

    expect(result.estado).toBe('ENTREGADO');
  });

  it('no permite saltarse estados (RECIBIDO → ENTREGADO)', async () => {
    mockPrisma.pedidos_online.findUnique.mockResolvedValueOnce({
      id: 1n,
      estado: 'RECIBIDO',
      usuario_id: 10n,
    });

    await expect(useCase.execute(1n, 'ENTREGADO')).rejects.toThrow(
      BadRequestException,
    );
    expect(mockPrisma.pedidos_online.update).not.toHaveBeenCalled();
  });

  it('no permite retroceder (ENTREGADO → LISTO)', async () => {
    mockPrisma.pedidos_online.findUnique.mockResolvedValueOnce({
      id: 1n,
      estado: 'ENTREGADO',
      usuario_id: 10n,
    });

    await expect(useCase.execute(1n, 'LISTO')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('es idempotente: repetir el mismo estado no actualiza', async () => {
    mockPrisma.pedidos_online.findUnique.mockResolvedValueOnce({
      id: 1n,
      estado: 'LISTO',
      usuario_id: 10n,
    });

    const result = await useCase.execute(1n, 'LISTO');

    expect(result.estado).toBe('LISTO');
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

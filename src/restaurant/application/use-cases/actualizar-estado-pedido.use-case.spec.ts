import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ActualizarEstadoPedidoUseCase } from './actualizar-estado-pedido.use-case';

const mockPrisma = {
  pedidos_online: {
    findUnique: jest.fn(),
    update: jest.fn(),
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
    jest.clearAllMocks();
    useCase = new ActualizarEstadoPedidoUseCase(
      mockPrisma as never,
      mockComandaQueue as never,
      mockComandaGateway as never,
    );
  });

  it('avanza RECIBIDO → LISTO', async () => {
    mockPrisma.pedidos_online.findUnique.mockResolvedValueOnce({
      id: 1n,
      estado: 'RECIBIDO',
      usuario_id: 5,
    });

    const result = await useCase.execute(1n, 'LISTO');

    expect(result).toEqual({ pedido_id: 1n, estado: 'LISTO' });
    expect(mockPrisma.pedidos_online.update).toHaveBeenCalledWith({
      where: { id: 1n },
      data: { estado: 'LISTO' },
    });
  });

  it('avanza LISTO → ENTREGADO', async () => {
    mockPrisma.pedidos_online.findUnique.mockResolvedValueOnce({
      id: 1n,
      estado: 'LISTO',
      usuario_id: 5,
    });

    const result = await useCase.execute(1n, 'ENTREGADO');

    expect(result.estado).toBe('ENTREGADO');
  });

  it('notifica el cambio en el tablero tras cada transición válida', async () => {
    mockPrisma.pedidos_online.findUnique.mockResolvedValueOnce({
      id: 1n,
      estado: 'RECIBIDO',
      usuario_id: 5,
    });

    await useCase.execute(1n, 'LISTO');

    expect(mockComandaGateway.notificarCambio).toHaveBeenCalledWith({
      pedido_id: 1,
    });
  });

  it('encola la notificación al mesero cuando el pedido pasa a LISTO', async () => {
    mockPrisma.pedidos_online.findUnique.mockResolvedValueOnce({
      id: 1n,
      estado: 'RECIBIDO',
      usuario_id: 5,
    });

    await useCase.execute(1n, 'LISTO');

    expect(mockComandaQueue.enqueuePedidoListo).toHaveBeenCalledWith(1, 5);
    expect(mockComandaGateway.notificarCambio).toHaveBeenCalledWith({
      pedido_id: 1,
    });
  });

  it('no encola notificación al mesero en transiciones que no son a LISTO', async () => {
    mockPrisma.pedidos_online.findUnique.mockResolvedValueOnce({
      id: 1n,
      estado: 'LISTO',
      usuario_id: 5,
    });

    await useCase.execute(1n, 'ENTREGADO');

    expect(mockComandaQueue.enqueuePedidoListo).not.toHaveBeenCalled();
  });

  it('no permite saltarse estados (RECIBIDO → ENTREGADO)', async () => {
    mockPrisma.pedidos_online.findUnique.mockResolvedValueOnce({
      id: 1n,
      estado: 'RECIBIDO',
      usuario_id: 5,
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
      usuario_id: 5,
    });

    await expect(useCase.execute(1n, 'LISTO')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('es idempotente: repetir el mismo estado no actualiza', async () => {
    mockPrisma.pedidos_online.findUnique.mockResolvedValueOnce({
      id: 1n,
      estado: 'LISTO',
      usuario_id: 5,
    });

    const result = await useCase.execute(1n, 'LISTO');

    expect(result.estado).toBe('LISTO');
    expect(mockPrisma.pedidos_online.update).not.toHaveBeenCalled();
    expect(mockComandaGateway.notificarCambio).not.toHaveBeenCalled();
    expect(mockComandaQueue.enqueuePedidoListo).not.toHaveBeenCalled();
  });

  it('rechaza un estado no válido', async () => {
    await expect(useCase.execute(1n, 'CANCELADO' as never)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('lanza NotFoundException si el pedido no existe', async () => {
    mockPrisma.pedidos_online.findUnique.mockResolvedValueOnce(null);

    await expect(useCase.execute(999n, 'LISTO')).rejects.toThrow(
      NotFoundException,
    );
  });
});

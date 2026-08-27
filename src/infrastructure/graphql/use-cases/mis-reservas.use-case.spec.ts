import { MisReservasUseCase } from './mis-reservas.use-case';

const mockPrisma = {
  reservas_hotel: {
    findMany: jest.fn().mockResolvedValue([
      {
        id: 1n,
        fecha_entrada: new Date('2026-10-01'),
        fecha_salida: new Date('2026-10-03'),
        total: 64260,
        estado: 'CONFIRMADA',
        habitaciones: { numero: '201' },
      },
    ]),
  },
  reservas_evento: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  reservas_restaurante: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  pedidos_online: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  facturas: {
    findMany: jest.fn().mockResolvedValue([
      {
        id: 16n,
        estado: 'PAGADA',
        tipo_reserva: 'HOTEL',
        reserva_id: 1n,
      },
    ]),
  },
};

describe('MisReservasUseCase', () => {
  let useCase: MisReservasUseCase;

  beforeEach(() => {
    useCase = new MisReservasUseCase(mockPrisma as never);
    jest.clearAllMocks();
  });

  it('combina reservas de hotel con su estado de pago por factura', async () => {
    const result = await useCase.execute(10n);

    expect(mockPrisma.reservas_hotel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { usuario_id: 10n } }),
    );
    expect(result.hoteles).toEqual([
      {
        reserva_id: '1',
        habitacion: '201',
        fecha_entrada: '2026-10-01',
        fecha_salida: '2026-10-03',
        total: 64260,
        estado: 'CONFIRMADA',
        pago_estado: 'PAGADA',
        factura_id: '16',
      },
    ]);
  });

  it('deja pago_estado null cuando no existe factura para la reserva', async () => {
    mockPrisma.facturas.findMany.mockResolvedValueOnce([]);

    const result = await useCase.execute(10n);

    expect(result.hoteles[0].pago_estado).toBeUndefined();
    expect(result.hoteles[0].factura_id).toBeUndefined();
  });

  it('no consulta facturas cuando no hay reservas', async () => {
    mockPrisma.reservas_hotel.findMany.mockResolvedValueOnce([]);

    await useCase.execute(10n);

    expect(mockPrisma.facturas.findMany).not.toHaveBeenCalled();
  });
});

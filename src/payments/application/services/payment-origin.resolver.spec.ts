import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PaymentOriginResolver } from './payment-origin.resolver';

const mockPrisma = {
  reservas_evento: { findUnique: jest.fn() },
  reservas_hotel: { findUnique: jest.fn() },
  pedidos_online: { findUnique: jest.fn() },
  saldo_recargas: { create: jest.fn() },
};

describe('PaymentOriginResolver', () => {
  let resolver: PaymentOriginResolver;

  beforeEach(() => {
    resolver = new PaymentOriginResolver(mockPrisma as never);
    jest.clearAllMocks();
  });

  it('EVENTO: usa el anticipo guardado de la reserva propia', async () => {
    mockPrisma.reservas_evento.findUnique.mockResolvedValueOnce({
      usuario_id: 10n,
      anticipo: new Decimal(500000),
      estado: 'PENDIENTE',
      salones: { nombre: 'Salón Esmeralda' },
    });

    const origen = await resolver.resolve(10n, {
      tipo_reserva: 'EVENTO',
      reserva_id: 1n,
    });

    expect(origen.monto).toBe(500000);
    expect(origen.resumen).toEqual(
      expect.objectContaining({ salon: 'Salón Esmeralda' }),
    );
  });

  it('HOTEL: calcula el 15% del total y las noches', async () => {
    mockPrisma.reservas_hotel.findUnique.mockResolvedValueOnce({
      usuario_id: 10n,
      fecha_entrada: new Date('2026-09-10'),
      fecha_salida: new Date('2026-09-13'),
      total: new Decimal(1000000),
      estado: 'PENDIENTE',
      cantidad_huespedes: 2,
      habitaciones: {
        numero: '101',
        tipos_habitacion: { nombre: 'Suite' },
      },
    });

    const origen = await resolver.resolve(10n, {
      tipo_reserva: 'HOTEL',
      reserva_id: 5n,
    });

    expect(origen.monto).toBe(150000);
    expect(origen.resumen).toEqual(
      expect.objectContaining({ noches: 3, porcentaje_inicial: 15 }),
    );
  });

  it('RESTAURANTE: usa el total del pedido', async () => {
    mockPrisma.pedidos_online.findUnique.mockResolvedValueOnce({
      usuario_id: 10n,
      total: new Decimal(60000),
      estado: 'PENDIENTE',
      tipo: 'PARA_LLEVAR',
      incluye_mesa: false,
      detalle_pedido_online: [{}, {}],
    });

    const origen = await resolver.resolve(10n, {
      tipo_reserva: 'RESTAURANTE',
      reserva_id: 7n,
    });

    expect(origen.monto).toBe(60000);
    expect(origen.resumen.items).toBe(2);
  });

  it('RECARGA: crea el registro y valida el rango', async () => {
    mockPrisma.saldo_recargas.create.mockResolvedValueOnce({ id: 300n });

    const origen = await resolver.resolve(10n, {
      tipo_reserva: 'RECARGA',
      monto: 50000,
    });

    expect(origen.monto).toBe(50000);
    expect(origen.reservaId).toBe(300n);
  });

  it('RECARGA fuera de rango: lanza BadRequestException', async () => {
    await expect(
      resolver.resolve(10n, { tipo_reserva: 'RECARGA', monto: 500 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('reserva de otro usuario: lanza NotFoundException', async () => {
    mockPrisma.reservas_evento.findUnique.mockResolvedValueOnce({
      usuario_id: 99n,
      estado: 'PENDIENTE',
      salones: { nombre: 'Salón' },
    });

    await expect(
      resolver.resolve(10n, { tipo_reserva: 'EVENTO', reserva_id: 1n }),
    ).rejects.toThrow(NotFoundException);
  });

  it('reserva ya pagada: lanza BadRequestException', async () => {
    mockPrisma.reservas_evento.findUnique.mockResolvedValueOnce({
      usuario_id: 10n,
      estado: 'CONFIRMADA',
      salones: { nombre: 'Salón' },
    });

    await expect(
      resolver.resolve(10n, { tipo_reserva: 'EVENTO', reserva_id: 1n }),
    ).rejects.toThrow(BadRequestException);
  });
});

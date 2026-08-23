import { NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { CreatePaymentUseCase } from './create-payment.use-case';

const mockReservaEvento = {
  id: 1n,
  usuario_id: 10n,
  salon_id: 1n,
  tipo_evento_id: 1n,
  fecha: new Date('2026-09-15'),
  hora_inicio: new Date(),
  hora_fin: new Date(),
  cantidad_personas: 40,
  anticipo: new Decimal(500000),
  estado: 'PENDIENTE',
  observaciones: null,
  usuarios: {
    id: 10n,
    nombre: 'Carlos',
    apellido: 'Martinez',
    correo: 'carlos@test.com',
  },
  salones: {
    id: 1n,
    nombre: 'Salon Principal',
  },
};

const mockReservaHotel = {
  id: 2n,
  usuario_id: 10n,
  habitacion_id: 1n,
  fecha_entrada: new Date('2026-10-01'),
  fecha_salida: new Date('2026-10-05'),
  cantidad_huespedes: 2,
  total: new Decimal(400000),
  estado: 'PENDIENTE',
  usuarios: {
    id: 10n,
    nombre: 'Carlos',
    apellido: 'Martinez',
    correo: 'carlos@test.com',
  },
  habitaciones: {
    numero: '101',
    tipos_habitacion: { nombre: 'Standard' },
  },
};

const mockPrisma = {
  reservas_evento: {
    findUnique: jest.fn().mockResolvedValue(mockReservaEvento),
  },
  reservas_hotel: {
    findUnique: jest.fn().mockResolvedValue(mockReservaHotel),
  },
  reservas_restaurante: {
    findUnique: jest.fn(),
  },
};

const mockPaymentGateway = {
  createCheckoutSession: jest.fn().mockResolvedValue({
    checkout_url: 'https://checkout.wompi.co/l/abc123',
    reference: '100',
    payment_link_id: 'abc123',
  }),
  getTransactionStatus: jest.fn(),
  verifyWebhookSignature: jest.fn(),
};

const mockPaymentRepo = {
  createFactura: jest.fn().mockResolvedValue({ id: 100n }),
  createPago: jest.fn().mockResolvedValue({ id: 200n }),
  updatePagoEstado: jest.fn().mockResolvedValue(undefined),
  updatePagoPaymentLinkId: jest.fn().mockResolvedValue(undefined),
  updateFacturaEstado: jest.fn().mockResolvedValue(undefined),
  findFacturaById: jest.fn(),
  findPagoByReferencia: jest.fn(),
};

describe('CreatePaymentUseCase', () => {
  let useCase: CreatePaymentUseCase;

  beforeEach(() => {
    useCase = new CreatePaymentUseCase(
      mockPrisma as never,
      mockPaymentGateway,
      mockPaymentRepo,
    );
    jest.clearAllMocks();
  });

  it('evento: crea factura, pago y llama a Wompi', async () => {
    mockPrisma.reservas_evento.findUnique.mockResolvedValue(mockReservaEvento);

    const result = await useCase.execute(10n, {
      reserva_id: 1n,
      monto: 500000,
      metodo_pago: 'CARD',
      tipo_reserva: 'EVENTO',
    });

    expect(result).toHaveProperty('factura_id', 100n);
    expect(result).toHaveProperty('pago_id', 200n);
    expect(result).toHaveProperty(
      'checkout_url',
      'https://checkout.wompi.co/l/abc123',
    );
    expect(result.total).toBe(595000);
    expect(mockPaymentRepo.createFactura).toHaveBeenCalledWith(
      expect.objectContaining({
        reserva_id: 1n,
        tipo_reserva: 'EVENTO',
      }),
    );
    expect(mockPaymentGateway.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        amount_in_cents: 59500000,
        currency: 'COP',
        reference: '100',
      }),
    );
  });

  it('hotel: crea factura con reserva de hotel', async () => {
    mockPrisma.reservas_hotel.findUnique.mockResolvedValue(mockReservaHotel);

    const result = await useCase.execute(10n, {
      reserva_id: 2n,
      monto: 400000,
      metodo_pago: 'WOMPI',
      tipo_reserva: 'HOTEL',
    });

    expect(result).toHaveProperty('factura_id', 100n);
    expect(result.total).toBe(476000);
    expect(mockPaymentRepo.createFactura).toHaveBeenCalledWith(
      expect.objectContaining({
        reserva_id: 2n,
        tipo_reserva: 'HOTEL',
      }),
    );
  });

  it('reserva no encontrada: lanza NotFoundException', async () => {
    mockPrisma.reservas_evento.findUnique.mockResolvedValueOnce(null);

    await expect(
      useCase.execute(10n, {
        reserva_id: 999n,
        monto: 500000,
        metodo_pago: 'CARD',
        tipo_reserva: 'EVENTO',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('restaurante: crea factura con reserva de restaurante', async () => {
    mockPrisma.reservas_restaurante.findUnique.mockResolvedValue({
      id: 3n,
      usuario_id: 10n,
      mesa_id: 1n,
      fecha: new Date('2026-10-01'),
      hora: new Date('2026-10-01T19:00:00'),
      cantidad_personas: 4,
      estado: 'PENDIENTE',
      usuarios: {
        id: 10n,
        nombre: 'Carlos',
        apellido: 'Martinez',
        correo: 'carlos@test.com',
      },
      mesas: { numero: 'Mesa 1' },
    });

    const result = await useCase.execute(10n, {
      reserva_id: 3n,
      monto: 25000,
      metodo_pago: 'WOMPI',
      tipo_reserva: 'RESTAURANTE',
    });

    expect(result).toHaveProperty('factura_id', 100n);
    expect(result.total).toBe(29750);
    expect(mockPaymentRepo.createFactura).toHaveBeenCalledWith(
      expect.objectContaining({
        reserva_id: 3n,
        tipo_reserva: 'RESTAURANTE',
      }),
    );
  });

  it('reserva no pertenece al usuario: lanza NotFoundException', async () => {
    mockPrisma.reservas_evento.findUnique.mockResolvedValueOnce({
      ...mockReservaEvento,
      usuario_id: 99n,
    });

    await expect(
      useCase.execute(10n, {
        reserva_id: 1n,
        monto: 500000,
        metodo_pago: 'CARD',
        tipo_reserva: 'EVENTO',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('reserva ya pagada: lanza NotFoundException', async () => {
    mockPrisma.reservas_evento.findUnique.mockResolvedValueOnce({
      ...mockReservaEvento,
      estado: 'CONFIRMADA',
    });

    await expect(
      useCase.execute(10n, {
        reserva_id: 1n,
        monto: 500000,
        metodo_pago: 'CARD',
        tipo_reserva: 'EVENTO',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});

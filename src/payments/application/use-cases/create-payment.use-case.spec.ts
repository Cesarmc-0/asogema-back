import { NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { CreatePaymentUseCase } from './create-payment.use-case';

const mockReserva = {
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

const mockPrisma = {
  reservas_evento: {
    findUnique: jest.fn().mockResolvedValue(mockReserva),
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

  it('pago exitoso: crea factura, pago y llama a Wompi', async () => {
    const result = await useCase.execute(10n, {
      reserva_id: 1n,
      monto: 500000,
      metodo_pago: 'CARD',
    });

    expect(result).toHaveProperty('factura_id', 100n);
    expect(result).toHaveProperty('pago_id', 200n);
    expect(result).toHaveProperty(
      'checkout_url',
      'https://checkout.wompi.co/l/abc123',
    );
    expect(result.total).toBe(595000);
    expect(mockPaymentRepo.createFactura).toHaveBeenCalledTimes(1);
    expect(mockPaymentRepo.createPago).toHaveBeenCalledTimes(1);
    expect(mockPaymentRepo.updatePagoPaymentLinkId).toHaveBeenCalledWith(
      200n,
      'abc123',
    );
    expect(mockPaymentGateway.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        amount_in_cents: 59500000,
        currency: 'COP',
        reference: '100',
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
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('reserva no pertenece al usuario: lanza NotFoundException', async () => {
    mockPrisma.reservas_evento.findUnique.mockResolvedValueOnce({
      ...mockReserva,
      usuario_id: 99n,
    });

    await expect(
      useCase.execute(10n, {
        reserva_id: 1n,
        monto: 500000,
        metodo_pago: 'CARD',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('reserva ya pagada: lanza NotFoundException', async () => {
    mockPrisma.reservas_evento.findUnique.mockResolvedValueOnce({
      ...mockReserva,
      estado: 'CONFIRMADA',
    });

    await expect(
      useCase.execute(10n, {
        reserva_id: 1n,
        monto: 500000,
        metodo_pago: 'CARD',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});

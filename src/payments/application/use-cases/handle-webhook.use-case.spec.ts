import {
  HandleWebhookUseCase,
  WebhookPayload,
} from './handle-webhook.use-case';

const mockPaymentGateway = {
  createCheckoutSession: jest.fn(),
  getTransactionStatus: jest.fn(),
  verifyWebhookSignature: jest.fn(),
};

const mockPaymentRepo = {
  createFactura: jest.fn(),
  createPago: jest.fn(),
  updatePagoEstado: jest.fn().mockResolvedValue(undefined),
  updatePagoPaymentLinkId: jest.fn().mockResolvedValue(undefined),
  updateFacturaEstado: jest.fn().mockResolvedValue(undefined),
  findFacturaById: jest.fn(),
  findPagoByReferencia: jest.fn(),
  findPagoByPaymentLinkId: jest.fn(),
};

const mockPrisma = {
  usuarios: {
    findUnique: jest.fn().mockResolvedValue({
      id: 10n,
      nombre: 'Carlos',
      apellido: 'Martinez',
      correo: 'carlos@test.com',
    }),
  },
  $executeRawUnsafe: jest.fn().mockResolvedValue(undefined),
};

const mockEmailSender = {
  sendPurchaseReceipt: jest.fn().mockResolvedValue(undefined),
  sendWelcomeVerification: jest.fn(),
  sendBookingConfirmation: jest.fn(),
};

function buildPayload(
  overrides: Partial<WebhookPayload['data']['transaction']> = {},
) {
  const payload: WebhookPayload = {
    event: 'transaction.updated',
    data: {
      transaction: {
        id: 'tx-001',
        status: 'APPROVED',
        amount_in_cents: 50000000,
        reference: '100',
        ...overrides,
      },
    },
  };
  return JSON.stringify(payload);
}

describe('HandleWebhookUseCase', () => {
  let useCase: HandleWebhookUseCase;

  beforeEach(() => {
    useCase = new HandleWebhookUseCase(
      mockPaymentGateway,
      mockPaymentRepo,
      mockPrisma as never,
      mockEmailSender,
    );
    jest.clearAllMocks();
  });

  it('firma invalida: lanza error', async () => {
    mockPaymentGateway.verifyWebhookSignature.mockReturnValue(false);

    await expect(useCase.execute('{}', 'bad-signature')).rejects.toThrow(
      'Firma invalida',
    );
  });

  it('pago aprobado: marca factura como PAGADA, confirma reserva y envia recibo', async () => {
    mockPaymentGateway.verifyWebhookSignature.mockReturnValue(true);
    mockPaymentRepo.findPagoByReferencia.mockResolvedValue({
      id: 200n,
      factura_id: 100n,
      estado: 'EN_PROCESO',
    });
    mockPaymentRepo.findFacturaById.mockResolvedValue({
      id: 100n,
      usuario_id: 10n,
      estado: 'PENDIENTE',
      reserva_id: 1n,
      tipo_reserva: 'HOTEL',
      total: { toString: () => '595000' },
    });

    const result = await useCase.execute(buildPayload(), 'sig');

    expect(result.processed).toBe(true);
    expect(mockPaymentRepo.updatePagoEstado).toHaveBeenCalledWith(
      200n,
      'CONFIRMADO',
    );
    expect(mockPaymentRepo.updateFacturaEstado).toHaveBeenCalledWith(
      100n,
      'PAGADA',
    );
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE reservas_hotel'),
      1n,
    );
    expect(mockEmailSender.sendPurchaseReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: 'Carlos Martinez',
        correo: 'carlos@test.com',
        factura_id: 100n,
      }),
    );
  });

  it('pago rechazado: marca pago como RECHAZADO y no envia recibo', async () => {
    mockPaymentGateway.verifyWebhookSignature.mockReturnValue(true);
    mockPaymentRepo.findPagoByReferencia.mockResolvedValue({
      id: 200n,
      factura_id: 100n,
      estado: 'EN_PROCESO',
    });
    mockPaymentRepo.findFacturaById.mockResolvedValue({
      id: 100n,
      usuario_id: 10n,
      estado: 'PENDIENTE',
    });

    const result = await useCase.execute(
      buildPayload({ status: 'DECLINED' }),
      'sig',
    );

    expect(result.processed).toBe(true);
    expect(mockPaymentRepo.updatePagoEstado).toHaveBeenCalledWith(
      200n,
      'RECHAZADO',
    );
    expect(mockPaymentRepo.updateFacturaEstado).not.toHaveBeenCalled();
    expect(mockEmailSender.sendPurchaseReceipt).not.toHaveBeenCalled();
  });

  it('idempotencia: factura ya PAGADA no se reprocesa', async () => {
    mockPaymentGateway.verifyWebhookSignature.mockReturnValue(true);
    mockPaymentRepo.findPagoByReferencia.mockResolvedValue({
      id: 200n,
      factura_id: 100n,
      estado: 'CONFIRMADO',
    });
    mockPaymentRepo.findFacturaById.mockResolvedValue({
      id: 100n,
      estado: 'PAGADA',
    });

    const result = await useCase.execute(buildPayload(), 'sig');

    expect(result.processed).toBe(false);
    expect(mockPaymentRepo.updatePagoEstado).not.toHaveBeenCalled();
  });

  it('referencia no encontrada: no procesa', async () => {
    mockPaymentGateway.verifyWebhookSignature.mockReturnValue(true);
    mockPaymentRepo.findPagoByReferencia.mockResolvedValue(null);
    mockPaymentRepo.findPagoByPaymentLinkId.mockResolvedValue(null);

    const result = await useCase.execute(buildPayload(), 'sig');

    expect(result.processed).toBe(false);
  });

  it('matching por payment_link_id cuando reference no coincide', async () => {
    mockPaymentGateway.verifyWebhookSignature.mockReturnValue(true);
    mockPaymentRepo.findPagoByReferencia.mockResolvedValue(null);
    mockPaymentRepo.findPagoByPaymentLinkId.mockResolvedValue({
      id: 200n,
      factura_id: 100n,
      estado: 'PENDIENTE',
    });
    mockPaymentRepo.findFacturaById.mockResolvedValue({
      id: 100n,
      usuario_id: 10n,
      estado: 'PENDIENTE',
      total: { toString: () => '595000' },
    });

    const payload = JSON.stringify({
      event: 'transaction.updated',
      data: {
        transaction: {
          id: 'tx-002',
          status: 'APPROVED',
          amount_in_cents: 59500000,
          reference: 'auto-ref-wompi',
          payment_link_id: 'abc123',
        },
      },
    });

    const result = await useCase.execute(payload, 'sig');

    expect(result.processed).toBe(true);
    expect(mockPaymentRepo.findPagoByPaymentLinkId).toHaveBeenCalledWith(
      'abc123',
    );
    expect(mockPaymentRepo.updatePagoEstado).toHaveBeenCalledWith(
      200n,
      'CONFIRMADO',
    );
  });
});

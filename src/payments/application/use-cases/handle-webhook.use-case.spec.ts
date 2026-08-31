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
  confirmarPagoCompleto: jest.fn().mockResolvedValue(undefined),
  cancelarPagoCompleto: jest.fn().mockResolvedValue(undefined),
  findFacturaById: jest.fn(),
  findPagoByReferencia: jest.fn(),
  findPagoByPaymentLinkId: jest.fn(),
  findPagoByTransaction: jest.fn(async (referencia, paymentLinkId) => {
    const porRef = await mockPaymentRepo.findPagoByReferencia(referencia);
    if (porRef) return porRef;
    if (paymentLinkId) {
      return mockPaymentRepo.findPagoByPaymentLinkId(paymentLinkId);
    }
    return null;
  }),
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
};

const mockEmailSender = {
  sendPurchaseReceipt: jest.fn().mockResolvedValue(undefined),
  sendWelcomeVerification: jest.fn(),
  sendBookingConfirmation: jest.fn(),
};

const mockFacturaQueue = {
  enqueueGenerarFactura: jest.fn().mockResolvedValue(undefined),
};

const mockQrQueue = {
  enqueueGenerarQr: jest.fn().mockResolvedValue(undefined),
};

const mockConfirmacionPagoService = {
  finalizar: jest.fn().mockResolvedValue(undefined),
};

const facturaEvento = {
  id: 100n,
  usuario_id: 10n,
  estado: 'PENDIENTE',
  total: 595000,
  reserva_id: 1n,
  tipo_reserva: 'EVENTO',
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
        amount_in_cents: 59500000,
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
      mockConfirmacionPagoService as never,
    );
    jest.clearAllMocks();
  });

  it('firma invalida: lanza UnauthorizedException', async () => {
    mockPaymentGateway.verifyWebhookSignature.mockReturnValue(false);

    await expect(useCase.execute('{}', 'bad-signature')).rejects.toThrow(
      'Firma de webhook inválida',
    );
  });

  it('pago aprobado: confirma pago, factura y reserva, envia recibo', async () => {
    mockPaymentGateway.verifyWebhookSignature.mockReturnValue(true);
    mockPaymentRepo.findPagoByReferencia.mockResolvedValue({
      id: 200n,
      factura_id: 100n,
      estado: 'EN_PROCESO',
    });
    mockPaymentRepo.findFacturaById.mockResolvedValue(facturaEvento);

    const result = await useCase.execute(buildPayload(), 'sig');

    expect(result.processed).toBe(true);
    expect(mockPaymentRepo.confirmarPagoCompleto).toHaveBeenCalledWith(
      200n,
      100n,
      'EVENTO',
      1n,
    );
    expect(mockPaymentRepo.updateFacturaEstado).not.toHaveBeenCalled();
    expect(mockConfirmacionPagoService.finalizar).toHaveBeenCalledWith(
      100n,
      'EVENTO',
      1n,
    );
  });

  it('monto NO coincide con Wompi: rechaza sin confirmar nada', async () => {
    mockPaymentGateway.verifyWebhookSignature.mockReturnValue(true);
    mockPaymentRepo.findPagoByReferencia.mockResolvedValue({
      id: 200n,
      factura_id: 100n,
      estado: 'EN_PROCESO',
    });
    mockPaymentRepo.findFacturaById.mockResolvedValue(facturaEvento);

    const result = await useCase.execute(
      buildPayload({ amount_in_cents: 59500001 }),
      'sig',
    );

    expect(result.processed).toBe(false);
    expect(mockPaymentRepo.confirmarPagoCompleto).not.toHaveBeenCalled();
    expect(mockPaymentRepo.updatePagoEstado).toHaveBeenCalledWith(
      200n,
      'RECHAZADO',
    );
    expect(mockConfirmacionPagoService.finalizar).not.toHaveBeenCalled();
  });

  it('moneda distinta a COP: rechaza sin confirmar nada', async () => {
    mockPaymentGateway.verifyWebhookSignature.mockReturnValue(true);
    mockPaymentRepo.findPagoByReferencia.mockResolvedValue({
      id: 200n,
      factura_id: 100n,
      estado: 'EN_PROCESO',
    });
    mockPaymentRepo.findFacturaById.mockResolvedValue(facturaEvento);

    const result = await useCase.execute(
      buildPayload({ amount_in_cents: 59500000, currency: 'USD' }),
      'sig',
    );

    expect(result.processed).toBe(false);
    expect(mockPaymentRepo.confirmarPagoCompleto).not.toHaveBeenCalled();
    expect(mockPaymentRepo.updatePagoEstado).toHaveBeenCalledWith(
      200n,
      'RECHAZADO',
    );
    expect(mockConfirmacionPagoService.finalizar).not.toHaveBeenCalled();
  });

  it('pedido restaurante aprobado: confirma y encola el QR', async () => {
    mockPaymentGateway.verifyWebhookSignature.mockReturnValue(true);
    mockPaymentRepo.findPagoByReferencia.mockResolvedValue({
      id: 200n,
      factura_id: 100n,
      estado: 'EN_PROCESO',
    });
    mockPaymentRepo.findFacturaById.mockResolvedValue({
      ...facturaEvento,
      reserva_id: 7n,
      tipo_reserva: 'RESTAURANTE',
    });

    const result = await useCase.execute(buildPayload(), 'sig');

    expect(result.processed).toBe(true);
    expect(mockPaymentRepo.confirmarPagoCompleto).toHaveBeenCalledWith(
      200n,
      100n,
      'RESTAURANTE',
      7n,
    );
    expect(mockConfirmacionPagoService.finalizar).toHaveBeenCalledWith(
      100n,
      'RESTAURANTE',
      7n,
    );
  });

  it('recarga aprobada: confirma sin encolar factura DIAN', async () => {
    mockPaymentGateway.verifyWebhookSignature.mockReturnValue(true);
    mockPaymentRepo.findPagoByReferencia.mockResolvedValue({
      id: 200n,
      factura_id: 100n,
      estado: 'EN_PROCESO',
    });
    mockPaymentRepo.findFacturaById.mockResolvedValue({
      ...facturaEvento,
      reserva_id: 9n,
      tipo_reserva: 'RECARGA',
    });

    const result = await useCase.execute(buildPayload(), 'sig');

    expect(result.processed).toBe(true);
    expect(mockPaymentRepo.confirmarPagoCompleto).toHaveBeenCalledWith(
      200n,
      100n,
      'RECARGA',
      9n,
    );
    expect(mockConfirmacionPagoService.finalizar).toHaveBeenCalledWith(
      100n,
      'RECARGA',
      9n,
    );
  });

  it('pago rechazado: marca pago como RECHAZADO, cancela factura y no envia recibo', async () => {
    mockPaymentGateway.verifyWebhookSignature.mockReturnValue(true);
    mockPaymentRepo.findPagoByReferencia.mockResolvedValue({
      id: 200n,
      factura_id: 100n,
      estado: 'PENDIENTE',
      referencia: null,
    });
    mockPaymentRepo.findFacturaById.mockResolvedValue(facturaEvento);

    const result = await useCase.execute(
      buildPayload({ status: 'DECLINED' }),
      'sig',
    );

    expect(result.processed).toBe(true);
    expect(mockPaymentRepo.cancelarPagoCompleto).toHaveBeenCalledWith(
      200n,
      100n,
      facturaEvento.tipo_reserva,
      'RECHAZADO',
    );
    expect(mockPaymentRepo.confirmarPagoCompleto).not.toHaveBeenCalled();
    expect(mockConfirmacionPagoService.finalizar).not.toHaveBeenCalled();
  });

  it('idempotencia: factura ya PAGADA no se reprocesa', async () => {
    mockPaymentGateway.verifyWebhookSignature.mockReturnValue(true);
    mockPaymentRepo.findPagoByReferencia.mockResolvedValue({
      id: 200n,
      factura_id: 100n,
      estado: 'CONFIRMADO',
    });
    mockPaymentRepo.findFacturaById.mockResolvedValue({
      ...facturaEvento,
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
    mockPaymentRepo.findFacturaById.mockResolvedValue(facturaEvento);

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
    expect(mockPaymentRepo.confirmarPagoCompleto).toHaveBeenCalledWith(
      200n,
      100n,
      'EVENTO',
      1n,
    );
  });
});

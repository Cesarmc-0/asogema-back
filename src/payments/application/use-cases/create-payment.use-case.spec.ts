import { BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { CreatePaymentUseCase } from './create-payment.use-case';

const mockCuponService = {
  obtenerPorcentaje: jest.fn().mockResolvedValue(0),
};

const mockConfirmacionPagoService = {
  finalizar: jest.fn().mockResolvedValue(undefined),
};

const mockPrisma = {
  usuarios: {
    findUnique: jest.fn().mockResolvedValue({
      nombre: 'Carlos',
      apellido: 'Martinez',
      correo: 'carlos@test.com',
      telefono: '3000000000',
      fecha_nacimiento: new Date('1990-01-01'),
    }),
  },
};

const mockOriginResolver = {
  resolve: jest.fn(),
};

const mockPaymentGateway = {
  createCheckoutSession: jest.fn().mockResolvedValue({
    checkout_url: 'https://checkout.wompi.co/l/abc123',
    reference: '100',
    payment_link_id: 'abc123',
  }),
  createTransaction: jest.fn().mockResolvedValue({
    transaction_id: 'tx-direct-001',
    status: 'PENDING',
  }),
  getFinancialInstitutions: jest.fn().mockResolvedValue([]),
  getTransactionStatus: jest.fn(),
  verifyWebhookSignature: jest.fn(),
};

const mockPaymentRepo = {
  createFactura: jest.fn().mockResolvedValue({ id: 100n }),
  createPago: jest.fn().mockResolvedValue({ id: 200n }),
  updatePagoEstado: jest.fn().mockResolvedValue(undefined),
  updatePagoReferencia: jest.fn().mockResolvedValue(undefined),
  updatePagoPaymentLinkId: jest.fn().mockResolvedValue(undefined),
  updateFacturaEstado: jest.fn().mockResolvedValue(undefined),
  confirmarPagoCompleto: jest.fn().mockResolvedValue({}),
  findFacturaById: jest.fn(),
  findPagoByReferencia: jest.fn(),
};

describe('CreatePaymentUseCase', () => {
  let useCase: CreatePaymentUseCase;

  beforeEach(() => {
    mockOriginResolver.resolve.mockReset();
    mockOriginResolver.resolve.mockResolvedValue({
      monto: 500000,
      descripcion: 'Anticipo evento - Salon Principal',
      resumen: { salon: 'Salon Principal' },
      reservaId: 1n,
    });

    useCase = new CreatePaymentUseCase(
      mockPrisma as never,
      mockPaymentGateway,
      mockPaymentRepo,
      mockCuponService as never,
      mockConfirmacionPagoService as never,
      mockOriginResolver as never,
    );
    jest.clearAllMocks();
  });

  it('EVENTO: cobra el anticipo guardado, sin monto del cliente', async () => {
    const result = await useCase.execute(10n, {
      reserva_id: 1n,
      tipo_reserva: 'EVENTO',
      metodo_pago: 'TARJETA',
      tipo_tarjeta: 'CREDITO',
    });

    expect(result.factura_id).toBe(100n);
    expect(result.total).toBe(595000);
    expect(mockPaymentRepo.createFactura).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo_reserva: 'EVENTO',
        reserva_id: 1n,
        subtotal: new Decimal(500000),
        impuestos: new Decimal(95000),
        descuentos: new Decimal(0),
        total: new Decimal(595000),
      }),
    );
    expect(mockPaymentRepo.createPago).toHaveBeenCalledWith(
      expect.objectContaining({
        valor: new Decimal(595000),
        tipo_tarjeta: 'CREDITO',
      }),
    );
    expect(mockPaymentGateway.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ amount_in_cents: 59500000 }),
    );
  });

  it('HOTEL: cobra el 15% del total de la reserva', async () => {
    mockOriginResolver.resolve.mockResolvedValueOnce({
      monto: 150000,
      descripcion: 'Pago inicial 15% hotel - Habitación 101',
      resumen: { habitacion: '101', noches: 3 },
      reservaId: null,
    });

    const result = await useCase.execute(10n, {
      reserva_id: 5n,
      tipo_reserva: 'HOTEL',
      metodo_pago: 'TARJETA',
      tipo_tarjeta: 'DEBITO',
    });

    expect(result.total).toBe(178500);
    expect(result.descuento).toBe(0);
    expect(mockPaymentRepo.createFactura).toHaveBeenCalledWith(
      expect.objectContaining({ subtotal: new Decimal(150000) }),
    );
  });

  it('cupón válido: descuenta sobre el subtotal antes del IVA', async () => {
    mockCuponService.obtenerPorcentaje.mockResolvedValueOnce(10);

    const result = await useCase.execute(10n, {
      reserva_id: 1n,
      tipo_reserva: 'EVENTO',
      metodo_pago: 'TARJETA',
      tipo_tarjeta: 'CREDITO',
      codigo_descuento: 'ASOGEMA10',
    });

    expect(result.total).toBe(535500);
    expect(mockPaymentRepo.createFactura).toHaveBeenCalledWith(
      expect.objectContaining({
        subtotal: new Decimal(500000),
        descuentos: new Decimal(50000),
        impuestos: new Decimal(85500),
        total: new Decimal(535500),
        codigo_descuento: 'ASOGEMA10',
      }),
    );
  });

  it('cupón vencido: lanza BadRequestException', async () => {
    mockCuponService.obtenerPorcentaje.mockRejectedValueOnce(
      new BadRequestException('El código de descuento está vencido'),
    );

    await expect(
      useCase.execute(10n, {
        reserva_id: 1n,
        tipo_reserva: 'EVENTO',
        metodo_pago: 'TARJETA',
        tipo_tarjeta: 'CREDITO',
        codigo_descuento: 'VENCIDO',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('RECARGA: valida el rango del monto y no aplica IVA', async () => {
    mockOriginResolver.resolve.mockResolvedValueOnce({
      monto: 50000,
      descripcion: 'Recarga de saldo',
      resumen: { monto: 50000 },
      reservaId: 300n,
    });

    const result = await useCase.execute(10n, {
      tipo_reserva: 'RECARGA',
      metodo_pago: 'TARJETA',
      tipo_tarjeta: 'DEBITO',
      monto: 50000,
    });

    expect(result.total).toBe(50000);
    expect(mockPaymentRepo.createFactura).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo_reserva: 'RECARGA',
        reserva_id: 300n,
        impuestos: new Decimal(0),
        total: new Decimal(50000),
      }),
    );
  });

  it('RECARGA con monto fuera de rango: lanza BadRequestException', async () => {
    mockOriginResolver.resolve.mockRejectedValueOnce(
      new BadRequestException(
        'El monto de recarga debe estar entre $10000 y $2000000',
      ),
    );

    await expect(
      useCase.execute(10n, {
        tipo_reserva: 'RECARGA',
        metodo_pago: 'TARJETA',
        tipo_tarjeta: 'DEBITO',
        monto: 5000,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('TARJETA sin tipo_tarjeta: lanza BadRequestException', async () => {
    await expect(
      useCase.execute(10n, {
        reserva_id: 1n,
        tipo_reserva: 'EVENTO',
        metodo_pago: 'TARJETA',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('SALDO: cobra con saldo, confirma al instante y devuelve saldo restante', async () => {
    mockPaymentRepo.confirmarPagoCompleto.mockResolvedValueOnce({
      saldo_restante: 50000,
    });

    const result = await useCase.execute(10n, {
      reserva_id: 1n,
      tipo_reserva: 'EVENTO',
      metodo_pago: 'SALDO',
    });

    expect(result.estado).toBe('PAGADA');
    expect(result.checkout_url).toBeNull();
    expect(result.saldo_restante).toBe(50000);
    expect(mockPaymentRepo.confirmarPagoCompleto).toHaveBeenCalledWith(
      200n,
      100n,
      'EVENTO',
      1n,
      true,
    );
    expect(mockConfirmacionPagoService.finalizar).toHaveBeenCalledWith(
      100n,
      'EVENTO',
    );
    expect(mockPaymentGateway.createCheckoutSession).not.toHaveBeenCalled();
  });

  it('SALDO en RECARGA: lanza BadRequestException', async () => {
    await expect(
      useCase.execute(10n, {
        tipo_reserva: 'RECARGA',
        metodo_pago: 'SALDO',
        monto: 50000,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('SALDO insuficiente: la confirmación falla y nada queda confirmado', async () => {
    mockPaymentRepo.confirmarPagoCompleto.mockRejectedValueOnce(
      new BadRequestException('Saldo insuficiente'),
    );

    await expect(
      useCase.execute(10n, {
        reserva_id: 1n,
        tipo_reserva: 'EVENTO',
        metodo_pago: 'SALDO',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(mockConfirmacionPagoService.finalizar).not.toHaveBeenCalled();
  });

  it('NEQUI: crea transacción directa sin checkout_url y guarda la referencia', async () => {
    mockPaymentGateway.createTransaction.mockResolvedValueOnce({
      transaction_id: 'tx-nequi-001',
      status: 'PENDING',
    });

    const result = await useCase.execute(10n, {
      reserva_id: 1n,
      tipo_reserva: 'EVENTO',
      metodo_pago: 'NEQUI',
      payment_data: {
        phone_number: '3101234567',
        user_legal_id_type: 'CC',
        user_legal_id: '1099888777',
      },
    });

    expect(mockPaymentGateway.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: 'PAGO-200',
        payment_method: {
          type: 'NEQUI',
          phone_number: '3101234567',
          user_legal_id_type: 'CC',
          user_legal_id: '1099888777',
        },
      }),
    );
    expect(mockPaymentRepo.updatePagoReferencia).toHaveBeenCalledWith(
      200n,
      'PAGO-200',
    );
    expect(result).toEqual(
      expect.objectContaining({
        transaction_id: 'tx-nequi-001',
        estado: 'PENDIENTE',
        async_payment_url: null,
      }),
    );
  });

  it('NEQUI: lanza BadRequestException sin celular válido', async () => {
    await expect(
      useCase.execute(10n, {
        reserva_id: 1n,
        tipo_reserva: 'EVENTO',
        metodo_pago: 'NEQUI',
        payment_data: { phone_number: '123' },
      }),
    ).rejects.toThrow(BadRequestException);

    expect(mockPaymentGateway.createTransaction).not.toHaveBeenCalled();
  });

  it('menor de edad: lanza BadRequestException y no crea el pago', async () => {
    mockPrisma.usuarios.findUnique.mockResolvedValueOnce({
      nombre: 'Menor',
      apellido: 'Prueba',
      correo: 'menor@test.com',
      telefono: '3000000000',
      fecha_nacimiento: new Date('2012-01-01'),
    });

    await expect(
      useCase.execute(10n, {
        reserva_id: 1n,
        tipo_reserva: 'EVENTO',
        metodo_pago: 'TARJETA',
        tipo_tarjeta: 'DEBITO',
      }),
    ).rejects.toThrow('Solo mayores de 18 años');

    expect(mockPaymentRepo.createFactura).not.toHaveBeenCalled();
  });
});

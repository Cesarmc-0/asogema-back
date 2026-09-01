import { NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { GetPaymentStatusUseCase } from './get-payment-status.use-case';

const mockPrisma = {
  pedidos_online: { findUnique: jest.fn() },
};

const mockPaymentRepo = {
  findFacturaById: jest.fn(),
  cancelarPagoCompleto: jest.fn().mockResolvedValue(undefined),
};

function facturaBase(overrides = {}) {
  return {
    id: 100n,
    usuario_id: 10n,
    subtotal: new Decimal(10000),
    impuestos: new Decimal(0),
    descuentos: new Decimal(0),
    total: new Decimal(10000),
    estado: 'PENDIENTE',
    numero_factura: null,
    cufe: null,
    qr_url: null,
    reserva_id: null,
    tipo_reserva: 'RECARGA',
    created_at: new Date(Date.now() - 11 * 60 * 1000),
    pagos: [
      {
        id: 200n,
        metodo_pago: 'DAVIPLATA',
        valor: new Decimal(10000),
        referencia: 'PAGO-200',
        estado: 'PENDIENTE',
        fecha_pago: null,
      },
    ],
    ...overrides,
  };
}

describe('GetPaymentStatusUseCase', () => {
  let useCase: GetPaymentStatusUseCase;

  beforeEach(() => {
    useCase = new GetPaymentStatusUseCase(
      mockPaymentRepo as never,
      mockPrisma as never,
    );
    jest.clearAllMocks();
  });

  it('transaccion directa vencida (PAGO-): cancela la factura', async () => {
    mockPaymentRepo.findFacturaById.mockResolvedValueOnce(facturaBase());
    // Re-lectura tras cancelar
    mockPaymentRepo.findFacturaById.mockResolvedValue(
      facturaBase({ estado: 'ANULADA' }),
    );

    const result = await useCase.execute(100n, 10n);

    expect(mockPaymentRepo.cancelarPagoCompleto).toHaveBeenCalledWith(
      200n,
      100n,
      'RECARGA',
      'RECHAZADO',
    );
    expect(result.estado).toBe('ANULADA');
  });

  it('transaccion directa reciente: NO cancela', async () => {
    mockPaymentRepo.findFacturaById.mockResolvedValue(
      facturaBase({ created_at: new Date(Date.now() - 60 * 1000) }),
    );

    await useCase.execute(100n, 10n);

    expect(mockPaymentRepo.cancelarPagoCompleto).not.toHaveBeenCalled();
  });

  it('factura de otro usuario: lanza NotFoundException', async () => {
    mockPaymentRepo.findFacturaById.mockResolvedValue(
      facturaBase({ usuario_id: 99n }),
    );

    await expect(useCase.execute(100n, 10n)).rejects.toThrow(NotFoundException);
    expect(mockPaymentRepo.cancelarPagoCompleto).not.toHaveBeenCalled();
  });
});

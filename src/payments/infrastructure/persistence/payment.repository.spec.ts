import { PaymentRepositoryImpl } from './payment.repository';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';

const mockTransaction = (arr: unknown[]) => Promise.all(arr);

const mockPrismaService = {
  facturas: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  pagos: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  saldo_recargas: {
    updateMany: jest.fn(),
    findFirst: jest.fn(),
  },
  saldos_usuario: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(mockTransaction),
} as unknown as PrismaService;

describe('PaymentRepositoryImpl', () => {
  let repo: PaymentRepositoryImpl;

  beforeEach(() => {
    repo = new PaymentRepositoryImpl(mockPrismaService);
    jest.clearAllMocks();
    (mockPrismaService.$transaction as jest.Mock).mockImplementation(
      mockTransaction,
    );
  });

  describe('cancelarPagoCompleto', () => {
    it('anula pago y factura sin tocar saldo cuando el pago no fue con SALDO', async () => {
      (mockPrismaService.facturas.findUnique as jest.Mock).mockResolvedValue({
        usuario_id: 1n,
        total: 100,
      });
      (mockPrismaService.pagos.findUnique as jest.Mock).mockResolvedValue({
        metodo_pago: 'TARJETA',
      });

      await repo.cancelarPagoCompleto(11n, 22n, 'HOTEL', 'ANULADO');

      expect(mockPrismaService.pagos.update).toHaveBeenCalledWith({
        where: { id: 11n },
        data: { estado: 'ANULADO' },
      });
      expect(mockPrismaService.facturas.update).toHaveBeenCalledWith({
        where: { id: 22n },
        data: { estado: 'ANULADA' },
      });
      expect(mockPrismaService.saldos_usuario.upsert).not.toHaveBeenCalled();
    });

    it('devuelve el saldo al monedero al anular un consumo pagado con SALDO', async () => {
      (mockPrismaService.facturas.findUnique as jest.Mock).mockResolvedValue({
        usuario_id: 1n,
        total: 250,
      });
      (mockPrismaService.pagos.findUnique as jest.Mock).mockResolvedValue({
        metodo_pago: 'SALDO',
      });

      await repo.cancelarPagoCompleto(11n, 22n, 'RESTAURANTE', 'ANULADO');

      expect(mockPrismaService.saldos_usuario.upsert).toHaveBeenCalledWith({
        where: { usuario_id: 1n },
        create: { usuario_id: 1n, saldo: 250 },
        update: { saldo: { increment: 250 } },
      });
    });

    it('revierte el crédito al anular una recarga y marca la recarga RECHAZADA', async () => {
      (mockPrismaService.facturas.findUnique as jest.Mock).mockResolvedValue({
        usuario_id: 1n,
        total: 50000,
      });
      (mockPrismaService.pagos.findUnique as jest.Mock).mockResolvedValue({
        metodo_pago: 'NEQUI',
      });

      await repo.cancelarPagoCompleto(11n, 22n, 'RECARGA', 'RECHAZADO');

      expect(mockPrismaService.saldo_recargas.updateMany).toHaveBeenCalledWith({
        where: { factura_id: 22n },
        data: { estado: 'RECHAZADO' },
      });
      expect(mockPrismaService.saldos_usuario.upsert).toHaveBeenCalledWith({
        where: { usuario_id: 1n },
        create: { usuario_id: 1n, saldo: 0 },
        update: { saldo: { decrement: 50000 } },
      });
    });
  });
});

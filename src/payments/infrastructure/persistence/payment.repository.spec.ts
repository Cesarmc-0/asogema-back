import { BadRequestException } from '@nestjs/common';
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
    update: jest.fn(),
  },
  saldos_usuario: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  pedidos_online: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  productos_menu: {
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  reservas_evento: {
    update: jest.fn(),
  },
  reservas_hotel: {
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

  describe('confirmarPagoCompleto', () => {
    it('lanza BadRequestException cuando el stock es insuficiente en restaurante', async () => {
      (mockPrismaService.facturas.findUnique as jest.Mock).mockResolvedValue({
        usuario_id: 1n,
        total: 100,
        pedido_online_id: 10n,
      });
      (
        mockPrismaService.pedidos_online.findUnique as jest.Mock
      ).mockResolvedValue({
        id: 10n,
        detalle_pedido_online: [{ producto_id: 5n, cantidad: 3 }],
      });

      const mockTx = {
        pagos: { update: jest.fn().mockResolvedValue({}) },
        facturas: { update: jest.fn().mockResolvedValue({}) },
        pedidos_online: { update: jest.fn().mockResolvedValue({}) },
        productos_menu: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        saldos_usuario: { findUnique: jest.fn(), update: jest.fn() },
        saldo_recargas: { upsert: jest.fn(), update: jest.fn() },
        reservas_evento: { update: jest.fn() },
        reservas_hotel: { update: jest.fn() },
      };

      (mockPrismaService.$transaction as jest.Mock).mockImplementation(
        (cb: any) => cb(mockTx),
      );

      await expect(
        repo.confirmarPagoCompleto(1n, 2n, 'RESTAURANTE', null),
      ).rejects.toThrow(BadRequestException);
      expect(mockTx.productos_menu.updateMany).toHaveBeenCalledWith({
        where: { id: 5n, stock: { gte: 3 } },
        data: { stock: { decrement: 3 } },
      });
    });
  });
});

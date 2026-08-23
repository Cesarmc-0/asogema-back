import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import {
  PaymentRepository,
  CreateFacturaInput,
  CreatePagoInput,
  FacturaWithPagos,
} from 'src/payments/domain/repositories/payment.repository.interface';

@Injectable()
export class PaymentRepositoryImpl implements PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createFactura(data: CreateFacturaInput): Promise<{ id: bigint }> {
    const factura = await this.prisma.facturas.create({
      data: {
        usuario_id: data.usuario_id,
        subtotal: data.subtotal,
        impuestos: data.impuestos,
        total: data.total,
        estado: data.estado,
        reserva_id: data.reserva_id ?? null,
        tipo_reserva: data.tipo_reserva ?? null,
      },
      select: { id: true },
    });
    return { id: factura.id };
  }

  async createPago(data: CreatePagoInput): Promise<{ id: bigint }> {
    const pago = await this.prisma.pagos.create({
      data: {
        factura_id: data.factura_id,
        metodo_pago: data.metodo_pago,
        valor: data.valor,
        referencia: data.referencia,
        estado: data.estado,
        payment_link_id: data.payment_link_id,
      },
      select: { id: true },
    });
    return { id: pago.id };
  }

  async updatePagoEstado(pagoId: bigint, estado: string): Promise<void> {
    await this.prisma.pagos.update({
      where: { id: pagoId },
      data: { estado },
    });
  }

  async updatePagoPaymentLinkId(
    pagoId: bigint,
    paymentLinkId: string,
  ): Promise<void> {
    await this.prisma.pagos.update({
      where: { id: pagoId },
      data: { payment_link_id: paymentLinkId },
    });
  }

  async updateFacturaEstado(facturaId: bigint, estado: string): Promise<void> {
    await this.prisma.facturas.update({
      where: { id: facturaId },
      data: { estado },
    });
  }

  async findFacturaById(facturaId: bigint): Promise<FacturaWithPagos | null> {
    return this.prisma.facturas.findUnique({
      where: { id: facturaId },
      include: { pagos: true },
    });
  }

  async findPagoByReferencia(
    referencia: string,
  ): Promise<{ id: bigint; factura_id: bigint; estado: string | null } | null> {
    return this.prisma.pagos.findFirst({
      where: { referencia },
      select: { id: true, factura_id: true, estado: true },
    });
  }

  async findPagoByPaymentLinkId(
    paymentLinkId: string,
  ): Promise<{ id: bigint; factura_id: bigint; estado: string | null } | null> {
    return this.prisma.pagos.findFirst({
      where: { payment_link_id: paymentLinkId },
      select: { id: true, factura_id: true, estado: true },
    });
  }
}

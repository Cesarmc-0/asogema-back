import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import { PaymentRepository } from 'src/payments/domain/repositories/payment.repository.interface';

@Injectable()
export class GetPaymentStatusUseCase {
  constructor(
    private readonly paymentRepo: PaymentRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(facturaId: bigint, usuarioId: bigint) {
    const factura = await this.paymentRepo.findFacturaById(facturaId);
    if (!factura || factura.usuario_id !== usuarioId) {
      throw new NotFoundException('Factura no encontrada');
    }

    let qr_pedido: string | null = null;
    if (factura.tipo_reserva === 'RESTAURANTE' && factura.reserva_id) {
      const pedido = await this.prisma.pedidos_online.findUnique({
        where: { id: factura.reserva_id },
        select: { qr_url: true },
      });
      qr_pedido = pedido?.qr_url ?? null;
    }

    return {
      factura_id: factura.id,
      estado: factura.estado,
      total: factura.total,
      numero_factura: factura.numero_factura,
      cufe: factura.cufe,
      qr_url: factura.qr_url,
      tipo_reserva: factura.tipo_reserva,
      reserva_id: factura.reserva_id,
      qr_pedido,
      pagos: factura.pagos.map((p) => ({
        id: p.id,
        metodo_pago: p.metodo_pago,
        valor: p.valor,
        estado: p.estado,
        fecha_pago: p.fecha_pago,
      })),
    };
  }
}

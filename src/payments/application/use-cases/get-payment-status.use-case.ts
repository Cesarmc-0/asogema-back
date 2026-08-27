import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import { PaymentRepository } from 'src/payments/domain/repositories/payment.repository.interface';
import {
  REFERENCIA_DIRECTA_PREFIX,
  TRANSACCION_DIRECTA_TIMEOUT_MS,
} from 'src/payments/domain/payment.constants';

@Injectable()
export class GetPaymentStatusUseCase {
  constructor(
    private readonly paymentRepo: PaymentRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(facturaId: bigint, usuarioId: bigint) {
    let factura = await this.paymentRepo.findFacturaById(facturaId);
    if (!factura || factura.usuario_id !== usuarioId) {
      throw new NotFoundException('Factura no encontrada');
    }

    if (await this.cancelarSiVencida(factura)) {
      factura = await this.paymentRepo.findFacturaById(facturaId);
      if (!factura) {
        throw new NotFoundException('Factura no encontrada');
      }
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

  /**
   * Cancela (ANULADA) una transacción directa (Nequi/Daviplata/PSE) que sigue
   * PENDIENTE pasados 10 minutos sin respuesta del cliente.
   * Devuelve true si la canceló.
   */
  private async cancelarSiVencida(factura: {
    id: bigint;
    estado: string | null;
    tipo_reserva: string | null;
    created_at: Date | null;
    pagos: { id: bigint; estado: string | null; referencia: string | null }[];
  }): Promise<boolean> {
    if (factura.estado !== 'PENDIENTE') return false;

    const pago = factura.pagos?.[0];
    const esDirecta = pago?.referencia?.startsWith(REFERENCIA_DIRECTA_PREFIX);
    const pagoPendiente = pago?.estado === 'PENDIENTE';
    const creada = factura.created_at;
    const vencida =
      creada && Date.now() - creada.getTime() > TRANSACCION_DIRECTA_TIMEOUT_MS;

    if (esDirecta && pagoPendiente && vencida) {
      await this.paymentRepo.cancelarPagoCompleto(
        pago.id,
        factura.id,
        factura.tipo_reserva ?? '',
        'RECHAZADO',
      );
      return true;
    }
    return false;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import { EmailSender } from 'src/infrastructure/mail/domain/email-sender.interface';
import { FacturaQueueService } from 'src/facturacion/application/factura-queue.service';
import { QrQueueService } from 'src/payments/application/qr-queue.service';

@Injectable()
export class ConfirmacionPagoService {
  private readonly logger = new Logger(ConfirmacionPagoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailSender: EmailSender,
    private readonly facturaQueue: FacturaQueueService,
    private readonly qrQueue: QrQueueService,
  ) {}

  async finalizar(
    facturaId: bigint,
    tipoReserva: string,
    reservaId: bigint | null,
  ): Promise<void> {
    await this.sendPurchaseReceipt(facturaId);

    if (tipoReserva === 'RESTAURANTE' && reservaId) {
      await this.qrQueue.enqueueGenerarQr(reservaId);
    }

    await this.facturaQueue.enqueueGenerarFactura(facturaId);
  }

  private async sendPurchaseReceipt(facturaId: bigint): Promise<void> {
    try {
      const factura = await this.prisma.facturas.findUnique({
        where: { id: facturaId },
        include: {
          usuarios: true,
          detalle_factura: true,
        },
      });
      if (!factura) return;

      const detalle = factura.detalle_factura[0];
      const descripcion =
        detalle?.descripcion ?? `Compra Asogema - ref ${factura.id}`;

      await this.emailSender.sendPurchaseReceipt({
        nombre:
          `${factura.usuarios.nombre} ${factura.usuarios.apellido}`.trim(),
        correo: factura.usuarios.correo,
        factura_id: facturaId,
        referencia: `FACT-${factura.id}`,
        descripcion,
        fecha: new Date().toLocaleDateString('es-CO'),
        total: this.formatCop(factura.total),
      });

      this.logger.log(`Recibo de compra enviado a ${factura.usuarios.correo}`);
    } catch (error) {
      this.logger.error(
        `No se pudo enviar recibo de compra para factura ${facturaId}: ${
          error instanceof Error ? error.message : 'error desconocido'
        }`,
      );
    }
  }

  private formatCop(value: unknown): string {
    const num = Number(value) || 0;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  }
}

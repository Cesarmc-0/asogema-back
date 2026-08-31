import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import * as qrcode from 'qrcode';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import { QR_QUEUE } from './qr-queue.service';

interface QrJobData {
  pedido_online_id: string;
}

@Processor(QR_QUEUE)
export class QrQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(QrQueueProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<QrJobData>): Promise<void> {
    const pedidoId = BigInt(job.data.pedido_online_id);
    this.logger.log(`Generando QR del pedido ${pedidoId}`);

    try {
      const pedido = await this.prisma.pedidos_online.findUnique({
        where: { id: pedidoId },
        include: { detalle_pedido_online: true },
      });

      if (!pedido) {
        this.logger.warn(`Pedido ${pedidoId} no encontrado`);
        return;
      }

      if (pedido.qr_url) {
        this.logger.log(`Pedido ${pedidoId} ya tiene QR, skip`);
        return;
      }

      const contenido = JSON.stringify({
        pedido_id: pedidoId.toString(),
        tipo: pedido.tipo,
        items: pedido.detalle_pedido_online.map((item) => ({
          producto_id: item.producto_id.toString(),
          cantidad: item.cantidad,
        })),
        total: pedido.total.toString(),
        timestamp: new Date().toISOString(),
      });

      const qrDataUrl = await qrcode.toDataURL(contenido);

      await this.prisma.pedidos_online.update({
        where: { id: pedidoId },
        data: { qr_url: qrDataUrl },
      });

      this.logger.log(`QR generado para pedido ${pedidoId}`);
    } catch (error) {
      this.logger.error(
        `Fallo al generar QR del pedido ${pedidoId}: ${
          error instanceof Error ? error.message : 'error desconocido'
        }`,
      );
      throw error;
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export const QR_QUEUE = 'qr-queue';

@Injectable()
export class QrQueueService {
  private readonly logger = new Logger(QrQueueService.name);

  constructor(@InjectQueue(QR_QUEUE) private readonly queue: Queue) {}

  async enqueueGenerarQr(pedidoOnlineId: bigint): Promise<void> {
    try {
      await this.queue.add(
        'generar-qr',
        { pedido_online_id: pedidoOnlineId.toString() },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: 100,
        },
      );
    } catch (error) {
      this.logger.error(
        `No se pudo encolar QR del pedido ${pedidoOnlineId}: ${
          error instanceof Error ? error.message : 'error desconocido'
        }`,
      );
    }
  }
}

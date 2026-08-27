import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export const FACTURA_QUEUE = 'factura-queue';

@Injectable()
export class FacturaQueueService {
  private readonly logger = new Logger(FacturaQueueService.name);

  constructor(@InjectQueue(FACTURA_QUEUE) private readonly queue: Queue) {}

  async enqueueGenerarFactura(facturaId: bigint): Promise<void> {
    try {
      await this.queue.add(
        'generar',
        { factura_id: facturaId.toString() },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: 100,
        },
      );
    } catch (error) {
      this.logger.error(
        `No se pudo encolar factura ${facturaId}: ${
          error instanceof Error ? error.message : 'error desconocido'
        }`,
      );
    }
  }
}

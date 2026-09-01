import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export const COMANDA_QUEUE = 'comanda-queue';

@Injectable()
export class ComandaQueueService {
  private readonly logger = new Logger(ComandaQueueService.name);

  constructor(@InjectQueue(COMANDA_QUEUE) private readonly queue: Queue) {}

  async enqueuePedidoListo(pedidoId: number, meseroId: number): Promise<void> {
    try {
      await this.queue.add(
        'notificar-listo',
        { pedido_id: pedidoId, mesero_id: meseroId },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: true },
      );
    } catch (error) {
      this.logger.error(`No se pudo encolar notificacion pedido ${pedidoId}: ${error instanceof Error ? error.message : 'error'}`);
    }
  }}
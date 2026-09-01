import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ComandaGateway } from 'src/restaurant/infrastructure/gateways/comanda.gateway';
import { COMANDA_QUEUE } from './comanda-queue.service';

@Processor(COMANDA_QUEUE)
export class ComandaQueueProcessor extends WorkerHost {
  constructor(private readonly comandaGateway: ComandaGateway) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === 'notificar-listo') {
      const { pedido_id, mesero_id } = job.data as { pedido_id: number; mesero_id: number };
      this.comandaGateway.notificarPedidoListo({ pedido_id, mesero_id });
    }
  }
}
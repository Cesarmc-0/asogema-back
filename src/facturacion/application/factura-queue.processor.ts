import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { GenerarFacturaUseCase } from './use-cases/generar-factura.use-case';
import { FACTURA_QUEUE } from './factura-queue.service';

interface FacturaJobData {
  factura_id: string;
}

@Processor(FACTURA_QUEUE)
export class FacturaQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(FacturaQueueProcessor.name);

  constructor(private readonly generarFacturaUseCase: GenerarFacturaUseCase) {
    super();
  }

  async process(job: Job<FacturaJobData>): Promise<void> {
    const { factura_id } = job.data;
    this.logger.log(`Procesando factura electronica ${factura_id}`);

    try {
      await this.generarFacturaUseCase.execute(BigInt(factura_id));
    } catch (error) {
      const e = error as {
        response?: { data?: unknown };
        message?: string;
      };
      this.logger.error(
        `Fallo al generar factura ${factura_id}: ${e.message}`,
        e.response?.data ? { detalle: e.response.data } : undefined,
      );
      throw error;
    }
  }
}

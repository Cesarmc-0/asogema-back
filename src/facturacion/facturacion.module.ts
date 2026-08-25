import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { FactusGateway } from './domain/gateways/factus-gateway.interface';
import { FactusGatewayImpl } from './infrastructure/gateways/factus.gateway';
import { GenerarFacturaUseCase } from './application/use-cases/generar-factura.use-case';
import {
  FacturaQueueService,
  FACTURA_QUEUE,
} from './application/factura-queue.service';
import { FacturaQueueProcessor } from './application/factura-queue.processor';

@Module({
  imports: [BullModule.registerQueue({ name: FACTURA_QUEUE })],
  providers: [
    { provide: FactusGateway, useClass: FactusGatewayImpl },
    GenerarFacturaUseCase,
    FacturaQueueService,
    FacturaQueueProcessor,
  ],
  exports: [FacturaQueueService, FactusGateway],
})
export class FacturacionModule {}

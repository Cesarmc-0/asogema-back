import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CreatePaymentUseCase } from './application/use-cases/create-payment.use-case';
import { HandleWebhookUseCase } from './application/use-cases/handle-webhook.use-case';
import { GetPaymentStatusUseCase } from './application/use-cases/get-payment-status.use-case';
import { DescargarFacturaPdfUseCase } from './application/use-cases/descargar-factura-pdf.use-case';
import { VerifyPaymentUseCase } from './application/use-cases/verify-payment.use-case';
import { QrQueueService, QR_QUEUE } from './application/qr-queue.service';
import { QrQueueProcessor } from './application/qr-queue.processor';
import { CuponService } from './application/services/cupon.service';
import { ConfirmacionPagoService } from './application/services/confirmacion-pago.service';
import { PaymentOriginResolver } from './application/services/payment-origin.resolver';
import { ValidarCuponUseCase } from './application/use-cases/validar-cupon.use-case';
import { ObtenerInstitucionesFinancierasUseCase } from './application/use-cases/obtener-instituciones-financieras.use-case';
import { ObtenerMisFacturasUseCase } from './application/use-cases/obtener-mis-facturas.use-case';
import { PaymentGateway } from './domain/gateways/payment-gateway.interface';
import { PaymentRepository } from './domain/repositories/payment.repository.interface';
import { WompiGateway } from './infrastructure/gateways/wompi.gateway';
import { PaymentRepositoryImpl } from './infrastructure/persistence/payment.repository';
import { PaymentsController } from './presentation/controllers/payments.controller';
import { WompiWebhookController } from './presentation/controllers/wompi-webhook.controller';
import { FacturacionModule } from 'src/facturacion/facturacion.module';

@Module({
  imports: [FacturacionModule, BullModule.registerQueue({ name: QR_QUEUE })],
  controllers: [PaymentsController, WompiWebhookController],
  providers: [
    CreatePaymentUseCase,
    HandleWebhookUseCase,
    GetPaymentStatusUseCase,
    DescargarFacturaPdfUseCase,
    VerifyPaymentUseCase,
    QrQueueService,
    QrQueueProcessor,
    CuponService,
    ConfirmacionPagoService,
    PaymentOriginResolver,
    ValidarCuponUseCase,
    ObtenerInstitucionesFinancierasUseCase,
    ObtenerMisFacturasUseCase,
    { provide: PaymentGateway, useClass: WompiGateway },
    { provide: PaymentRepository, useClass: PaymentRepositoryImpl },
  ],
  exports: [CreatePaymentUseCase, GetPaymentStatusUseCase, ValidarCuponUseCase],
})
export class PaymentsModule {}

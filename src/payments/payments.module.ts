import { Module } from '@nestjs/common';
import { CreatePaymentUseCase } from './application/use-cases/create-payment.use-case';
import { HandleWebhookUseCase } from './application/use-cases/handle-webhook.use-case';
import { GetPaymentStatusUseCase } from './application/use-cases/get-payment-status.use-case';
import { PaymentGateway } from './domain/gateways/payment-gateway.interface';
import { PaymentRepository } from './domain/repositories/payment.repository.interface';
import { WompiGateway } from './infrastructure/gateways/wompi.gateway';
import { PaymentRepositoryImpl } from './infrastructure/persistence/payment.repository';
import { PaymentsController } from './presentation/controllers/payments.controller';
import { WompiWebhookController } from './presentation/controllers/wompi-webhook.controller';

@Module({
  controllers: [PaymentsController, WompiWebhookController],
  providers: [
    CreatePaymentUseCase,
    HandleWebhookUseCase,
    GetPaymentStatusUseCase,
    { provide: PaymentGateway, useClass: WompiGateway },
    { provide: PaymentRepository, useClass: PaymentRepositoryImpl },
  ],
  exports: [CreatePaymentUseCase],
})
export class PaymentsModule {}

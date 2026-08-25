import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PaymentGateway } from 'src/payments/domain/gateways/payment-gateway.interface';
import { PaymentRepository } from 'src/payments/domain/repositories/payment.repository.interface';
import { HandleWebhookUseCase } from './handle-webhook.use-case';

@Injectable()
export class VerifyPaymentUseCase {
  private readonly logger = new Logger(VerifyPaymentUseCase.name);

  constructor(
    private readonly paymentGateway: PaymentGateway,
    private readonly paymentRepo: PaymentRepository,
    private readonly handleWebhook: HandleWebhookUseCase,
  ) {}

  async execute(
    transactionId: string,
    usuarioId: bigint,
  ): Promise<{ estado: string; factura_id?: bigint }> {
    const tx = await this.paymentGateway.getTransactionStatus(transactionId);

    const pago = await this.paymentRepo.findPagoByTransaction(
      tx.reference,
      tx.payment_link_id,
    );
    if (!pago) {
      throw new NotFoundException('Pago no encontrado');
    }

    const factura = await this.paymentRepo.findFacturaById(pago.factura_id);
    if (!factura || factura.usuario_id !== usuarioId) {
      throw new NotFoundException('Pago no encontrado');
    }

    if (factura.estado === 'PAGADA') {
      return { estado: 'PAGADA', factura_id: factura.id };
    }

    if (tx.status === 'PENDING') {
      return { estado: 'PENDIENTE' };
    }

    this.logger.log(
      `Verificando pago tx=${transactionId}, status=${tx.status}, ref=${tx.reference}`,
    );

    await this.handleWebhook.processTransaction(
      {
        id: transactionId,
        status: tx.status,
        amount_in_cents: tx.amount_in_cents,
        reference: tx.reference,
        payment_link_id: tx.payment_link_id,
      },
      pago,
    );

    const updated = await this.paymentRepo.findFacturaById(pago.factura_id);
    if (updated?.estado === 'PAGADA') {
      return { estado: 'PAGADA', factura_id: updated.id };
    }

    // El pago pudo quedar RECHAZADO/ANULADO/ERROR aunque la factura siga PENDIENTE.
    const pagoActualizado = await this.paymentRepo.findPagoByTransaction(
      tx.reference,
      tx.payment_link_id,
    );
    return {
      estado: pagoActualizado?.estado ?? 'PENDIENTE',
      factura_id: updated?.id,
    };
  }
}

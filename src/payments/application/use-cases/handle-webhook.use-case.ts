import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PaymentGateway } from 'src/payments/domain/gateways/payment-gateway.interface';
import { PaymentRepository } from 'src/payments/domain/repositories/payment.repository.interface';
import { ConfirmacionPagoService } from 'src/payments/application/services/confirmacion-pago.service';

export interface WebhookPayload {
  event: string;
  data: {
    transaction: Record<string, unknown>;
  };
}

export interface WebhookTransaction {
  id: string;
  status: string;
  amount_in_cents: number;
  currency?: string;
  reference: string;
  payment_link_id?: string | null;
}

@Injectable()
export class HandleWebhookUseCase {
  private readonly logger = new Logger(HandleWebhookUseCase.name);

  constructor(
    private readonly paymentGateway: PaymentGateway,
    private readonly paymentRepo: PaymentRepository,
    private readonly confirmacionPagoService: ConfirmacionPagoService,
  ) {}

  async execute(
    rawBody: string,
    signature: string,
  ): Promise<{ processed: boolean }> {
    const isValid = this.paymentGateway.verifyWebhookSignature(
      rawBody,
      signature,
    );
    if (!isValid) {
      this.logger.warn('Firma de webhook invalida');
      throw new UnauthorizedException('Firma de webhook inválida');
    }

    const payload = JSON.parse(rawBody) as WebhookPayload;
    const tx = payload.data.transaction as unknown as WebhookTransaction;

    this.logger.log(
      `Webhook recibido: event=${payload.event}, tx=${tx.id}, status=${tx.status}`,
    );

    return this.processTransaction(tx);
  }

  async processTransaction(
    tx: WebhookTransaction,
    pago?: { id: bigint; factura_id: bigint; estado: string | null } | null,
  ): Promise<{ processed: boolean }> {
    if (!pago) {
      pago = await this.paymentRepo.findPagoByTransaction(
        tx.reference,
        tx.payment_link_id,
      );
    }

    if (!pago) {
      this.logger.warn(`Pago no encontrado para reference=${tx.reference}`);
      return { processed: false };
    }

    const factura = await this.paymentRepo.findFacturaById(pago.factura_id);
    if (factura?.estado === 'PAGADA') {
      this.logger.log(
        `Factura ${pago.factura_id} ya esta PAGADA, idempotencia OK`,
      );
      return { processed: false };
    }

    if (!this.montoCoincide(tx, factura?.total)) {
      this.logger.error(
        `Monto no coincide para tx=${tx.id}: Wompi=${tx.amount_in_cents}, esperado=${Number(factura?.total ?? 0) * 100}. Pago RECHAZADO sin confirmar`,
      );
      await this.paymentRepo.updatePagoEstado(pago.id, 'RECHAZADO');
      return { processed: false };
    }

    const statusMap: Record<string, string> = {
      APPROVED: 'CONFIRMADO',
      DECLINED: 'RECHAZADO',
      VOIDED: 'ANULADO',
      ERROR: 'ERROR',
    };

    const mappedStatus = statusMap[tx.status] ?? 'PENDIENTE';

    if (tx.status === 'APPROVED') {
      await this.paymentRepo.confirmarPagoCompleto(
        pago.id,
        pago.factura_id,
        factura?.tipo_reserva ?? '',
        factura?.reserva_id ?? null,
      );
      this.logger.log(`Factura ${pago.factura_id} marcada como PAGADA`);

      await this.confirmacionPagoService.finalizar(
        pago.factura_id,
        factura?.tipo_reserva ?? '',
        factura?.reserva_id ?? null,
      );
    } else {
      await this.paymentRepo.updatePagoEstado(pago.id, mappedStatus);
    }

    return { processed: true };
  }

  private montoCoincide(
    tx: WebhookTransaction,
    totalEsperado: unknown,
  ): boolean {
    if (tx.currency && tx.currency !== 'COP') {
      this.logger.error(`Moneda no esperada para tx=${tx.id}: ${tx.currency}`);
      return false;
    }
    const total = Number(totalEsperado);
    if (!Number.isFinite(total)) {
      return false;
    }
    return tx.amount_in_cents === Math.round(total * 100);
  }
}

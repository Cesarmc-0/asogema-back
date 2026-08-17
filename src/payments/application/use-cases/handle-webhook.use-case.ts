import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import { EmailSender } from 'src/infrastructure/mail/domain/email-sender.interface';
import { PaymentGateway } from 'src/payments/domain/gateways/payment-gateway.interface';
import { PaymentRepository } from 'src/payments/domain/repositories/payment.repository.interface';

export interface WebhookPayload {
  event: string;
  data: {
    transaction: Record<string, unknown>;
  };
}

interface WebhookTransaction {
  id: string;
  status: string;
  amount_in_cents: number;
  reference: string;
}

@Injectable()
export class HandleWebhookUseCase {
  private readonly logger = new Logger(HandleWebhookUseCase.name);

  constructor(
    private readonly paymentGateway: PaymentGateway,
    private readonly paymentRepo: PaymentRepository,
    private readonly prisma: PrismaService,
    private readonly emailSender: EmailSender,
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
      throw new Error('Firma invalida');
    }

    const payload = JSON.parse(rawBody) as WebhookPayload;
    const tx = payload.data.transaction as unknown as WebhookTransaction;

    this.logger.log(
      `Webhook recibido: event=${payload.event}, tx=${tx.id}, status=${tx.status}`,
    );

    let pago = await this.paymentRepo.findPagoByReferencia(tx.reference);

    if (!pago) {
      const txData = payload.data.transaction;
      const paymentLinkId =
        txData.payment_link_id ??
        (txData.payment_method as Record<string, unknown> | undefined)
          ?.payment_link_id;

      if (typeof paymentLinkId === 'string') {
        this.logger.log(`Buscando pago por payment_link_id=${paymentLinkId}`);
        pago = await this.paymentRepo.findPagoByPaymentLinkId(paymentLinkId);
      }
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

    const statusMap: Record<string, string> = {
      APPROVED: 'CONFIRMADO',
      DECLINED: 'RECHAZADO',
      VOIDED: 'ANULADO',
      ERROR: 'ERROR',
    };

    const mappedStatus = statusMap[tx.status] ?? 'PENDIENTE';

    await this.paymentRepo.updatePagoEstado(pago.id, mappedStatus);

    if (tx.status === 'APPROVED') {
      await this.paymentRepo.updateFacturaEstado(pago.factura_id, 'PAGADA');
      this.logger.log(`Factura ${pago.factura_id} marcada como PAGADA`);

      await this.sendPurchaseReceipt(pago.factura_id);
    }

    return { processed: true };
  }

  private async sendPurchaseReceipt(facturaId: bigint): Promise<void> {
    try {
      const factura = await this.paymentRepo.findFacturaById(facturaId);
      if (!factura) return;

      const usuario = await this.prisma.usuarios.findUnique({
        where: { id: factura.usuario_id },
      });
      if (!usuario) {
        this.logger.warn(
          `Usuario ${factura.usuario_id} no encontrado para recibo de compra`,
        );
        return;
      }

      await this.emailSender.sendPurchaseReceipt({
        nombre: `${usuario.nombre} ${usuario.apellido}`.trim(),
        correo: usuario.correo,
        factura_id: facturaId,
        fecha: new Date().toLocaleDateString('es-CO'),
        total: String(factura.total),
      });

      this.logger.log(`Recibo de compra enviado a ${usuario.correo}`);
    } catch (error) {
      this.logger.error(
        `No se pudo enviar recibo de compra para factura ${facturaId}: ${
          error instanceof Error ? error.message : 'error desconocido'
        }`,
      );
    }
  }
}

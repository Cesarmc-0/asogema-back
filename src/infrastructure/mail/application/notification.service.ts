import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  EmailSender,
  BookingType,
  EmailJobData,
  WelcomeVerificationPayload,
  BookingPayload,
  PurchaseReceiptPayload,
} from '../domain/email-sender.interface';

export const EMAIL_QUEUE = 'email-queue';

@Injectable()
export class NotificationService extends EmailSender {
  private readonly logger = new Logger(NotificationService.name);

  constructor(@InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue) {
    super();
  }

  async sendWelcomeVerification(
    payload: WelcomeVerificationPayload,
  ): Promise<void> {
    await this.enqueue({ type: 'welcome-verification', ...payload });
  }

  async sendBookingConfirmation(
    tipo: BookingType,
    payload: BookingPayload,
  ): Promise<void> {
    await this.enqueue({ type: tipo, ...payload });
  }

  async sendPurchaseReceipt(payload: PurchaseReceiptPayload): Promise<void> {
    await this.enqueue({ type: 'purchase-receipt', ...payload });
  }

  private async enqueue(data: EmailJobData): Promise<void> {
    try {
      await this.emailQueue.add('send', data, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: 100,
      });
    } catch (error) {
      // El envío de correo es un efecto secundario: jamás debe romper el flujo de negocio.
      this.logger.error(
        `No se pudo encolar el correo ${data.type}: ${
          error instanceof Error ? error.message : 'error desconocido'
        }`,
      );
    }
  }
}

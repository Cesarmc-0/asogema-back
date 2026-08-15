import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { EmailJob, EmailJobData } from '../domain/email-sender.interface';
import { NodemailerMailer } from '../infrastructure/nodemailer-mailer';
import { EMAIL_QUEUE } from './notification.service';

@Processor(EMAIL_QUEUE)
export class EmailQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailQueueProcessor.name);

  constructor(private readonly mailer: NodemailerMailer) {
    super();
  }

  async process(job: EmailJob): Promise<void> {
    try {
      await this.dispatch(job.data);
      this.logger.log(`Correo enviado: ${job.data.type} -> ${job.data.correo}`);
    } catch (error) {
      this.logger.error(
        `Fallo al enviar ${job.data.type} a ${job.data.correo}: ${
          error instanceof Error ? error.message : 'error desconocido'
        }`,
      );
      throw error;
    }
  }

  private async dispatch(data: EmailJobData): Promise<void> {
    switch (data.type) {
      case 'welcome-verification':
        await this.mailer.sendWelcomeVerification(data);
        break;
      case 'hotel-booking':
      case 'event-booking':
      case 'restaurant-reservation':
        await this.mailer.sendBookingConfirmation(data.type, data);
        break;
      case 'purchase-receipt':
        await this.mailer.sendPurchaseReceipt(data);
        break;
    }
  }
}

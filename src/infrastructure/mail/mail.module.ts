import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EmailSender } from './domain/email-sender.interface';
import {
  NotificationService,
  EMAIL_QUEUE,
} from './application/notification.service';
import { EmailQueueProcessor } from './application/email-queue.processor';
import { ResendMailer } from './infrastructure/resend-mailer';

@Global()
@Module({
  imports: [BullModule.registerQueue({ name: EMAIL_QUEUE })],
  providers: [
    NotificationService,
    EmailQueueProcessor,
    ResendMailer,
    { provide: EmailSender, useExisting: NotificationService },
  ],
  exports: [EmailSender, NotificationService],
})
export class MailModule {}

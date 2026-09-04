import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as handlebars from 'handlebars';
import {
  EmailSender,
  BookingType,
  WelcomeVerificationPayload,
  BookingPayload,
  PurchaseReceiptPayload,
  PasswordRecoveryPayload,
} from '../domain/email-sender.interface';

const TEMPLATE_NAMES: Record<string, string> = {
  'welcome-verification': 'welcome-verification',
  'hotel-booking': 'hotel-booking',
  'event-booking': 'event-booking',
  'restaurant-reservation': 'restaurant-reservation',
  'purchase-receipt': 'purchase-receipt',
  'password-recovery': 'password-recovery',
};

const SUBJECTS: Record<string, string> = {
  'welcome-verification': 'Bienvenido a Asogema - Verifica tu correo',
  'hotel-booking': 'Confirmación de reserva de habitación - Asogema',
  'event-booking': 'Confirmación de reserva de salón - Asogema',
  'restaurant-reservation': 'Confirmación de reserva de mesa - Asogema',
  'purchase-receipt': 'Recibo de compra - Asogema',
  'password-recovery': 'Recuperación de contraseña - Asogema',
};

@Injectable()
export class ResendMailer extends EmailSender {
  private readonly logger = new Logger(ResendMailer.name);
  private readonly resend: Resend;
  private readonly from: string;

  constructor() {
    super();
    this.from = process.env.RESEND_FROM ?? 'Asogema <no-reply@asogema.com>';
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendWelcomeVerification(
    payload: WelcomeVerificationPayload,
  ): Promise<void> {
    await this.send('welcome-verification', payload);
  }

  async sendBookingConfirmation(
    tipo: BookingType,
    payload: BookingPayload,
  ): Promise<void> {
    await this.send(tipo, payload);
  }

  async sendPurchaseReceipt(payload: PurchaseReceiptPayload): Promise<void> {
    await this.send('purchase-receipt', payload);
  }

  async sendPasswordRecovery(payload: PasswordRecoveryPayload): Promise<void> {
    await this.send('password-recovery', payload);
  }

  private async send(type: string, payload: object): Promise<void> {
    const templateName = TEMPLATE_NAMES[type];
    const subject = SUBJECTS[type];
    const html = this.render(templateName, payload);
    const to = String((payload as { correo: string }).correo);

    const { data, error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject,
      html,
    });

    if (error) {
      throw new Error(
        `Resend falló al enviar ${type} a ${to}: ${
          error.name ?? 'error'
        } - ${error.message}`,
      );
    }

    this.logger.log(
      `Correo ${type} -> ${to} (id: ${data?.id ?? 'desconocido'})`,
    );
  }

  private render(name: string, data: object): string {
    const templatePath = this.resolveTemplate(name);
    const source = readFileSync(templatePath, 'utf-8');
    const template = handlebars.compile(source);
    return template(data);
  }

  private resolveTemplate(name: string): string {
    const candidates = [
      join(
        process.cwd(),
        'src',
        'infrastructure',
        'mail',
        'infrastructure',
        'templates',
        `${name}.hbs`,
      ),
      join(
        process.cwd(),
        'dist',
        'src',
        'infrastructure',
        'mail',
        'infrastructure',
        'templates',
        `${name}.hbs`,
      ),
    ];

    const found = candidates.find((path) => existsSync(path));
    if (!found) {
      throw new Error(`Template de correo no encontrado: ${name}`);
    }
    return found;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';
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
export class NodemailerMailer extends EmailSender {
  private readonly logger = new Logger(NodemailerMailer.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor() {
    super();
    this.from = process.env.MAIL_FROM ?? 'Asogema <no-reply@asogema.com>';
    const host = process.env.MAIL_HOST ?? 'smtp.gmail.com';
    const port = Number(process.env.MAIL_PORT ?? 587);
    const user = process.env.MAIL_USER;
    const pass = process.env.MAIL_PASS;

    this.transporter = createTransport({
      host,
      port,
      secure: false,
      auth: user && pass ? { user, pass } : undefined,
    });
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

    const info = (await this.transporter.sendMail({
      from: this.from,
      to: String((payload as { correo: string }).correo),
      subject,
      html,
    })) as { messageId?: string };

    this.logger.log(
      `Correo ${type} -> ${String((payload as { correo: string }).correo)} (id: ${info.messageId})`,
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

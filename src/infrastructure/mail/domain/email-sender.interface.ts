import type { Job } from 'bullmq';

export type BookingType =
  'hotel-booking' | 'event-booking' | 'restaurant-reservation';

export interface WelcomeVerificationPayload {
  nombre: string;
  correo: string;
  codigo: string;
}

export interface BookingPayload {
  nombre: string;
  correo: string;
  reserva_id: string | number | bigint;
  servicio: string;
  detalle: string;
  fecha: string;
  hora?: string;
  personas?: number;
  total?: string;
}

export interface PurchaseReceiptPayload {
  nombre: string;
  correo: string;
  factura_id: string | number | bigint;
  fecha: string;
  total: string;
}

export type EmailJobData =
  | ({ type: 'welcome-verification' } & WelcomeVerificationPayload)
  | ({ type: BookingType } & BookingPayload)
  | ({ type: 'purchase-receipt' } & PurchaseReceiptPayload);

export abstract class EmailSender {
  abstract sendWelcomeVerification(
    payload: WelcomeVerificationPayload,
  ): Promise<void>;
  abstract sendBookingConfirmation(
    tipo: BookingType,
    payload: BookingPayload,
  ): Promise<void>;
  abstract sendPurchaseReceipt(payload: PurchaseReceiptPayload): Promise<void>;
}

export type EmailJob = Job<EmailJobData>;

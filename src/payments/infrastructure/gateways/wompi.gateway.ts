import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { createHmac } from 'crypto';
import {
  PaymentGateway,
  CreateCheckoutInput,
  CreateCheckoutResult,
  TransactionStatusResult,
} from '../../domain/gateways/payment-gateway.interface';

interface WompiPaymentLinkResponse {
  data: {
    id: string;
    name: string;
    amount_in_cents: number | null;
    currency: string;
    active: boolean;
  };
}

interface WompiTransactionResponse {
  data: {
    id: string;
    status: string;
    amount_in_cents: number;
    reference: string;
  };
}

@Injectable()
export class WompiGateway extends PaymentGateway {
  private readonly logger = new Logger(WompiGateway.name);
  private readonly apiUrl: string;
  private readonly eventSecret: string;
  private readonly privateKey: string;

  constructor() {
    super();
    this.apiUrl = process.env.WOMPI_API_URL ?? 'https://sandbox.wompi.co/v1';
    this.eventSecret = process.env.WOMPI_EVENT_SECRET ?? '';
    this.privateKey = process.env.WOMPI_PRIVATE_KEY ?? '';
  }

  async createCheckoutSession(
    input: CreateCheckoutInput,
  ): Promise<CreateCheckoutResult> {
    const response = await axios.post<WompiPaymentLinkResponse>(
      `${this.apiUrl}/payment_links`,
      {
        name: `Reserva evento - Ref ${input.reference}`,
        description: `Pago reserva evento (ref: ${input.reference})`,
        single_use: true,
        collect_shipping: false,
        currency: input.currency,
        amount_in_cents: input.amount_in_cents,
        redirect_url: input.redirect_url ?? null,
      },
      {
        headers: {
          Authorization: `Bearer ${this.privateKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      },
    );

    const { id: paymentLinkId } = response.data.data;
    const checkoutUrl = `https://checkout.wompi.co/l/${paymentLinkId}`;

    this.logger.log(
      `Payment link creado: ref=${input.reference}, link_id=${paymentLinkId}`,
    );

    return {
      checkout_url: checkoutUrl,
      reference: input.reference,
      payment_link_id: paymentLinkId,
    };
  }

  async getTransactionStatus(
    transactionId: string,
  ): Promise<TransactionStatusResult> {
    const { data } = await axios.get<WompiTransactionResponse>(
      `${this.apiUrl}/transactions/${transactionId}`,
      {
        headers: { Authorization: `Bearer ${this.privateKey}` },
        timeout: 10000,
      },
    );

    return {
      transaction_id: transactionId,
      status:
        (data.data?.status as TransactionStatusResult['status']) ?? 'ERROR',
      amount_in_cents: data.data?.amount_in_cents ?? 0,
    };
  }

  verifyWebhookSignature(body: string, signature: string): boolean {
    if (!this.eventSecret) {
      this.logger.warn(
        'WOMPI_EVENT_SECRET no configurado, firma no verificada',
      );
      return true;
    }

    const expected = createHmac('sha256', this.eventSecret)
      .update(body)
      .digest('hex');

    return expected === signature;
  }
}

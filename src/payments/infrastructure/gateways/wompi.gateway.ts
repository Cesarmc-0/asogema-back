import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { createHmac, createHash } from 'crypto';
import {
  PaymentGateway,
  CardTokenizeInput,
  CreateCheckoutInput,
  CreateCheckoutResult,
  CreateTransactionInput,
  CreateTransactionResult,
  FinancialInstitution,
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
    payment_link_id: string | null;
    payment_method?: {
      extra?: {
        async_payment_url?: string;
      };
    };
  };
}

interface WompiMerchantResponse {
  data: {
    presigned_acceptance?: {
      acceptance_token?: string;
    };
  };
}

@Injectable()
export class WompiGateway extends PaymentGateway {
  private readonly logger = new Logger(WompiGateway.name);
  private readonly apiUrl: string;
  private readonly eventSecret: string;
  private readonly privateKey: string;
  private readonly publicKey: string;
  private readonly integritySecret: string;

  constructor() {
    super();
    this.apiUrl = process.env.WOMPI_API_URL ?? 'https://sandbox.wompi.co/v1';
    this.eventSecret = process.env.WOMPI_EVENT_SECRET ?? '';
    this.privateKey = process.env.WOMPI_PRIVATE_KEY ?? '';
    this.publicKey = process.env.WOMPI_PUBLIC_KEY ?? '';
    this.integritySecret = process.env.WOMPI_INTEGRITY_SECRET ?? '';
  }

  async createCheckoutSession(
    input: CreateCheckoutInput,
  ): Promise<CreateCheckoutResult> {
    const response = await axios.post<WompiPaymentLinkResponse>(
      `${this.apiUrl}/payment_links`,
      {
        name: `Pago Asogema - Ref ${input.reference}`,
        description: `Pago en Asogema (ref: ${input.reference})`,
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
    const esSandbox = this.apiUrl.includes('sandbox');
    const checkoutUrl = `https://checkout.${esSandbox ? 'sandbox.' : ''}wompi.co/l/${paymentLinkId}`;

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
      reference: data.data?.reference ?? '',
      payment_link_id: data.data?.payment_link_id ?? null,
    };
  }
  /**
   * Tokeniza una tarjeta con tokenización simple (llave pública).
   * Devuelve el token para usarlo en la transacción CARD.
   */
  async tokenizeCard(input: CardTokenizeInput): Promise<string> {
    try {
      const { data } = await axios.post<{ data: { id: string } }>(
        `${this.apiUrl}/tokens/cards`,
        input,
        {
          headers: {
            Authorization: `Bearer ${this.publicKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        },
      );

      const token = data.data?.id;
      if (!token) {
        this.logger.error('Wompi no devolvió token de tarjeta');
        throw new Error('No se pudo tokenizar la tarjeta');
      }

      return token;
    } catch (error) {
      const e = error as {
        response?: {
          data?: { error?: { messages?: Record<string, string[]> } };
        };
        message?: string;
      };
      const detalle = e.response?.data?.error?.messages
        ? Object.values(e.response.data.error.messages).flat().join('. ')
        : e.message;

      this.logger.error(
        `Wompi tokenizeCard falló: ${detalle ?? 'error desconocido'}`,
      );
      throw new BadRequestException(
        detalle ?? 'No se pudo validar la tarjeta. Verifica los datos.',
      );
    }
  }

  async getFinancialInstitutions(): Promise<FinancialInstitution[]> {
    const { data } = await axios.get<{
      data: {
        financial_institution_code: string;
        financial_institution_name: string;
      }[];
    }>(`${this.apiUrl}/pse/financial_institutions`, {
      headers: { Authorization: `Bearer ${this.privateKey}` },
      timeout: 10000,
    });
    return (data.data ?? []).map((f) => ({
      code: f.financial_institution_code,
      name: f.financial_institution_name,
    }));
  }

  async createTransaction(
    input: CreateTransactionInput,
  ): Promise<CreateTransactionResult> {
    const acceptanceToken = await this.getAcceptanceToken();

    const body: Record<string, unknown> = {
      amount_in_cents: input.amount_in_cents,
      currency: input.currency,
      reference: input.reference,
      customer_email: input.customer_email,
      acceptance_token: acceptanceToken,
      redirect_url: input.redirect_url ?? null,
      ...(input.ip ? { ip: input.ip } : {}),
      signature: this.buildIntegritySignature(
        input.reference,
        input.amount_in_cents,
        input.currency,
      ),
      payment_method: {
        type: input.payment_method.type,
        ...(input.payment_method.phone_number
          ? { phone_number: input.payment_method.phone_number }
          : {}),
        ...(input.payment_method.financial_institution_code
          ? {
              financial_institution_code:
                input.payment_method.financial_institution_code,
            }
          : {}),
        ...(input.payment_method.user_type !== undefined
          ? { user_type: input.payment_method.user_type }
          : {}),
        ...(input.payment_method.user_legal_id_type
          ? { user_legal_id_type: input.payment_method.user_legal_id_type }
          : {}),
        ...(input.payment_method.user_legal_id
          ? { user_legal_id: input.payment_method.user_legal_id }
          : {}),
        ...(input.payment_method.payment_description
          ? { payment_description: input.payment_method.payment_description }
          : {}),
        ...(input.payment_method.token
          ? { token: input.payment_method.token }
          : {}),
        ...(input.payment_method.installments
          ? { installments: input.payment_method.installments }
          : {}),
      },
    };

    const { data } = await axios
      .post<WompiTransactionResponse>(`${this.apiUrl}/transactions`, body, {
        headers: {
          Authorization: `Bearer ${this.privateKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      })
      .catch((err: unknown) => {
        const e = err as {
          response?: { status?: number; data?: unknown };
          message?: string;
        };
        const mensaje = this.extraerMensajeError(e.response?.data, e.message);
        this.logger.error(
          `Wompi createTransaction falló: status=${e.response?.status ?? 'n/a'}, ${mensaje}`,
        );
        throw new BadRequestException(
          `El proveedor de pagos rechazó la transacción: ${mensaje}`,
        );
      });

    const transactionId = data.data.id;

    // PSE: el async_payment_url aparece tras crear la transacción; se consulta
    // hasta que esté disponible (por lo general es inmediato).
    let asyncPaymentUrl: string | undefined;
    if (input.payment_method.type === 'PSE') {
      asyncPaymentUrl = await this.pollAsyncPaymentUrl(transactionId);
    }

    this.logger.log(
      `Transaccion directa creada: ref=${input.reference}, tx=${transactionId}, status=${data.data.status}, tipo=${input.payment_method.type}`,
    );

    return {
      transaction_id: transactionId,
      status: data.data.status,
      ...(asyncPaymentUrl ? { async_payment_url: asyncPaymentUrl } : {}),
    };
  }

  private async pollAsyncPaymentUrl(
    transactionId: string,
    attempts = 12,
  ): Promise<string | undefined> {
    for (let i = 0; i < attempts; i += 1) {
      const { data } = await axios.get<WompiTransactionResponse>(
        `${this.apiUrl}/transactions/${transactionId}`,
        {
          headers: { Authorization: `Bearer ${this.privateKey}` },
          timeout: 10000,
        },
      );
      const url = data.data?.payment_method?.extra?.async_payment_url;
      if (url) return url;
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
    return undefined;
  }

  /**
   * Firma de integridad exigida por Wompi en POST /transactions:
   * SHA256(Referencia + MontoEnCentavos + Moneda + IntegritySecret).
   */
  private buildIntegritySignature(
    reference: string,
    amountInCents: number,
    currency: string,
  ): string {
    return createHash('sha256')
      .update(`${reference}${amountInCents}${currency}${this.integritySecret}`)
      .digest('hex');
  }

  /** Extrae un mensaje legible del error de Wompi (objeto con `error.messages`). */
  private extraerMensajeError(data: unknown, fallback?: string): string {
    if (data && typeof data === 'object') {
      const error = (data as { error?: { messages?: unknown } }).error;
      if (error?.messages) {
        return JSON.stringify(error.messages);
      }
    }
    return fallback ?? 'error desconocido';
  }

  /**
   * Acceptance token obligatorio para crear transacciones. Es de un solo
   * uso: se obtiene fresco en cada llamada a createTransaction.
   */
  private async getAcceptanceToken(): Promise<string> {
    const { data } = await axios.get<WompiMerchantResponse>(
      `${this.apiUrl}/merchants/${this.publicKey}`,
      { timeout: 10000 },
    );

    const token = data.data?.presigned_acceptance?.acceptance_token;
    if (!token) {
      this.logger.warn('No se pudo obtener acceptance_token de Wompi');
      throw new Error('No se pudo obtener el acceptance token de Wompi');
    }

    return token;
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

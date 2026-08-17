export interface CreateCheckoutInput {
  amount_in_cents: number;
  currency: string;
  reference: string;
  customer_email: string;
  customer_name: string;
  redirect_url?: string;
}

export interface CreateCheckoutResult {
  checkout_url: string;
  reference: string;
  payment_link_id: string;
}

export interface TransactionStatusResult {
  transaction_id: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR';
  amount_in_cents: number;
}

export abstract class PaymentGateway {
  abstract createCheckoutSession(
    input: CreateCheckoutInput,
  ): Promise<CreateCheckoutResult>;
  abstract getTransactionStatus(
    transactionId: string,
  ): Promise<TransactionStatusResult>;
  abstract verifyWebhookSignature(body: string, signature: string): boolean;
}

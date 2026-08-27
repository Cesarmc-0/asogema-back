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

export interface PaymentMethodInput {
  /** NEQUI | DAVIPLATA | PSE | CARD */
  type: string;
  /** Celular de Nequi/Daviplata (10 dígitos) */
  phone_number?: string;
  /** Código de institución financiera (PSE) */
  financial_institution_code?: string;
  /** Tipo de persona PSE: 0 natural, 1 jurídica */
  user_type?: number;
  /** Tipo de documento PSE: CC, CE o NIT */
  user_legal_id_type?: string;
  /** Número de documento PSE */
  user_legal_id?: string;
  /** Descripción del pago (PSE, máx 64) */
  payment_description?: string;
  /** Token de tarjeta (CARD) */
  token?: string;
  /** Número de cuotas (CARD) */
  installments?: number;
}

export interface CardTokenizeInput {
  number: string;
  exp_month: string;
  exp_year: string;
  cvc: string;
  card_holder: string;
}

export interface CreateTransactionInput {
  amount_in_cents: number;
  currency: string;
  reference: string;
  customer_email: string;
  customer_name: string;
  redirect_url?: string;
  ip?: string;
  payment_method: PaymentMethodInput;
}

export interface CreateTransactionResult {
  transaction_id: string;
  status: string;
  /** URL de redirección para métodos async (PSE). */
  async_payment_url?: string;
}

export interface FinancialInstitution {
  code: string;
  name: string;
}

export interface TransactionStatusResult {
  transaction_id: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR';
  amount_in_cents: number;
  reference: string;
  payment_link_id: string | null;
}

export abstract class PaymentGateway {
  abstract createCheckoutSession(
    input: CreateCheckoutInput,
  ): Promise<CreateCheckoutResult>;
  abstract createTransaction(
    input: CreateTransactionInput,
  ): Promise<CreateTransactionResult>;
  abstract tokenizeCard(input: CardTokenizeInput): Promise<string>;
  abstract getFinancialInstitutions(): Promise<FinancialInstitution[]>;
  abstract getTransactionStatus(
    transactionId: string,
  ): Promise<TransactionStatusResult>;
  abstract verifyWebhookSignature(body: string, signature: string): boolean;
}

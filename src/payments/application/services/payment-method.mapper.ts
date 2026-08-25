import { BadRequestException } from '@nestjs/common';
import { PaymentMethodInput } from '../../domain/gateways/payment-gateway.interface';

export interface PaymentDataInput {
  phone_number?: string;
  financial_institution_code?: string;
  user_type?: number;
  user_legal_id_type?: string;
  user_legal_id?: string;
  full_name?: string;
  card_number?: string;
  card_exp_month?: string;
  card_exp_year?: string;
  card_cvc?: string;
  card_holder?: string;
}

export interface CardDataValidated {
  number: string;
  exp_month: string;
  exp_year: string;
  cvc: string;
  card_holder: string;
}

export const METODOS_DIRECTOS = ['NEQUI', 'DAVIPLATA', 'PSE'] as const;
export type MetodoDirecto = (typeof METODOS_DIRECTOS)[number];

/**
 * Valida los datos requeridos según el método de pago directo y mapea
 * a la estructura que Wompi espera en `payment_method`.
 * Responsabilidad única: reglas de método de pago directo (SRP).
 */
export class PaymentMethodMapper {
  constructor(
    private readonly metodoPago: string,
    private readonly data: PaymentDataInput = {},
  ) {}

  static esDirecto(metodoPago: string): boolean {
    return (METODOS_DIRECTOS as readonly string[]).includes(metodoPago);
  }

  /**
   * Valida los datos de la tarjeta y los devuelve listos para tokenizar.
   */
  requireCardData(): CardDataValidated {
    const { card_number, card_exp_month, card_exp_year, card_cvc, card_holder } =
      this.data;

    if (!card_number || !/^\d{14,16}$/.test(card_number)) {
      throw new BadRequestException('Ingresa un número de tarjeta válido');
    }
    if (!card_exp_month || !/^\d{2}$/.test(card_exp_month)) {
      throw new BadRequestException('Mes de expiración inválido (MM)');
    }
    if (!card_exp_year || !/^\d{2}$/.test(card_exp_year)) {
      throw new BadRequestException('Año de expiración inválido (AA)');
    }
    if (!card_cvc || !/^\d{3,4}$/.test(card_cvc)) {
      throw new BadRequestException('CVC inválido');
    }
    if (!card_holder || card_holder.trim().length < 5) {
      throw new BadRequestException(
        'Ingresa el nombre completo del titular de la tarjeta',
      );
    }

    return {
      number: card_number,
      exp_month: card_exp_month,
      exp_year: card_exp_year,
      cvc: card_cvc,
      card_holder: card_holder.trim(),
    };
  }

  toWompiPaymentMethod(paymentDescription: string): PaymentMethodInput {
    switch (this.metodoPago) {
      case 'NEQUI':
      case 'DAVIPLATA':
        return {
          type: this.metodoPago,
          phone_number: this.requirePhone(),
          user_legal_id_type: this.requireValue(
            this.data.user_legal_id_type,
            `${this.metodoPago}: indica el tipo de documento (CC o CE)`,
          ),
          user_legal_id: this.requireValue(
            this.data.user_legal_id,
            `${this.metodoPago}: indica el número de documento`,
          ),
        };
      case 'PSE':
        return {
          type: 'PSE',
          financial_institution_code: this.requireValue(
            this.data.financial_institution_code,
            'Para PSE selecciona un banco',
          ),
          user_type: this.data.user_type ?? 0,
          user_legal_id_type: this.requireValue(
            this.data.user_legal_id_type,
            'Para PSE indica el tipo de documento (CC, CE, NIT, etc.)',
          ),
          user_legal_id: this.requireValue(
            this.data.user_legal_id,
            'Para PSE indica el número de documento',
          ),
          payment_description: paymentDescription,
        };
      default:
        throw new BadRequestException(
          'El método de pago no admite transacción directa',
        );
    }
  }

  private requirePhone(): string {
    const phone = this.data.phone_number;
    if (!phone || !/^\d{10}$/.test(phone)) {
      throw new BadRequestException(
        `Para ${this.metodoPago} ingresa un celular válido (10 dígitos)`,
      );
    }
    return phone;
  }

  private requireValue(value: string | undefined, message: string): string {
    if (!value) {
      throw new BadRequestException(message);
    }
    return value;
  }
}

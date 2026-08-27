import { BadRequestException, Injectable } from '@nestjs/common';
import { CreatePaymentUseCase } from 'src/payments/application/use-cases/create-payment.use-case';
import {
  RECARGA_MONTO_MAX,
  RECARGA_MONTO_MIN,
} from 'src/payments/domain/payment.constants';
import type { PaymentDataInput } from 'src/payments/application/services/payment-method.mapper';

interface CrearRecargaInput {
  monto: number;
  metodo_pago: string;
  tipo_tarjeta?: string;
  payment_data?: PaymentDataInput;
  ip?: string;
}

@Injectable()
export class CrearRecargaUseCase {
  constructor(private readonly createPaymentUseCase: CreatePaymentUseCase) {}

  async execute(usuarioId: bigint, dto: CrearRecargaInput) {
    const monto = Math.round(dto.monto);

    if (monto < RECARGA_MONTO_MIN || monto > RECARGA_MONTO_MAX) {
      throw new BadRequestException(
        `El monto de recarga debe estar entre $${RECARGA_MONTO_MIN} y $${RECARGA_MONTO_MAX}`,
      );
    }

    return this.createPaymentUseCase.execute(usuarioId, {
      tipo_reserva: 'RECARGA',
      metodo_pago: dto.metodo_pago,
      tipo_tarjeta: dto.tipo_tarjeta,
      monto,
      payment_data: dto.payment_data,
      ip: dto.ip,
    });
  }
}

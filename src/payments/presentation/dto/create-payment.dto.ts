import {
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  METODOS_PAGO,
  RECARGA_MONTO_MAX,
  RECARGA_MONTO_MIN,
  TIPOS_RESERVA,
} from 'src/payments/domain/payment.constants';

export class PaymentDataDto {
  @IsOptional()
  @Matches(/^\d{10}$/, {
    message: 'El celular debe tener 10 dígitos',
  })
  phone_number?: string;

  @IsOptional()
  @IsString()
  financial_institution_code?: string;

  @IsOptional()
  @IsIn([0, 1])
  user_type?: number;

  @IsOptional()
  @IsIn(['CC', 'CE'])
  user_legal_id_type?: string;

  @IsOptional()
  @IsString()
  user_legal_id?: string;

  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @Matches(/^\d{14,16}$/, { message: 'Número de tarjeta inválido' })
  card_number?: string;

  @IsOptional()
  @Matches(/^\d{2}$/, { message: 'Mes de expiración inválido (MM)' })
  card_exp_month?: string;

  @IsOptional()
  @Matches(/^\d{2}$/, { message: 'Año de expiración inválido (AA)' })
  card_exp_year?: string;

  @IsOptional()
  @Matches(/^\d{3,4}$/, { message: 'CVC inválido' })
  card_cvc?: string;

  @IsOptional()
  @IsString()
  card_holder?: string;
}

export class CreatePaymentDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  reserva_id?: number;

  @IsIn([...TIPOS_RESERVA])
  tipo_reserva!: string;

  @IsIn([...METODOS_PAGO])
  metodo_pago!: string;

  @IsOptional()
  @IsIn(['CREDITO', 'DEBITO'])
  tipo_tarjeta?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9-]{4,20}$/, {
    message: 'El código de descuento tiene un formato inválido',
  })
  codigo_descuento?: string;

  @IsOptional()
  @IsNumber()
  @Min(RECARGA_MONTO_MIN)
  @Max(RECARGA_MONTO_MAX)
  monto?: number;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PaymentDataDto)
  payment_data?: PaymentDataDto;
}

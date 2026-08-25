import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  RECARGA_MONTO_MAX,
  RECARGA_MONTO_MIN,
} from 'src/payments/domain/payment.constants';
import { PaymentDataDto } from 'src/payments/presentation/dto/create-payment.dto';

export class CrearRecargaDto {
  @IsInt()
  @Min(RECARGA_MONTO_MIN)
  @Max(RECARGA_MONTO_MAX)
  @Type(() => Number)
  monto!: number;

  @IsIn(['TARJETA', 'NEQUI', 'DAVIPLATA', 'PSE'])
  metodo_pago!: string;

  @IsOptional()
  @IsIn(['CREDITO', 'DEBITO'])
  tipo_tarjeta?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PaymentDataDto)
  payment_data?: PaymentDataDto;
}

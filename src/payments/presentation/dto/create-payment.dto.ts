import { IsInt, IsNumber, IsString, IsNotEmpty, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePaymentDto {
  @IsInt()
  @Type(() => Number)
  reserva_id!: number;

  @IsNumber()
  @Type(() => Number)
  monto!: number;

  @IsString()
  @IsNotEmpty()
  metodo_pago!: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['EVENTO', 'HOTEL', 'RESTAURANTE'])
  tipo_reserva!: string;
}

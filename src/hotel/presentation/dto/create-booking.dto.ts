import {
  IsInt,
  IsDateString,
  IsOptional,
  IsString,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBookingDto {
  @IsInt()
  @Type(() => Number)
  habitacion_id: number;

  @IsDateString()
  fecha_entrada: string;

  @IsDateString()
  fecha_salida: string;

  @IsInt()
  @Type(() => Number)
  cantidad_huespedes: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  total?: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

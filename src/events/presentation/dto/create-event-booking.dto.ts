import {
  IsInt,
  IsDateString,
  IsOptional,
  IsNumber,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEventBookingDto {
  @IsInt()
  @Type(() => Number)
  salon_id: number;

  @IsInt()
  @Type(() => Number)
  tipo_evento_id: number;

  @IsDateString()
  fecha: string;

  @IsDateString()
  hora_inicio: string;

  @IsDateString()
  hora_fin: string;

  @IsInt()
  @Type(() => Number)
  cantidad_personas: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  anticipo?: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

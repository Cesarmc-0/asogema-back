import { IsInt, IsDateString, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReservationDto {
  @IsInt()
  @Type(() => Number)
  mesa_id: number;

  @IsDateString()
  fecha: string;

  @IsDateString()
  hora: string;

  @IsInt()
  @Type(() => Number)
  cantidad_personas: number;

  @IsOptional()
  @IsString()
  motivo?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

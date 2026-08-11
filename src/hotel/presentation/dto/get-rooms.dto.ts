import { IsOptional, IsInt, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class GetRoomsDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  tipo_habitacion_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  capacidad_min?: number;

  @IsOptional()
  @IsDateString()
  fecha_entrada?: string;

  @IsOptional()
  @IsDateString()
  fecha_salida?: string;
}

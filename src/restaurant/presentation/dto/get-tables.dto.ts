import { IsOptional, IsDateString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class GetTablesDto {
  @IsDateString()
  fecha: string;

  @IsDateString()
  hora: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  capacidad_min?: number;
}

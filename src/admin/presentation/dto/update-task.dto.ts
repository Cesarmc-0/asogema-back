import {
  IsString,
  IsOptional,
  IsDateString,
  IsIn,
  IsInt,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  titulo?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsString()
  hora_inicio?: string;

  @IsOptional()
  @IsString()
  hora_fin?: string;

  @IsOptional()
  @IsIn(['PENDIENTE', 'EN_PROGRESO', 'COMPLETADA', 'CANCELADA'])
  estado?: string;

  @IsOptional()
  @IsIn(['BAJA', 'MEDIA', 'ALTA', 'URGENTE'])
  prioridad?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  asignado_a?: number;
}

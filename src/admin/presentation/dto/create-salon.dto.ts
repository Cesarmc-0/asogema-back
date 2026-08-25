import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSalonDto {
  @IsString()
  nombre: string;

  @IsInt()
  @Type(() => Number)
  capacidad: number;

  @IsNumber()
  @Type(() => Number)
  precio_base: number;

  @IsOptional()
  @IsString()
  imagen_url?: string | null;

  @IsOptional()
  @IsString()
  ubicacion?: string | null;
}

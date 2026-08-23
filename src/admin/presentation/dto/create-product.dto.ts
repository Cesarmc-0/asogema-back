import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  nombre: string;

  @IsInt()
  @Type(() => Number)
  categoria_id: number;

  @IsNumber()
  @Type(() => Number)
  precio: number;

  @IsInt()
  @Type(() => Number)
  stock: number;

  @IsOptional()
  @IsString()
  descripcion?: string | null;

  @IsOptional()
  @IsString()
  imagen_url?: string | null;
}

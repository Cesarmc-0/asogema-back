import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRoomTypeDto {
  @IsString()
  nombre: string;

  @IsInt()
  @Type(() => Number)
  capacidad: number;

  @IsNumber()
  @Type(() => Number)
  precio_noche: number;

  @IsOptional()
  @IsString()
  imagen_url?: string | null;
}

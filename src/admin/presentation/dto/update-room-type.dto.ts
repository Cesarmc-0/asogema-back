import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateRoomTypeDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  capacidad?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  precio_noche?: number;

  @IsOptional()
  @IsString()
  imagen_url?: string | null;
}

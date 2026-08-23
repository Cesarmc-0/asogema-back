import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRoomDto {
  @IsString()
  numero: string;

  @IsInt()
  @Type(() => Number)
  piso: number;

  @IsInt()
  @Type(() => Number)
  tipo_id: number;

  @IsOptional()
  @IsString()
  imagen_url?: string | null;
}

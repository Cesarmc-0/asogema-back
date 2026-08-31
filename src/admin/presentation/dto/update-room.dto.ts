import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  numero?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  piso?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  tipo_id?: number;

  @IsOptional()
  @IsString()
  imagen_url?: string | null;
}

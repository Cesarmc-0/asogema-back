import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IMAGEN_ENTIDADES } from 'src/infrastructure/storage/imagenes.helper';

export class CreateImagenDto {
  @IsIn(IMAGEN_ENTIDADES)
  entidad: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  entidad_id: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  url: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  orden?: number;

  @IsOptional()
  @IsBoolean()
  es_principal?: boolean;
}

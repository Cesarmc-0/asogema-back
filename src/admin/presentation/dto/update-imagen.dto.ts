import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateImagenDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  url?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  orden?: number;

  @IsOptional()
  @IsBoolean()
  es_principal?: boolean;
}

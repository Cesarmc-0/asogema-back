import {
  IsIn,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReviewDto {
  @IsString()
  @IsIn(['hotel', 'restaurant', 'events'])
  tipo_servicio: string;

  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  calificacion: number;

  @IsString()
  @MinLength(10)
  @MaxLength(500)
  texto: string;
}

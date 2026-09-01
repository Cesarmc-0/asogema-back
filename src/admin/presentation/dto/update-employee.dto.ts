import {
  IsString,
  IsEmail,
  MinLength,
  IsInt,
  IsOptional,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateEmployeeDto {
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  nombre?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  apellido?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  tipo_documento_id?: number;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  numero_documento?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  telefono?: string;

  @IsOptional()
  @IsEmail()
  correo?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}

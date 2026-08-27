import {
  IsString,
  IsEmail,
  MinLength,
  IsInt,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEmployeeDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  nombre: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  apellido: string;

  @IsInt()
  @Type(() => Number)
  tipo_documento_id: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  numero_documento: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  telefono: string;

  @IsEmail()
  correo: string;

  @IsString()
  @MinLength(6)
  password: string;
}

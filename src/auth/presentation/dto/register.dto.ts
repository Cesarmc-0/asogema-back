import { Type } from 'class-transformer';
import {
  IsString,
  IsEmail,
  MinLength,
  IsInt,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class RegisterDto {
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString({ message: 'El nombre no es válido' })
  nombre: string;

  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  @IsString({ message: 'El apellido no es válido' })
  apellido: string;

  @IsInt({ message: 'El tipo de documento no es válido' })
  @Type(() => Number)
  tipo_documento_id: number;

  @IsNotEmpty({ message: 'El número de documento es obligatorio' })
  @IsString({ message: 'El número de documento no es válido' })
  @MaxLength(20, {
    message: 'El número de documento no puede superar 20 caracteres',
  })
  numero_documento: string;

  @IsEmail({}, { message: 'El correo no es válido' })
  correo: string;

  @IsString({ message: 'La contraseña no es válida' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @IsNotEmpty({ message: 'El teléfono es obligatorio' })
  @IsString({ message: 'El teléfono no es válido' })
  @MaxLength(20, {
    message: 'El teléfono no puede superar 20 caracteres',
  })
  telefono: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de nacimiento no es válida' })
  fecha_nacimiento?: string;
}

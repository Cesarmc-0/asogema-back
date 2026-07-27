import { Type } from 'class-transformer';
import { IsString, IsEmail, MinLength, IsInt, IsNotEmpty, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty() @IsString() nombre: string;
  @IsNotEmpty() @IsString() apellido: string;
  @IsInt() @Type(() => Number) tipo_documento_id: number;
  @IsNotEmpty() @IsString() @MaxLength(20) numero_documento: string;
  @IsEmail() correo: string;
  @IsString() @MinLength(6) password: string;
  @IsNotEmpty() @IsString() @MaxLength(20) telefono: string;
}

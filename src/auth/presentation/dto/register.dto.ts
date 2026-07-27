import { IsString, IsEmail, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsString() nombre: string;
  @IsString() apellido: string;
  @IsString() tipo_documento_id: bigint;
  @IsString() numero_documento: string;
  @IsEmail() correo: string;
  @IsString() @MinLength(6) password: string;
  @IsOptional() @IsString() telefono?: string;
}

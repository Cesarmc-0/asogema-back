import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'El correo no es válido' })
  @IsNotEmpty({ message: 'El correo es obligatorio' })
  correo!: string;

  @IsString({ message: 'La contraseña no es válida' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password!: string;
}

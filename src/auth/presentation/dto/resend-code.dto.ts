import { IsEmail } from 'class-validator';

export class ResendCodeDto {
  @IsEmail() correo: string;
}

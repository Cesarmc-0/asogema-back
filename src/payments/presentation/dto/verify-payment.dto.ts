import { IsString, IsNotEmpty } from 'class-validator';

export class VerifyPaymentDto {
  @IsString()
  @IsNotEmpty()
  transaction_id: string;
}

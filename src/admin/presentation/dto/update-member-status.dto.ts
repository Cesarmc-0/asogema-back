import { IsBoolean } from 'class-validator';

export class UpdateMemberStatusDto {
  @IsBoolean()
  activo: boolean;
}

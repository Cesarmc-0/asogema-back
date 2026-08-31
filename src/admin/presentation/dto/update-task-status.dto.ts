import { IsIn } from 'class-validator';

export class UpdateTaskStatusDto {
  @IsIn(['PENDIENTE', 'EN_PROGRESO', 'COMPLETADA', 'CANCELADA'])
  estado: string;
}

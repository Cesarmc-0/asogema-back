import {
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

export class CompleteTaskDto {
  @IsString()
  @IsNotEmpty({ message: 'El reporte es obligatorio para completar la tarea' })
  @MinLength(5, { message: 'El reporte debe tener al menos 5 caracteres' })
  @MaxLength(1000, { message: 'El reporte no puede superar 1000 caracteres' })
  @Matches(/\S/, { message: 'El reporte no puede estar vacío' })
  reporte: string;
}

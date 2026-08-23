import { IsString } from 'class-validator';

export class CreateMenuCategoryDto {
  @IsString()
  nombre: string;
}

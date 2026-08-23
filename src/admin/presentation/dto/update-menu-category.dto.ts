import { IsOptional, IsString } from 'class-validator';

export class UpdateMenuCategoryDto {
  @IsOptional()
  @IsString()
  nombre?: string;
}

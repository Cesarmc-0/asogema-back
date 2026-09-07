import { IsIn, IsString } from 'class-validator';

export class GetReviewsQueryDto {
  @IsString()
  @IsIn(['hotel', 'restaurant', 'events'])
  service: string;
}

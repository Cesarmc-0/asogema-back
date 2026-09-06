import { IsOptional, IsIn, IsString, IsDateString } from 'class-validator';
import { DAY_BOOKING_TYPES } from 'src/hotel/domain/repositories/hotel-room.repository.interface';

export class GetDayBookingsQueryDto {
  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsIn(DAY_BOOKING_TYPES)
  tipo: (typeof DAY_BOOKING_TYPES)[number] = 'todas';

  @IsOptional()
  @IsString()
  estado?: string;
}

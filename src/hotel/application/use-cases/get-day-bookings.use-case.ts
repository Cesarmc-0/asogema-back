import { BadRequestException, Injectable } from '@nestjs/common';
import {
  DayBooking,
  DayBookingType,
  HotelRoomRepository,
} from 'src/hotel/domain/repositories/hotel-room.repository.interface';

export interface GetDayBookingsParams {
  fecha?: string;
  tipo: DayBookingType;
  estado?: string;
}

@Injectable()
export class GetDayBookingsUseCase {
  constructor(private readonly hotelRepository: HotelRoomRepository) {}

  async execute(params: GetDayBookingsParams): Promise<DayBooking[]> {
    const day = this.parseDay(params.fecha);
    return this.hotelRepository.findBookingsByDay(
      day,
      params.tipo,
      params.estado,
    );
  }

  private parseDay(fecha?: string): Date {
    if (!fecha) {
      return this.todayAtMidnight();
    }
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha.trim());
    if (!match) {
      throw new BadRequestException(
        'El parámetro "fecha" debe tener formato YYYY-MM-DD',
      );
    }
    const day = new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
    );
    if (Number.isNaN(day.getTime())) {
      throw new BadRequestException(
        'El parámetro "fecha" debe ser una fecha válida',
      );
    }
    return day;
  }

  private todayAtMidnight(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
}

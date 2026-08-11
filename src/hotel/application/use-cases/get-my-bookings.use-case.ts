import { Injectable, NotFoundException } from '@nestjs/common';
import { HotelRoomRepository } from '../../../hotel/domain/repositories/hotel-room.repository.interface';
import { ReservaHabitacionConHabitacion } from '../../../hotel/domain/repositories/hotel-room.repository.interface';

@Injectable()
export class GetMyBookingsUseCase {
  constructor(private readonly hotelRepository: HotelRoomRepository) {}

  async execute(usuario_id: bigint): Promise<ReservaHabitacionConHabitacion[]> {
    const bookings = await this.hotelRepository.findBookingsByUser(usuario_id);
    if (!bookings || bookings.length === 0) {
      throw new NotFoundException('No se encontraron reservas');
    }
    return bookings;
  }
}

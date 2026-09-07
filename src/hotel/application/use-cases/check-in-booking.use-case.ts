import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HotelRoomRepository } from 'src/hotel/domain/repositories/hotel-room.repository.interface';

@Injectable()
export class CheckInBookingUseCase {
  constructor(private readonly hotelRepository: HotelRoomRepository) {}

  async execute(id: bigint) {
    const booking = await this.hotelRepository.findBookingById(id);
    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }

    if (booking.estado === 'CHECK_IN') {
      return { reserva_id: booking.id, estado: booking.estado };
    }

    if (booking.estado === 'PENDIENTE') {
      throw new ConflictException(
        'No se puede hacer check-in: la reserva aún no está confirmada (debe estar pagada)',
      );
    }

    if (booking.estado === 'FINALIZADA' || booking.estado === 'CANCELADA') {
      throw new ConflictException(
        `No se puede hacer check-in: la reserva está en estado ${booking.estado}`,
      );
    }

    // Permitir check-in desde CONFIRMADA o PENDING_PAYMENT (15% pagado)
    if (!['CONFIRMADA', 'PENDING_PAYMENT'].includes(booking.estado)) {
      throw new ConflictException(
        `No se puede hacer check-in desde el estado ${booking.estado}`,
      );
    }

    await this.hotelRepository.updateBookingStatus(id, 'CHECK_IN');
    return { reserva_id: booking.id, estado: 'CHECK_IN' };
  }
}

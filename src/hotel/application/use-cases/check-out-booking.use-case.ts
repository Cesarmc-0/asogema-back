import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HotelRoomRepository } from 'src/hotel/domain/repositories/hotel-room.repository.interface';
import { HotelPaymentRepository } from 'src/hotel/domain/repositories/hotel-payment.repository.interface';

@Injectable()
export class CheckOutBookingUseCase {
  constructor(
    private readonly hotelRepository: HotelRoomRepository,
    private readonly hotelPaymentRepository: HotelPaymentRepository,
  ) {}

  async execute(id: bigint) {
    const booking = await this.hotelRepository.findBookingById(id);
    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }

    if (booking.estado === 'FINALIZADA') {
      return { reserva_id: booking.id, estado: booking.estado };
    }

    if (booking.estado !== 'CHECK_IN') {
      throw new ConflictException(
        `No se puede hacer check-out: la reserva debe estar en CHECK_IN (estado actual: ${booking.estado})`,
      );
    }

    const saldoPendiente =
      await this.hotelPaymentRepository.calcularSaldoPendiente(
        id,
        Number(booking.total),
      );

    if (saldoPendiente > 0) {
      throw new ConflictException(
        `No se puede hacer check-out: existe saldo pendiente de $${saldoPendiente}`,
      );
    }

    await this.hotelRepository.updateBookingStatus(id, 'FINALIZADA');
    return { reserva_id: booking.id, estado: 'FINALIZADA' };
  }
}

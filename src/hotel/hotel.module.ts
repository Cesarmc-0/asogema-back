import { Module } from '@nestjs/common';
import { GetAvailableRoomsUseCase } from 'src/hotel/application/use-cases/get-available-rooms.use-case';
import { CreateHotelBookingUseCase } from 'src/hotel/application/use-cases/create-hotel-booking.use-case';
import { GetMyBookingsUseCase } from 'src/hotel/application/use-cases/get-my-bookings.use-case';
import { GetDayBookingsUseCase } from 'src/hotel/application/use-cases/get-day-bookings.use-case';
import { CheckInBookingUseCase } from 'src/hotel/application/use-cases/check-in-booking.use-case';
import { CheckOutBookingUseCase } from 'src/hotel/application/use-cases/check-out-booking.use-case';
import { PayHotelBalanceUseCase } from 'src/hotel/application/use-cases/pay-hotel-balance.use-case';
import { GetPaymentStatusUseCase } from 'src/hotel/application/use-cases/get-payment-status.use-case';
import { HotelRoomRepository } from 'src/hotel/domain/repositories/hotel-room.repository.interface';
import { HotelPaymentRepository } from 'src/hotel/domain/repositories/hotel-payment.repository.interface';
import { HotelRepositoryImpl } from 'src/hotel/infrastructure/persistence/hotel.repository';
import { HotelPaymentRepositoryImpl } from 'src/hotel/infrastructure/persistence/hotel-payment.repository';
import { HotelController } from 'src/hotel/presentation/controllers/hotel.controller';

@Module({
  controllers: [HotelController],
  providers: [
    GetAvailableRoomsUseCase,
    CreateHotelBookingUseCase,
    GetMyBookingsUseCase,
    GetDayBookingsUseCase,
    CheckInBookingUseCase,
    CheckOutBookingUseCase,
    PayHotelBalanceUseCase,
    GetPaymentStatusUseCase,
    { provide: HotelRoomRepository, useClass: HotelRepositoryImpl },
    { provide: HotelPaymentRepository, useClass: HotelPaymentRepositoryImpl },
  ],
})
export class HotelModule {}

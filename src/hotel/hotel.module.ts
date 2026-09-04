import { Module } from '@nestjs/common';
import { GetAvailableRoomsUseCase } from 'src/hotel/application/use-cases/get-available-rooms.use-case';
import { CreateHotelBookingUseCase } from 'src/hotel/application/use-cases/create-hotel-booking.use-case';
import { GetMyBookingsUseCase } from 'src/hotel/application/use-cases/get-my-bookings.use-case';
import { HotelRoomRepository } from 'src/hotel/domain/repositories/hotel-room.repository.interface';
import { HotelRepositoryImpl } from 'src/hotel/infrastructure/persistence/hotel.repository';
import { HotelController } from 'src/hotel/presentation/controllers/hotel.controller';

@Module({
  controllers: [HotelController],
  providers: [
    GetAvailableRoomsUseCase,
    CreateHotelBookingUseCase,
    GetMyBookingsUseCase,
    { provide: HotelRoomRepository, useClass: HotelRepositoryImpl },
  ],
})
export class HotelModule {}

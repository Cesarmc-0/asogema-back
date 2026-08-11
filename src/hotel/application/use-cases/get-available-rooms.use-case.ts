import { Injectable } from '@nestjs/common';
import {
  HotelRoomRepository,
  AvailableRoomQuery,
} from '../../../hotel/domain/repositories/hotel-room.repository.interface';
import { HabitacionWithType } from '../../../hotel/domain/repositories/hotel-room.repository.interface';

@Injectable()
export class GetAvailableRoomsUseCase {
  constructor(private readonly hotelRepository: HotelRoomRepository) {}

  async execute(query: AvailableRoomQuery): Promise<HabitacionWithType[]> {
    return this.hotelRepository.findAvailableRooms(query);
  }
}

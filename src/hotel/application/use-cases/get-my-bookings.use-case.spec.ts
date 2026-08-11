import { NotFoundException } from '@nestjs/common';
import { GetMyBookingsUseCase } from './get-my-bookings.use-case';
import { HotelRoomRepository } from 'src/hotel/domain/repositories/hotel-room.repository.interface';

const mockHotelRepository = {
  findBookingsByUser: jest.fn(),
} as unknown as HotelRoomRepository;

describe('GetMyBookingsUseCase', () => {
  let useCase: GetMyBookingsUseCase;

  beforeEach(() => {
    useCase = new GetMyBookingsUseCase(mockHotelRepository);
  });

  it('debe retornar las reservas del usuario', async () => {
    const mockBookings = [
      { id: 1n, habitacion_id: 1n, cantidad_huespedes: 2 },
      { id: 2n, habitacion_id: 3n, cantidad_huespedes: 4 },
    ];
    mockHotelRepository.findBookingsByUser.mockResolvedValue(mockBookings);

    const result = await useCase.execute(1n);

    expect(result).toEqual(mockBookings);
    expect(mockHotelRepository.findBookingsByUser).toHaveBeenCalledWith(1n);
  });

  it('debe lanzar NotFoundException si no hay reservas', async () => {
    mockHotelRepository.findBookingsByUser.mockResolvedValue([]);

    await expect(useCase.execute(1n)).rejects.toThrow(NotFoundException);
  });
});

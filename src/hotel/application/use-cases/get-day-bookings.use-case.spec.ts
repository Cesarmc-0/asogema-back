import { BadRequestException } from '@nestjs/common';
import { GetDayBookingsUseCase } from './get-day-bookings.use-case';
import { HotelRoomRepository } from 'src/hotel/domain/repositories/hotel-room.repository.interface';

const mockHotelRepository = {
  findBookingsByDay: jest.fn(),
} as unknown as HotelRoomRepository;

describe('GetDayBookingsUseCase', () => {
  let useCase: GetDayBookingsUseCase;

  beforeEach(() => {
    useCase = new GetDayBookingsUseCase(mockHotelRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe devolver reservas del día con tipo por defecto', async () => {
    const day = new Date(2026, 8, 5);
    mockHotelRepository.findBookingsByDay.mockResolvedValue([]);

    const result = await useCase.execute({ tipo: 'todas' });

    expect(mockHotelRepository.findBookingsByDay).toHaveBeenCalledWith(
      expect.objectContaining({ getFullYear: expect.any(Function) }),
      'todas',
      undefined,
    );
    expect(result).toEqual([]);
  });

  it('debe parsear fecha en formato YYYY-MM-DD', async () => {
    mockHotelRepository.findBookingsByDay.mockResolvedValue([]);

    await useCase.execute({ fecha: '2026-09-05', tipo: 'check-in' });

    const callArg = mockHotelRepository.findBookingsByDay.mock.calls[0][0];
    expect(callArg.getFullYear()).toBe(2026);
    expect(callArg.getMonth()).toBe(8);
    expect(callArg.getDate()).toBe(5);
  });

  it('debe lanzar BadRequest si fecha tiene formato inválido', async () => {
    await expect(
      useCase.execute({ fecha: '05/09/2026', tipo: 'ocupadas' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('debe pasar tipo y estado al repositorio', async () => {
    mockHotelRepository.findBookingsByDay.mockResolvedValue([]);

    await useCase.execute({
      fecha: '2026-09-05',
      tipo: 'check-out',
      estado: 'CONFIRMADA',
    });

    expect(mockHotelRepository.findBookingsByDay).toHaveBeenCalledWith(
      expect.any(Date),
      'check-out',
      'CONFIRMADA',
    );
  });
});

import { ConflictException, NotFoundException } from '@nestjs/common';
import { CheckInBookingUseCase } from './check-in-booking.use-case';
import { HotelRoomRepository } from 'src/hotel/domain/repositories/hotel-room.repository.interface';

const mockHotelRepository = {
  findBookingById: jest.fn(),
  updateBookingStatus: jest.fn(),
} as unknown as HotelRoomRepository;

describe('CheckInBookingUseCase', () => {
  let useCase: CheckInBookingUseCase;

  beforeEach(() => {
    useCase = new CheckInBookingUseCase(mockHotelRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe hacer check-in desde CONFIRMADA', async () => {
    mockHotelRepository.findBookingById.mockResolvedValue({
      id: 1n,
      estado: 'CONFIRMADA',
    });
    mockHotelRepository.updateBookingStatus.mockResolvedValue(undefined);

    const result = await useCase.execute(1n);

    expect(mockHotelRepository.updateBookingStatus).toHaveBeenCalledWith(
      1n,
      'CHECK_IN',
    );
    expect(result).toEqual({ reserva_id: 1n, estado: 'CHECK_IN' });
  });

  it('debe retornar si ya está en CHECK_IN', async () => {
    mockHotelRepository.findBookingById.mockResolvedValue({
      id: 1n,
      estado: 'CHECK_IN',
    });

    const result = await useCase.execute(1n);

    expect(mockHotelRepository.updateBookingStatus).not.toHaveBeenCalled();
    expect(result).toEqual({ reserva_id: 1n, estado: 'CHECK_IN' });
  });

  it('debe lanzar ConflictException si estado es PENDIENTE', async () => {
    mockHotelRepository.findBookingById.mockResolvedValue({
      id: 1n,
      estado: 'PENDIENTE',
    });

    await expect(useCase.execute(1n)).rejects.toThrow(ConflictException);
  });

  it('debe lanzar ConflictException si estado es FINALIZADA', async () => {
    mockHotelRepository.findBookingById.mockResolvedValue({
      id: 1n,
      estado: 'FINALIZADA',
    });

    await expect(useCase.execute(1n)).rejects.toThrow(ConflictException);
  });

  it('debe lanzar ConflictException si estado es CANCELADA', async () => {
    mockHotelRepository.findBookingById.mockResolvedValue({
      id: 1n,
      estado: 'CANCELADA',
    });

    await expect(useCase.execute(1n)).rejects.toThrow(ConflictException);
  });

  it('debe lanzar NotFoundException si no existe reserva', async () => {
    mockHotelRepository.findBookingById.mockResolvedValue(null);

    await expect(useCase.execute(99n)).rejects.toThrow(NotFoundException);
  });
});

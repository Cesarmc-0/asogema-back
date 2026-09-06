import { ConflictException, NotFoundException } from '@nestjs/common';
import { CheckOutBookingUseCase } from './check-out-booking.use-case';
import { HotelRoomRepository } from 'src/hotel/domain/repositories/hotel-room.repository.interface';
import { HotelPaymentRepository } from 'src/hotel/domain/repositories/hotel-payment.repository.interface';

const mockHotelRepository = {
  findBookingById: jest.fn(),
  updateBookingStatus: jest.fn(),
} as unknown as HotelRoomRepository;

const mockHotelPaymentRepository = {
  calcularSaldoPendiente: jest.fn(),
} as unknown as HotelPaymentRepository;

describe('CheckOutBookingUseCase', () => {
  let useCase: CheckOutBookingUseCase;

  beforeEach(() => {
    useCase = new CheckOutBookingUseCase(
      mockHotelRepository,
      mockHotelPaymentRepository,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe hacer check-out desde CHECK_IN', async () => {
    mockHotelRepository.findBookingById.mockResolvedValue({
      id: 1n,
      estado: 'CHECK_IN',
      total: 100000,
    });
    mockHotelPaymentRepository.calcularSaldoPendiente.mockResolvedValue(0);
    mockHotelRepository.updateBookingStatus.mockResolvedValue(undefined);

    const result = await useCase.execute(1n);

    expect(mockHotelRepository.updateBookingStatus).toHaveBeenCalledWith(
      1n,
      'FINALIZADA',
    );
    expect(result).toEqual({ reserva_id: 1n, estado: 'FINALIZADA' });
  });

  it('debe retornar si ya está FINALIZADA', async () => {
    mockHotelRepository.findBookingById.mockResolvedValue({
      id: 1n,
      estado: 'FINALIZADA',
    });

    const result = await useCase.execute(1n);

    expect(mockHotelRepository.updateBookingStatus).not.toHaveBeenCalled();
    expect(result).toEqual({ reserva_id: 1n, estado: 'FINALIZADA' });
  });

  it('debe lanzar ConflictException si no está en CHECK_IN', async () => {
    mockHotelRepository.findBookingById.mockResolvedValue({
      id: 1n,
      estado: 'CONFIRMADA',
    });

    await expect(useCase.execute(1n)).rejects.toThrow(ConflictException);
  });

  it('debe lanzar NotFoundException si no existe reserva', async () => {
    mockHotelRepository.findBookingById.mockResolvedValue(null);

    await expect(useCase.execute(99n)).rejects.toThrow(NotFoundException);
  });
});

import { ConflictException, NotFoundException } from '@nestjs/common';
import { CreateHotelBookingUseCase } from './create-hotel-booking.use-case';
import { HotelRoomRepository } from 'src/hotel/domain/repositories/hotel-room.repository.interface';

const mockHotelRepository = {
  findById: jest.fn(),
  isRoomAvailableForDates: jest.fn(),
  createBooking: jest.fn(),
} as unknown as HotelRoomRepository;

const mockPrisma = {
  usuarios: {
    findUnique: jest.fn(),
  },
} as any;

const mockEmailSender = {
  sendWelcomeVerification: jest.fn(),
  sendBookingConfirmation: jest.fn(),
  sendPurchaseReceipt: jest.fn(),
} as any;

const mockCreatePaymentUseCase = {
  execute: jest.fn().mockResolvedValue({
    factura_id: 100n,
    pago_id: 200n,
    checkout_url: 'https://checkout.wompi.co/l/test123',
    total: 476000,
  }),
};

describe('CreateHotelBookingUseCase', () => {
  let useCase: CreateHotelBookingUseCase;

  beforeEach(() => {
    useCase = new CreateHotelBookingUseCase(
      mockHotelRepository,
      mockPrisma,
      mockEmailSender,
      mockCreatePaymentUseCase as never,
    );
    mockPrisma.usuarios.findUnique.mockResolvedValue({
      id: 1n,
      nombre: 'Juan',
      apellido: 'Pérez',
      correo: 'juan@test.com',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe crear reserva con éxito', async () => {
    const mockHabitacion = {
      id: 1n,
      numero: '101',
      estado: true,
      tipos_habitacion: { nombre: 'Standard', precio_noche: 100 as any },
    };
    mockHotelRepository.findById.mockResolvedValue(mockHabitacion);
    mockHotelRepository.isRoomAvailableForDates.mockResolvedValue(true);
    mockHotelRepository.createBooking.mockResolvedValue({ id: 1n });

    const result = await useCase.execute(1n, {
      habitacion_id: 1n,
      fecha_entrada: new Date('2026-08-01'),
      fecha_salida: new Date('2026-08-05'),
      cantidad_huespedes: 2,
    });

    expect(result).toEqual({
      id: 1n,
      payment: expect.objectContaining({ factura_id: 100n }),
    });
    expect(mockCreatePaymentUseCase.execute).toHaveBeenCalledWith(
      1n,
      expect.objectContaining({ tipo_reserva: 'HOTEL' }),
    );
    expect(mockHotelRepository.createBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        usuario_id: 1n,
        habitacion_id: 1n,
        cantidad_huespedes: 2,
      }),
    );
  });

  it('debe lanzar NotFoundException si habitación no existe', async () => {
    mockHotelRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute(1n, {
        habitacion_id: 99n,
        fecha_entrada: new Date('2026-08-01'),
        fecha_salida: new Date('2026-08-05'),
        cantidad_huespedes: 2,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('debe lanzar ConflictException si habitación no está disponible', async () => {
    const mockHabitacion = {
      id: 1n,
      numero: '101',
      estado: false,
      tipos_habitacion: { nombre: 'Standard', precio_noche: 100 as any },
    };
    mockHotelRepository.findById.mockResolvedValue(mockHabitacion);

    await expect(
      useCase.execute(1n, {
        habitacion_id: 1n,
        fecha_entrada: new Date('2026-08-01'),
        fecha_salida: new Date('2026-08-05'),
        cantidad_huespedes: 2,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('debe calcular total automáticamente si no se proporciona', async () => {
    const mockHabitacion = {
      id: 1n,
      numero: '101',
      estado: true,
      tipos_habitacion: { nombre: 'Standard', precio_noche: 100 as any },
    };
    mockHotelRepository.findById.mockResolvedValue(mockHabitacion);
    mockHotelRepository.isRoomAvailableForDates.mockResolvedValue(true);
    mockHotelRepository.createBooking.mockResolvedValue({ id: 1n, total: 400 });

    await useCase.execute(1n, {
      habitacion_id: 1n,
      fecha_entrada: new Date('2026-08-01'),
      fecha_salida: new Date('2026-08-05'),
      cantidad_huespedes: 2,
    });

    const callArgs = mockHotelRepository.createBooking.mock.calls[0][0];
    expect(callArgs.total).toBe(400);
  });

  it('debe usar total proporcionado si se envía', async () => {
    const mockHabitacion = {
      id: 1n,
      numero: '101',
      estado: true,
      tipos_habitacion: { nombre: 'Standard', precio_noche: 100 as any },
    };
    mockHotelRepository.findById.mockResolvedValue(mockHabitacion);
    mockHotelRepository.isRoomAvailableForDates.mockResolvedValue(true);
    mockHotelRepository.createBooking.mockResolvedValue({ id: 1n, total: 500 });

    await useCase.execute(1n, {
      habitacion_id: 1n,
      fecha_entrada: new Date('2026-08-01'),
      fecha_salida: new Date('2026-08-05'),
      cantidad_huespedes: 2,
      total: 500,
    });

    const callArgs = mockHotelRepository.createBooking.mock.calls[0][0];
    expect(callArgs.total).toBe(500);
  });

  it('debe notificar por correo la reserva creada', async () => {
    const mockHabitacion = {
      id: 1n,
      numero: '101',
      estado: true,
      tipos_habitacion: { nombre: 'Standard', precio_noche: 100 as any },
    };
    mockHotelRepository.findById.mockResolvedValue(mockHabitacion);
    mockHotelRepository.isRoomAvailableForDates.mockResolvedValue(true);
    mockHotelRepository.createBooking.mockResolvedValue({ id: 55n });

    await useCase.execute(1n, {
      habitacion_id: 1n,
      fecha_entrada: new Date('2026-08-01'),
      fecha_salida: new Date('2026-08-05'),
      cantidad_huespedes: 2,
    });

    expect(mockEmailSender.sendBookingConfirmation).toHaveBeenCalledWith(
      'hotel-booking',
      expect.objectContaining({
        correo: 'juan@test.com',
        reserva_id: 55n,
        personas: 2,
      }),
    );
  });
});

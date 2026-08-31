import { ConflictException, NotFoundException } from '@nestjs/common';
import { CreateEventBookingUseCase } from './create-event-booking.use-case';

const mockEventRepository = {
  createEventBooking: jest.fn(),
} as any;

const mockPrisma = {
  salones: {
    findUnique: jest.fn(),
  },
  reservas_evento: {
    count: jest.fn(),
  },
  usuarios: {
    findUnique: jest.fn(),
  },
  tipos_evento: {
    findUnique: jest.fn(),
  },
} as any;

const mockEmailSender = {
  sendWelcomeVerification: jest.fn(),
  sendBookingConfirmation: jest.fn(),
  sendPurchaseReceipt: jest.fn(),
} as any;

describe('CreateEventBookingUseCase', () => {
  let useCase: CreateEventBookingUseCase;

  beforeEach(() => {
    useCase = new CreateEventBookingUseCase(
      mockEventRepository,
      mockPrisma,
      mockEmailSender,
    );
    mockPrisma.usuarios.findUnique.mockResolvedValue({
      id: 1n,
      nombre: 'Juan',
      apellido: 'Pérez',
      correo: 'juan@test.com',
    });
    mockPrisma.tipos_evento.findUnique.mockResolvedValue({
      id: 1n,
      nombre: 'Boda',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe crear reserva de evento exitosamente', async () => {
    mockPrisma.salones.findUnique.mockResolvedValue({
      id: 1n,
      nombre: 'Salón A',
      capacidad: 100,
      estado: 'DISPONIBLE',
      precio_base: 1000000,
    });
    mockPrisma.reservas_evento.count.mockResolvedValue(0);
    mockEventRepository.createEventBooking.mockResolvedValue({ id: 1n });

    const result = await useCase.execute(1n, {
      salon_id: 1n,
      tipo_evento_id: 1n,
      fecha: new Date('2026-08-15'),
      hora_inicio: new Date('2026-08-15T09:00:00'),
      hora_fin: new Date('2026-08-15T17:00:00'),
      cantidad_personas: 80,
    });

    expect(result).toHaveProperty('id', 1n);
    expect(result).toHaveProperty('anticipo');
  });

  it('debe lanzar NotFoundException si salón no existe', async () => {
    mockPrisma.salones.findUnique.mockResolvedValue(null);

    await expect(
      useCase.execute(1n, {
        salon_id: 99n,
        tipo_evento_id: 1n,
        fecha: new Date('2026-08-15'),
        hora_inicio: new Date('2026-08-15T09:00:00'),
        hora_fin: new Date('2026-08-15T17:00:00'),
        cantidad_personas: 80,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('debe lanzar ConflictException si salón no está disponible', async () => {
    mockPrisma.salones.findUnique.mockResolvedValue({
      id: 1n,
      nombre: 'Salón A',
      capacidad: 100,
      estado: 'OCUPADO',
      precio_base: 1000000,
    });

    await expect(
      useCase.execute(1n, {
        salon_id: 1n,
        tipo_evento_id: 1n,
        fecha: new Date('2026-08-15'),
        hora_inicio: new Date('2026-08-15T09:00:00'),
        hora_fin: new Date('2026-08-15T17:00:00'),
        cantidad_personas: 80,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('debe lanzar ConflictException si excede capacidad', async () => {
    mockPrisma.salones.findUnique.mockResolvedValue({
      id: 1n,
      nombre: 'Salón A',
      capacidad: 50,
      estado: 'DISPONIBLE',
      precio_base: 1000000,
    });

    await expect(
      useCase.execute(1n, {
        salon_id: 1n,
        tipo_evento_id: 1n,
        fecha: new Date('2026-08-15'),
        hora_inicio: new Date('2026-08-15T09:00:00'),
        hora_fin: new Date('2026-08-15T17:00:00'),
        cantidad_personas: 80,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('debe lanzar ConflictException si hay conflicto de horario', async () => {
    mockPrisma.salones.findUnique.mockResolvedValue({
      id: 1n,
      nombre: 'Salón A',
      capacidad: 100,
      estado: 'DISPONIBLE',
      precio_base: 1000000,
    });
    mockPrisma.reservas_evento.count.mockResolvedValue(1);

    await expect(
      useCase.execute(1n, {
        salon_id: 1n,
        tipo_evento_id: 1n,
        fecha: new Date('2026-08-15'),
        hora_inicio: new Date('2026-08-15T09:00:00'),
        hora_fin: new Date('2026-08-15T17:00:00'),
        cantidad_personas: 80,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('debe calcular anticipo automático como 30% del precio_base', async () => {
    mockPrisma.salones.findUnique.mockResolvedValue({
      id: 1n,
      nombre: 'Salón A',
      capacidad: 100,
      estado: 'DISPONIBLE',
      precio_base: 1000000,
    });
    mockPrisma.reservas_evento.count.mockResolvedValue(0);
    mockEventRepository.createEventBooking.mockResolvedValue({ id: 1n });

    await useCase.execute(1n, {
      salon_id: 1n,
      tipo_evento_id: 1n,
      fecha: new Date('2026-08-15'),
      hora_inicio: new Date('2026-08-15T09:00:00'),
      hora_fin: new Date('2026-08-15T17:00:00'),
      cantidad_personas: 80,
    });

    const callArgs = mockEventRepository.createEventBooking.mock.calls[0][0];
    expect(callArgs.anticipo).toBe(300000);
  });

  it('debe usar anticipo proporcionado si se envía', async () => {
    mockPrisma.salones.findUnique.mockResolvedValue({
      id: 1n,
      nombre: 'Salón A',
      capacidad: 100,
      estado: 'DISPONIBLE',
      precio_base: 1000000,
    });
    mockPrisma.reservas_evento.count.mockResolvedValue(0);
    mockEventRepository.createEventBooking.mockResolvedValue({ id: 1n });

    await useCase.execute(1n, {
      salon_id: 1n,
      tipo_evento_id: 1n,
      fecha: new Date('2026-08-15'),
      hora_inicio: new Date('2026-08-15T09:00:00'),
      hora_fin: new Date('2026-08-15T17:00:00'),
      cantidad_personas: 80,
      anticipo: 500000,
    });

    const lastCall = mockEventRepository.createEventBooking.mock.calls.at(-1);
    expect(lastCall?.[0].anticipo).toBe(500000);
  });

  it('debe notificar por correo la reserva de salón', async () => {
    mockPrisma.salones.findUnique.mockResolvedValue({
      id: 1n,
      nombre: 'Salón A',
      capacidad: 100,
      estado: 'DISPONIBLE',
      precio_base: 1000000,
    });
    mockPrisma.reservas_evento.count.mockResolvedValue(0);
    mockEventRepository.createEventBooking.mockResolvedValue({ id: 77n });

    await useCase.execute(1n, {
      salon_id: 1n,
      tipo_evento_id: 1n,
      fecha: new Date('2026-08-15'),
      hora_inicio: new Date('2026-08-15T09:00:00'),
      hora_fin: new Date('2026-08-15T17:00:00'),
      cantidad_personas: 80,
    });

    expect(mockEmailSender.sendBookingConfirmation).toHaveBeenCalledWith(
      'event-booking',
      expect.objectContaining({
        correo: 'juan@test.com',
        reserva_id: 77n,
        personas: 80,
      }),
    );
  });
});

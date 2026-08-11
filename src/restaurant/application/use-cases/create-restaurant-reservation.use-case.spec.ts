import { ConflictException, NotFoundException } from '@nestjs/common';
import { CreateRestaurantReservationUseCase } from './create-restaurant-reservation.use-case';

const mockRestaurantRepository = {
  createReservation: jest.fn(),
} as any;

const mockPrisma = {
  mesas: {
    findUnique: jest.fn(),
  },
  reservas_restaurante: {
    findFirst: jest.fn(),
  },
} as any;

describe('CreateRestaurantReservationUseCase', () => {
  let useCase: CreateRestaurantReservationUseCase;

  beforeEach(() => {
    useCase = new CreateRestaurantReservationUseCase(
      mockRestaurantRepository,
      mockPrisma,
    );
  });

  it('debe crear reserva exitosamente', async () => {
    mockPrisma.mesas.findUnique.mockResolvedValue({
      id: 1n,
      numero: 'Mesa 1',
      capacidad: 4,
      estado: 'LIBRE',
    });
    mockPrisma.reservas_restaurante.findFirst.mockResolvedValue(null);
    mockRestaurantRepository.createReservation.mockResolvedValue({ id: 1n });

    const result = await useCase.execute(1n, {
      mesa_id: 1n,
      fecha: new Date('2026-08-01'),
      hora: new Date('2026-08-01T19:00:00'),
      cantidad_personas: 4,
    });

    expect(result).toEqual({ id: 1n });
  });

  it('debe lanzar NotFoundException si mesa no existe', async () => {
    mockPrisma.mesas.findUnique.mockResolvedValue(null);

    await expect(
      useCase.execute(1n, {
        mesa_id: 99n,
        fecha: new Date('2026-08-01'),
        hora: new Date('2026-08-01T19:00:00'),
        cantidad_personas: 4,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('debe lanzar ConflictException si mesa no está libre', async () => {
    mockPrisma.mesas.findUnique.mockResolvedValue({
      id: 1n,
      numero: 'Mesa 1',
      capacidad: 4,
      estado: 'OCUPADA',
    });

    await expect(
      useCase.execute(1n, {
        mesa_id: 1n,
        fecha: new Date('2026-08-01'),
        hora: new Date('2026-08-01T19:00:00'),
        cantidad_personas: 4,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('debe lanzar ConflictException si excede capacidad', async () => {
    mockPrisma.mesas.findUnique.mockResolvedValue({
      id: 1n,
      numero: 'Mesa 1',
      capacidad: 2,
      estado: 'LIBRE',
    });

    await expect(
      useCase.execute(1n, {
        mesa_id: 1n,
        fecha: new Date('2026-08-01'),
        hora: new Date('2026-08-01T19:00:00'),
        cantidad_personas: 6,
      }),
    ).rejects.toThrow(ConflictException);
  });
});

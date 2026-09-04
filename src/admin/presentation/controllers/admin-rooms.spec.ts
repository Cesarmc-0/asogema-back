import { BadRequestException } from '@nestjs/common';
import { AdminController } from './admin.controller';

const FAKE_STORAGE = { upload: jest.fn() } as any;

function buildMocks() {
  return {
    habitaciones: {
      findMany: jest.fn(),
    },
    reservas_hotel: {
      findMany: jest.fn(),
    },
    imagenes: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  } as any;
}

describe('AdminController - GET /admin/rooms?fecha', () => {
  let prisma: ReturnType<typeof buildMocks>;
  let controller: AdminController;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = buildMocks();
    prisma.imagenes.findMany.mockResolvedValue([]);
    controller = new AdminController(prisma, FAKE_STORAGE);
  });

  const mockRooms = () => [
    { id: 1n, numero: '101' },
    { id: 2n, numero: '102' },
  ];

  it('sin fecha no consulta reservas ni agrega disponible (compatible)', async () => {
    prisma.habitaciones.findMany.mockResolvedValue(mockRooms());

    const result = (await controller.getRooms()) as any;

    expect(prisma.reservas_hotel.findMany).not.toHaveBeenCalled();
    expect(result).toHaveLength(2);
    expect(result[0]).not.toHaveProperty('disponible');
  });

  it('con fecha válida marca disponible:false la ocupada y true la libre', async () => {
    prisma.habitaciones.findMany.mockResolvedValue(mockRooms());
    prisma.reservas_hotel.findMany.mockResolvedValue([{ habitacion_id: 1n }]);

    const result = (await controller.getRooms(
      undefined,
      undefined,
      undefined,
      '2026-09-10',
    )) as any;

    expect(prisma.reservas_hotel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          estado: { notIn: ['CANCELADA'] },
        }),
        select: { habitacion_id: true },
      }),
    );
    expect(result.find((r) => r.numero === '101').disponible).toBe(false);
    expect(result.find((r) => r.numero === '102').disponible).toBe(true);
  });

  it('lanza 400 si la fecha no tiene formato YYYY-MM-DD', async () => {
    await expect(
      controller.getRooms(undefined, undefined, undefined, '10-09-2026'),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.habitaciones.findMany).not.toHaveBeenCalled();
  });
});

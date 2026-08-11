import { GetAvailableTablesUseCase } from './get-available-tables.use-case';

const mockPrisma = {
  mesas: {
    findMany: jest.fn(),
  },
} as any;

describe('GetAvailableTablesUseCase', () => {
  let useCase: GetAvailableTablesUseCase;

  beforeEach(() => {
    useCase = new GetAvailableTablesUseCase(mockPrisma);
  });

  it('debe retornar mesas disponibles sin conflictos', async () => {
    const mockMesas = [
      {
        id: 1n,
        numero: 'Mesa 1',
        capacidad: 4,
        estado: 'LIBRE',
        reservas_restaurante: [],
      },
    ];
    mockPrisma.mesas.findMany.mockResolvedValue(mockMesas);

    const result = await useCase.execute({
      fecha: new Date('2026-08-01'),
      hora: new Date('2026-08-01T19:00:00'),
      capacidad_min: 2,
    });

    expect(result).toEqual(mockMesas);
  });

  it('debe filtrar por capacidad mínima', async () => {
    const mockMesas = [
      {
        id: 1n,
        numero: 'Mesa 1',
        capacidad: 2,
        estado: 'LIBRE',
        reservas_restaurante: [],
      },
      {
        id: 2n,
        numero: 'Mesa 2',
        capacidad: 6,
        estado: 'LIBRE',
        reservas_restaurante: [],
      },
    ];
    mockPrisma.mesas.findMany.mockResolvedValue(mockMesas);

    const result = await useCase.execute({
      fecha: new Date('2026-08-01'),
      hora: new Date('2026-08-01T19:00:00'),
      capacidad_min: 4,
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2n);
  });
});

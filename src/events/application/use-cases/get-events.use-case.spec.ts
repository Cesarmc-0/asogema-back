import { GetEventsUseCase } from './get-events.use-case';

const mockPrisma = {
  salones: {
    findMany: jest.fn(),
  },
  tipos_evento: {
    findMany: jest.fn(),
  },
  imagenes: {
    findMany: jest.fn(),
  },
} as any;

describe('GetEventsUseCase', () => {
  let useCase: GetEventsUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetEventsUseCase(mockPrisma);
  });

  it('debe retornar salones y tipos de evento', async () => {
    const mockSalones = [
      { id: 1n, nombre: 'Salón A', capacidad: 100, estado: 'DISPONIBLE' },
    ];
    const mockTipos = [
      { id: 1n, nombre: 'Bodas', estado: true },
      { id: 2n, nombre: 'Graduaciones', estado: true },
    ];

    mockPrisma.salones.findMany.mockResolvedValue(mockSalones);
    mockPrisma.tipos_evento.findMany.mockResolvedValue(mockTipos);
    mockPrisma.imagenes.findMany.mockResolvedValue([
      {
        id: 9n,
        entidad_id: 1n,
        url: 'https://s3/x.jpg',
        es_principal: true,
        orden: 0,
      },
    ]);

    const result = await useCase.execute();

    expect(result.salones).toEqual([
      {
        ...mockSalones[0],
        imagenes: [
          { id: 9n, url: 'https://s3/x.jpg', es_principal: true, orden: 0 },
        ],
      },
    ]);
    expect(result.tipos_evento).toEqual(mockTipos);
  });

  it('debe retornar arrays vacíos si no hay datos', async () => {
    mockPrisma.salones.findMany.mockResolvedValue([]);
    mockPrisma.tipos_evento.findMany.mockResolvedValue([]);
    mockPrisma.imagenes.findMany.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result.salones).toEqual([]);
    expect(result.tipos_evento).toEqual([]);
  });
});

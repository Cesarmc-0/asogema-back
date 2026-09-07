import { GetMenuUseCase } from './get-menu.use-case';

const mockPrisma = {
  categorias_menu: {
    findMany: jest.fn(),
  },
  imagenes: {
    findMany: jest.fn(),
  },
} as any;

describe('GetMenuUseCase', () => {
  let useCase: GetMenuUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetMenuUseCase(mockPrisma);
  });

  it('debe retornar categorías con productos y su galería', async () => {
    const mockMenu = [
      {
        id: 1n,
        nombre: 'Entradas',
        productos_menu: [{ id: 1n, nombre: 'Ensalada', precio: 15000 }],
      },
    ];
    mockPrisma.categorias_menu.findMany.mockResolvedValue(mockMenu);
    mockPrisma.imagenes.findMany.mockResolvedValue([
      {
        id: 5n,
        entidad_id: 1n,
        url: 'https://s3/ensalada.jpg',
        es_principal: true,
        orden: 0,
      },
    ]);

    const result = await useCase.execute();

    expect(result).toEqual([
      {
        id: 1n,
        nombre: 'Entradas',
        productos_menu: [
          {
            id: 1n,
            nombre: 'Ensalada',
            precio: 15000,
            imagenes: [
              {
                id: 5n,
                url: 'https://s3/ensalada.jpg',
                es_principal: true,
                orden: 0,
              },
            ],
          },
        ],
      },
    ]);
  });

  it('debe retornar array vacío si no hay categorías', async () => {
    mockPrisma.categorias_menu.findMany.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result).toEqual([]);
  });
});

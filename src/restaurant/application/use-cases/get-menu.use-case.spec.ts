import { GetMenuUseCase } from './get-menu.use-case';

const mockPrisma = {
  categorias_menu: {
    findMany: jest.fn(),
  },
} as any;

describe('GetMenuUseCase', () => {
  let useCase: GetMenuUseCase;

  beforeEach(() => {
    useCase = new GetMenuUseCase(mockPrisma);
  });

  it('debe retornar categorías con productos', async () => {
    const mockMenu = [
      {
        id: 1n,
        nombre: 'Entradas',
        productos_menu: [{ id: 1n, nombre: 'Ensalada', precio: 15000 }],
      },
    ];
    mockPrisma.categorias_menu.findMany.mockResolvedValue(mockMenu);

    const result = await useCase.execute();

    expect(result).toEqual(mockMenu);
  });

  it('debe retornar array vacío si no hay categorías', async () => {
    mockPrisma.categorias_menu.findMany.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result).toEqual([]);
  });
});

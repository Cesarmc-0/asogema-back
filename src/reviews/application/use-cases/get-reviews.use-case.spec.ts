import { GetReviewsUseCase } from './get-reviews.use-case';

const mockRepository = {
  findActiveByService: jest.fn(),
  create: jest.fn(),
};

describe('GetReviewsUseCase', () => {
  let useCase: GetReviewsUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetReviewsUseCase(mockRepository);
  });

  it('debe retornar reseñas mapeadas con el autor completo', async () => {
    mockRepository.findActiveByService.mockResolvedValue([
      {
        id: 1n,
        usuario_id: 10n,
        tipo_servicio: 'hotel',
        calificacion: 5,
        texto: 'Excelente experiencia',
        fecha_creacion: new Date('2026-06-15'),
        activo: true,
        usuarios: { nombre: 'María', apellido: 'García' },
      },
    ]);

    const result = await useCase.execute('hotel');

    expect(mockRepository.findActiveByService).toHaveBeenCalledWith('hotel');
    expect(result).toEqual([
      {
        id: 1n,
        author: 'María García',
        rating: 5,
        text: 'Excelente experiencia',
        date: '2026-06-15',
      },
    ]);
  });

  it('debe retornar array vacío si no hay reseñas', async () => {
    mockRepository.findActiveByService.mockResolvedValue([]);

    const result = await useCase.execute('events');

    expect(result).toEqual([]);
  });
});

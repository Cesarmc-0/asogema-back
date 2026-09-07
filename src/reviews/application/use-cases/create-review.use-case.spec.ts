import { CreateReviewUseCase } from './create-review.use-case';

const mockRepository = {
  findActiveByService: jest.fn(),
  create: jest.fn(),
};

describe('CreateReviewUseCase', () => {
  let useCase: CreateReviewUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateReviewUseCase(mockRepository);
  });

  it('debe crear una reseña con el usuario autenticado', async () => {
    mockRepository.create.mockResolvedValue({
      id: 7n,
      usuario_id: 10n,
      tipo_servicio: 'hotel',
      calificacion: 4,
      texto: 'Muy buen servicio',
      fecha_creacion: new Date('2026-09-05'),
      activo: true,
      usuarios: { nombre: 'Carlos', apellido: 'Mendoza' },
    });

    const result = await useCase.execute(10n, {
      tipo_servicio: 'hotel',
      calificacion: 4,
      texto: 'Muy buen servicio',
    });

    expect(mockRepository.create).toHaveBeenCalledWith({
      usuario_id: 10n,
      tipo_servicio: 'hotel',
      calificacion: 4,
      texto: 'Muy buen servicio',
    });
    expect(result).toEqual({
      id: 7n,
      author: 'Carlos Mendoza',
      rating: 4,
      text: 'Muy buen servicio',
      date: '2026-09-05',
    });
  });
});

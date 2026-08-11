import { NotFoundException } from '@nestjs/common';
import { UpdateProfileUseCase } from './update-profile.use-case';

const mockAuthRepository = {
  findById: jest.fn(),
  update: jest.fn(),
} as any;

describe('UpdateProfileUseCase', () => {
  let useCase: UpdateProfileUseCase;

  beforeEach(() => {
    useCase = new UpdateProfileUseCase(mockAuthRepository);
  });

  it('debe actualizar perfil exitosamente', async () => {
    mockAuthRepository.findById.mockResolvedValue({
      id: 1n,
      nombre: 'Carlos',
      apellido: 'Martínez',
      correo: 'test@test.com',
    });
    mockAuthRepository.update.mockResolvedValue({
      id: 1n,
      nombre: 'Carlos',
      apellido: 'Pérez',
      correo: 'test@test.com',
    });

    const result = await useCase.execute(1n, {
      apellido: 'Pérez',
    });

    expect(result.apellido).toBe('Pérez');
    expect(mockAuthRepository.update).toHaveBeenCalledWith(1n, {
      apellido: 'Pérez',
    });
  });

  it('debe lanzar NotFoundException si usuario no existe', async () => {
    mockAuthRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(99n, { nombre: 'Nuevo' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('debe permitir actualizar múltiples campos', async () => {
    mockAuthRepository.findById.mockResolvedValue({
      id: 1n,
      nombre: 'Carlos',
      apellido: 'Martínez',
      correo: 'test@test.com',
      telefono: '3001112233',
    });
    mockAuthRepository.update.mockResolvedValue({
      id: 1n,
      nombre: 'Carlos',
      apellido: 'Pérez',
      correo: 'test@test.com',
      telefono: '3009998888',
    });

    await useCase.execute(1n, {
      apellido: 'Pérez',
      telefono: '3009998888',
    });

    expect(mockAuthRepository.update).toHaveBeenCalledWith(1n, {
      apellido: 'Pérez',
      telefono: '3009998888',
    });
  });
});

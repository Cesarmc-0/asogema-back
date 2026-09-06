import { NotFoundException } from '@nestjs/common';
import { GetProfileUseCase } from './get-profile.use-case';

const mockAuthRepository = {
  findById: jest.fn(),
} as any;

describe('GetProfileUseCase', () => {
  let useCase: GetProfileUseCase;

  beforeEach(() => {
    useCase = new GetProfileUseCase(mockAuthRepository);
    jest.clearAllMocks();
  });

  it('debe devolver el perfil completo sin password_hash', async () => {
    mockAuthRepository.findById.mockResolvedValue({
      id: 1n,
      nombre: 'Ana',
      apellido: 'López',
      correo: 'ana@test.com',
      telefono: '3001112233',
      direccion: 'Calle 1',
      fecha_nacimiento: new Date('1990-01-01'),
      correo_verificado: true,
      password_hash: 'hash_secreto',
      rol_id: 2n,
      roles: { nombre: 'Cliente' },
    });

    const result = await useCase.execute(1n);

    expect(mockAuthRepository.findById).toHaveBeenCalledWith(1n);
    expect(result).toEqual({
      id: 1n,
      nombre: 'Ana',
      apellido: 'López',
      correo: 'ana@test.com',
      telefono: '3001112233',
      direccion: 'Calle 1',
      fecha_nacimiento: new Date('1990-01-01'),
      correo_verificado: true,
      rol_id: 2,
      rol_nombre: 'Cliente',
    });
    expect(result).not.toHaveProperty('password_hash');
  });

  it('debe lanzar NotFoundException si el usuario no existe', async () => {
    mockAuthRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(99n)).rejects.toThrow(NotFoundException);
  });
});

import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ChangePasswordUseCase } from './change-password.use-case';

const mockAuthRepository = {
  findById: jest.fn(),
} as any;

const mockPrisma = {
  usuarios: {
    update: jest.fn(),
  },
} as any;

describe('ChangePasswordUseCase', () => {
  let useCase: ChangePasswordUseCase;

  beforeEach(() => {
    useCase = new ChangePasswordUseCase(mockAuthRepository, mockPrisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe cambiar contraseña exitosamente', async () => {
    mockAuthRepository.findById.mockResolvedValue({
      id: 1n,
      correo: 'test@test.com',
      password_hash: 'hashed_old_password',
    });

    const mockBcrypt = jest.requireActual('bcrypt');
    const compareSpy = jest
      .spyOn(mockBcrypt, 'compare')
      .mockResolvedValue(true);
    const hashSpy = jest
      .spyOn(mockBcrypt, 'hash')
      .mockResolvedValue('hashed_new_password');

    mockPrisma.usuarios.update.mockResolvedValue({ id: 1n });

    const result = await useCase.execute(1n, {
      current_password: 'oldPass123',
      new_password: 'newPass456',
    });

    expect(compareSpy).toHaveBeenCalledWith(
      'oldPass123',
      'hashed_old_password',
    );
    expect(hashSpy).toHaveBeenCalledWith('newPass456', 10);
    expect(mockPrisma.usuarios.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1n },
      }),
    );

    compareSpy.mockRestore();
    hashSpy.mockRestore();
  });

  it('debe lanzar NotFoundException si usuario no existe', async () => {
    mockAuthRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute(99n, {
        current_password: 'oldPass',
        new_password: 'newPass',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('debe lanzar UnauthorizedException si contraseña actual es incorrecta', async () => {
    mockAuthRepository.findById.mockResolvedValue({
      id: 1n,
      correo: 'test@test.com',
      password_hash: 'hashed_old_password',
    });

    const mockBcrypt = jest.requireActual('bcrypt');
    const compareSpy = jest
      .spyOn(mockBcrypt, 'compare')
      .mockResolvedValue(false);

    await expect(
      useCase.execute(1n, {
        current_password: 'wrongPass',
        new_password: 'newPass',
      }),
    ).rejects.toThrow(UnauthorizedException);

    compareSpy.mockRestore();
  });
});

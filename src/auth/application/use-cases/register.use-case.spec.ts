jest.mock('bcrypt');
import { RegisterUseCase } from './register.use-case';
import { AuthRepository } from '../../../auth/domain/repositories/auth.repository.interface';
import { ConflictException } from '@nestjs/common';
import { RegisterDto } from '../../../auth/presentation/dto/register.dto';
import * as bcrypt from 'bcrypt';

const mockUser = {
  id: 2n,
  correo: 'nuevo@test.com',
  nombre: 'Nuevo',
  apellido: 'Usuario',
  numero_documento: '12345678',
  tipo_documento_id: 1,
  telefono: '3001234567',
  password_hash: 'hashed_password',
  rol_id: 5,
  estado: true,
};

const mockAuthRepository = {
  findByEmail: () => Promise.resolve(null),
  create: () => Promise.resolve(mockUser),
} as unknown as AuthRepository;

describe('RegisterUseCase', () => {
  let useCase: RegisterUseCase;

  beforeEach(() => {
    useCase = new RegisterUseCase(mockAuthRepository);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
  });

  it('registro exitoso: devuelve usuario creado', async () => {
    const dto: RegisterDto = {
      nombre: 'Nuevo',
      apellido: 'Usuario',
      tipo_documento_id: 1,
      numero_documento: '12345678',
      correo: 'nuevo@test.com',
      password: '123456',
      telefono: '3001234567',
    };

    const result = await useCase.execute(dto);

    expect(result).toEqual({
      id: 2n,
      nombre: 'Nuevo',
      apellido: 'Usuario',
      correo: 'nuevo@test.com',
      numero_documento: '12345678',
      tipo_documento_id: 1,
      telefono: '3001234567',
      password_hash: 'hashed_password',
      rol_id: 5,
      estado: true,
    });
  });

  it('correo duplicado: lanza ConflictException', async () => {
    mockAuthRepository.findByEmail = () => Promise.resolve(mockUser);

    const dto: RegisterDto = {
      nombre: 'Otro',
      apellido: 'Usuario',
      tipo_documento_id: 1,
      numero_documento: '87654321',
      correo: 'existente@test.com',
      password: '123456',
      telefono: '3007654321',
    };

    await expect(useCase.execute(dto)).rejects.toThrow(ConflictException);
  });

  it('hashea la contraseña con bcrypt antes de crear', async () => {
    const dto: RegisterDto = {
      nombre: 'Nuevo',
      apellido: 'Usuario',
      tipo_documento_id: 1,
      numero_documento: '12345678',
      correo: 'nuevo@test.com',
      password: 'micontraseña',
      telefono: '3001234567',
    };

    mockAuthRepository.findByEmail = () => Promise.resolve(null);

    await useCase.execute(dto);

    expect(bcrypt.hash).toHaveBeenCalledWith('micontraseña', 10);
  });
});

jest.mock('bcrypt');
import { RegisterUseCase } from './register.use-case';
import { AuthRepository } from '../../../auth/domain/repositories/auth.repository.interface';
import { PrismaService } from '../../../infrastructure/persistence/postgres/prisma.service';
import { EmailSender } from '../../../infrastructure/mail/domain/email-sender.interface';
import { RegisterDto } from '../../../auth/presentation/dto/register.dto';
import { AppException } from '../../../common/errors';
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
  findByDocument: () => Promise.resolve(null),
  create: () => Promise.resolve(mockUser),
} as unknown as AuthRepository;

const mockPrismaService = {
  roles: {
    findFirst: jest.fn(),
  },
} as unknown as PrismaService;

const mockEmailVerification = {
  generateCode: jest.fn(),
} as any;

const mockEmailSender = {
  sendWelcomeVerification: jest.fn(),
} as unknown as EmailSender;

describe('RegisterUseCase', () => {
  let useCase: RegisterUseCase;

  beforeEach(() => {
    (mockAuthRepository as any).findByEmail = () => Promise.resolve(null);
    (mockAuthRepository as any).findByDocument = () => Promise.resolve(null);
    useCase = new RegisterUseCase(
      mockAuthRepository,
      mockPrismaService,
      mockEmailVerification,
      mockEmailSender,
    );
    (mockPrismaService.roles.findFirst as jest.Mock).mockResolvedValue({
      id: 2n,
      nombre: 'Cliente',
    });
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
    mockEmailVerification.generateCode.mockResolvedValue('123456');
    (mockEmailSender.sendWelcomeVerification as jest.Mock).mockResolvedValue(
      undefined,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
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

  it('correo duplicado: lanza AUTH_EMAIL_ALREADY_EXISTS', async () => {
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

    await expect(useCase.execute(dto)).rejects.toThrow(AppException);
    await expect(useCase.execute(dto)).rejects.toMatchObject({
      payload: { code: 'AUTH_EMAIL_ALREADY_EXISTS' },
    });
  });

  it('documento de identidad duplicado: lanza AUTH_DOCUMENT_ALREADY_EXISTS', async () => {
    mockAuthRepository.findByDocument = () => Promise.resolve(mockUser);

    const dto: RegisterDto = {
      nombre: 'Otro',
      apellido: 'Usuario',
      tipo_documento_id: 1,
      numero_documento: '12345678',
      correo: 'cual@test.com',
      password: '123456',
      telefono: '3007654321',
    };

    await expect(useCase.execute(dto)).rejects.toThrow(AppException);
    await expect(useCase.execute(dto)).rejects.toMatchObject({
      payload: { code: 'AUTH_DOCUMENT_ALREADY_EXISTS' },
    });
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

  it('genera código de verificación y envía correo de bienvenida', async () => {
    const dto: RegisterDto = {
      nombre: 'Nuevo',
      apellido: 'Usuario',
      tipo_documento_id: 1,
      numero_documento: '12345678',
      correo: 'nuevo@test.com',
      password: '123456',
      telefono: '3001234567',
    };

    await useCase.execute(dto);

    expect(mockEmailVerification.generateCode).toHaveBeenCalledWith(
      'nuevo@test.com',
    );
    expect(mockEmailSender.sendWelcomeVerification).toHaveBeenCalledWith({
      nombre: 'Nuevo Usuario',
      correo: 'nuevo@test.com',
      codigo: '123456',
    });
  });

  it('el registro no falla si el envío de correo falla', async () => {
    mockEmailVerification.generateCode.mockRejectedValue(
      new Error('Redis caído'),
    );

    const dto: RegisterDto = {
      nombre: 'Nuevo',
      apellido: 'Usuario',
      tipo_documento_id: 1,
      numero_documento: '12345678',
      correo: 'nuevo@test.com',
      password: '123456',
      telefono: '3001234567',
    };

    await expect(useCase.execute(dto)).resolves.toEqual(mockUser);
  });
});

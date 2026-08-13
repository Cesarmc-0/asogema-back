import { createHash } from 'crypto';
import { EmailVerificationService } from './email-verification.service';
import { RedisService } from '../../../infrastructure/persistence/redis/redis.service';
import { PrismaService } from '../../../infrastructure/persistence/postgres/prisma.service';

const mockClient = {
  set: jest.fn(),
  del: jest.fn(),
  get: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
};

const mockRedis = {
  getClient: jest.fn().mockReturnValue(mockClient),
  get: jest.fn(),
  del: jest.fn(),
} as unknown as RedisService;

const mockPrisma = {
  usuarios: {
    update: jest.fn(),
  },
} as unknown as PrismaService;

const hash = (code: string) => createHash('sha256').update(code).digest('hex');

describe('EmailVerificationService', () => {
  let service: EmailVerificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EmailVerificationService(mockRedis, mockPrisma);
  });

  it('genera un código de 6 dígitos y lo guarda hasheado con TTL', async () => {
    mockClient.set.mockResolvedValue('OK');
    mockClient.del.mockResolvedValue(0);

    const code = await service.generateCode('correo@test.com');

    expect(code).toMatch(/^\d{6}$/);
    expect(mockClient.set).toHaveBeenCalledWith(
      'auth:verify:correo@test.com',
      hash(code),
      'EX',
      600,
    );
    expect(mockClient.del).toHaveBeenCalledWith(
      'auth:verify:attempts:correo@test.com',
    );
  });

  it('valida un código correcto', async () => {
    mockRedis.get.mockResolvedValue(hash('123456'));
    mockClient.get.mockResolvedValue(null);

    const valid = await service.validateCode('correo@test.com', '123456');

    expect(valid).toBe(true);
  });

  it('rechaza un código incorrecto e incrementa intentos', async () => {
    mockRedis.get.mockResolvedValue(hash('111111'));
    mockClient.get.mockResolvedValue(null);
    mockClient.incr.mockResolvedValue(1);
    mockClient.expire.mockResolvedValue(1);

    const valid = await service.validateCode('correo@test.com', '999999');

    expect(valid).toBe(false);
    expect(mockClient.incr).toHaveBeenCalledWith(
      'auth:verify:attempts:correo@test.com',
    );
    expect(mockClient.expire).toHaveBeenCalledWith(
      'auth:verify:attempts:correo@test.com',
      600,
    );
  });

  it('rechaza un código expirado (sin hash almacenado)', async () => {
    mockRedis.get.mockResolvedValue(null);
    mockClient.get.mockResolvedValue(null);

    const valid = await service.validateCode('correo@test.com', '123456');

    expect(valid).toBe(false);
  });

  it('lanza error si se superan los intentos máximos', async () => {
    mockClient.get.mockResolvedValue('5');

    await expect(
      service.validateCode('correo@test.com', '123456'),
    ).rejects.toThrow('Demasiados intentos');
  });

  it('marca el usuario como verificado', async () => {
    mockPrisma.usuarios.update.mockResolvedValue({ id: 42n });

    await service.markVerified(42n);

    expect(mockPrisma.usuarios.update).toHaveBeenCalledWith({
      where: { id: 42n },
      data: { correo_verificado: true },
    });
  });
});

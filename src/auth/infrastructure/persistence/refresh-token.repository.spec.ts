import { RefreshTokenRepositoryImpl } from './refresh-token.repository';
import { RedisService } from 'src/infrastructure/persistence/redis/redis.service';

const mockRedisService = {
  set: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue(null),
  del: jest.fn().mockResolvedValue(1),
} as unknown as RedisService;

describe('RefreshTokenRepositoryImpl', () => {
  let repo: RefreshTokenRepositoryImpl;

  beforeEach(() => {
    repo = new RefreshTokenRepositoryImpl(mockRedisService);
    jest.clearAllMocks();
    (mockRedisService.get as jest.Mock).mockResolvedValue(null);
  });

  it('guarda el token con prefijo, userId y TTL', async () => {
    await repo.save('abc123', '42', 604800);

    expect(mockRedisService.set).toHaveBeenCalledWith(
      'auth:refresh:abc123',
      '42',
      604800,
    );
  });

  it('retorna el userId asociado al token', async () => {
    (mockRedisService.get as jest.Mock).mockResolvedValue('42');

    const userId = await repo.findUserIdByToken('abc123');

    expect(userId).toBe('42');
    expect(mockRedisService.get).toHaveBeenCalledWith('auth:refresh:abc123');
  });

  it('retorna null si el token no existe', async () => {
    const userId = await repo.findUserIdByToken('no_existe');

    expect(userId).toBeNull();
  });

  it('elimina el token del almacén', async () => {
    await repo.delete('abc123');

    expect(mockRedisService.del).toHaveBeenCalledWith('auth:refresh:abc123');
  });
});

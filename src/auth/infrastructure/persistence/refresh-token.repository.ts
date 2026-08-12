import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/infrastructure/persistence/redis/redis.service';
import { RefreshTokenRepository } from 'src/auth/domain/repositories/refresh-token.repository.interface';

const REFRESH_TOKEN_KEY_PREFIX = 'auth:refresh:';

@Injectable()
export class RefreshTokenRepositoryImpl implements RefreshTokenRepository {
  constructor(private readonly redis: RedisService) {}

  private buildKey(token: string): string {
    return `${REFRESH_TOKEN_KEY_PREFIX}${token}`;
  }

  async save(token: string, userId: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(this.buildKey(token), userId, ttlSeconds);
  }

  async findUserIdByToken(token: string): Promise<string | null> {
    return this.redis.get(this.buildKey(token));
  }

  async delete(token: string): Promise<void> {
    await this.redis.del(this.buildKey(token));
  }
}

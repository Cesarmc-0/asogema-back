import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomInt } from 'crypto';
import { RedisService } from 'src/infrastructure/persistence/redis/redis.service';

const CODE_TTL_SECONDS = 600;
const MAX_ATTEMPTS = 5;
const CODE_KEY_PREFIX = 'auth:recover:';
const ATTEMPTS_KEY_PREFIX = 'auth:recover:attempts:';

@Injectable()
export class PasswordRecoveryService {
  private readonly logger = new Logger(PasswordRecoveryService.name);

  constructor(private readonly redis: RedisService) {}

  async generateCode(correo: string): Promise<string> {
    const code = randomInt(100000, 1000000).toString();
    const client = this.redis.getClient();
    await client.set(
      this.codeKey(correo),
      this.hash(code),
      'EX',
      CODE_TTL_SECONDS,
    );
    await client.del(this.attemptsKey(correo));
    return code;
  }

  async validateCode(correo: string, codigo: string): Promise<boolean> {
    const client = this.redis.getClient();
    const attempts = Number((await client.get(this.attemptsKey(correo))) ?? 0);

    if (attempts >= MAX_ATTEMPTS) {
      throw new Error(
        'Demasiados intentos de recuperación. Solicita un nuevo código.',
      );
    }

    const storedHash = await this.redis.get(this.codeKey(correo));
    if (!storedHash) {
      return false;
    }

    if (storedHash !== this.hash(codigo)) {
      const incremented = await client.incr(this.attemptsKey(correo));
      if (incremented === 1) {
        await client.expire(this.attemptsKey(correo), CODE_TTL_SECONDS);
      }
      return false;
    }

    return true;
  }

  async clearCode(correo: string): Promise<void> {
    await this.redis.del([this.codeKey(correo), this.attemptsKey(correo)]);
  }

  private hash(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  private codeKey(correo: string): string {
    return `${CODE_KEY_PREFIX}${correo}`;
  }

  private attemptsKey(correo: string): string {
    return `${ATTEMPTS_KEY_PREFIX}${correo}`;
  }
}

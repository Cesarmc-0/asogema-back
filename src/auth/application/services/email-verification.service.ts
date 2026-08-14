import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomInt } from 'crypto';
import { RedisService } from 'src/infrastructure/persistence/redis/redis.service';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';

const CODE_TTL_SECONDS = 600;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const CODE_KEY_PREFIX = 'auth:verify:';
const ATTEMPTS_KEY_PREFIX = 'auth:verify:attempts:';
const RESEND_KEY_PREFIX = 'auth:verify:resend:';

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

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
        'Demasiados intentos de verificación. Solicita un nuevo código.',
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

  async markVerified(usuario_id: bigint): Promise<void> {
    try {
      await this.prisma.usuarios.update({
        where: { id: usuario_id },
        data: { correo_verificado: true },
      });
    } catch (error) {
      this.logger.error(
        `No se pudo marcar el correo como verificado (usuario ${usuario_id}): ${
          error instanceof Error ? error.message : 'error desconocido'
        }`,
      );
      throw error;
    }
  }

  async clearCode(correo: string): Promise<void> {
    await this.redis.del([this.codeKey(correo), this.attemptsKey(correo)]);
  }

  async assertResendAllowed(correo: string): Promise<void> {
    const client = this.redis.getClient();
    const ttl = await client.ttl(this.resendKey(correo));
    if (ttl > 0) {
      throw new Error(`Espera ${ttl} segundos antes de solicitar otro código`);
    }
  }

  async markResendSent(correo: string): Promise<void> {
    const client = this.redis.getClient();
    await client.set(
      this.resendKey(correo),
      '1',
      'EX',
      RESEND_COOLDOWN_SECONDS,
    );
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

  private resendKey(correo: string): string {
    return `${RESEND_KEY_PREFIX}${correo}`;
  }
}

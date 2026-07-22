import { Controller, Get } from '@nestjs/common';
import { RedisService } from '../../infrastructure/persistence/redis/redis.service';

@Controller('health')
export class HealthController {
  constructor(private readonly redisService: RedisService) {}

  @Get()
  check(): { status: string; timestamp: string; uptime: number } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('redis')
  async checkRedis(): Promise<{ status: string; redis: string }> {
    const ok = await this.redisService.ping();
    return {
      status: ok ? 'ok' : 'error',
      redis: ok ? 'PONG' : 'NO_RESPONSE',
    };
  }
}

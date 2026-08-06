import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from 'src/auth/presentation/dto/decorators/public.decorator';
import { RedisService } from '../../infrastructure/persistence/redis/redis.service';

@ApiTags('salud')
@Public()
@Controller('Health')
export class HealthController {
  constructor(private readonly redisService: RedisService) {}

  @ApiOperation({ summary: 'Estado general del servicio' })
  @ApiResponse({ status: 200, description: 'Servidor activo' })
  @Get()
  check(): { status: string; timestamp: string; uptime: number } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @ApiOperation({ summary: 'Estado de la conexión Redis' })
  @ApiResponse({ status: 200, description: 'Ping a Redis exitoso' })
  @ApiResponse({ status: 500, description: 'Redis no responde' })
  @Get('redis')
  async checkRedis(): Promise<{ status: string; redis: string }> {
    const ok = await this.redisService.ping();
    return {
      status: ok ? 'ok' : 'error',
      redis: ok ? 'PONG' : 'NO_RESPONSE',
    };
  }
}

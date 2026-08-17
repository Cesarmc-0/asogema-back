import {
  Controller,
  Post,
  Req,
  Headers,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from 'src/auth/presentation/dto/decorators/public.decorator';
import { HandleWebhookUseCase } from 'src/payments/application/use-cases/handle-webhook.use-case';
import type { Request } from 'express';

@ApiTags('webhooks')
@Controller('webhooks')
export class WompiWebhookController {
  private readonly logger = new Logger(WompiWebhookController.name);

  constructor(private readonly handleWebhookUseCase: HandleWebhookUseCase) {}

  @Public()
  @SkipThrottle()
  @Post('wompi')
  @HttpCode(200)
  @ApiOperation({ summary: 'Webhook de Wompi - eventos de transaccion' })
  async handleWompi(
    @Req() req: Request & { rawBody?: string },
    @Headers('x-event-signature') signature: string,
  ) {
    const rawBody = req.rawBody ?? JSON.stringify(req.body);

    this.logger.log('Webhook Wompi recibido');

    try {
      const result = await this.handleWebhookUseCase.execute(
        rawBody,
        signature ?? '',
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Error procesando webhook: ${error instanceof Error ? error.message : 'error desconocido'}`,
      );
      return { processed: false };
    }
  }
}

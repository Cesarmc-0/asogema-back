import {
  Controller,
  Post,
  Req,
  Headers,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from 'src/auth/presentation/dto/decorators/public.decorator';
import { HandleWebhookUseCase } from 'src/payments/application/use-cases/handle-webhook.use-case';
import type { Request } from 'express';

@ApiTags('webhooks')
@Controller('webhooks')
export class WompiWebhookController {
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
    return this.handleWebhookUseCase.execute(rawBody, signature ?? '');
  }
}

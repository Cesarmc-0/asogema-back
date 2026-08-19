import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CreatePaymentUseCase } from 'src/payments/application/use-cases/create-payment.use-case';
import { GetPaymentStatusUseCase } from 'src/payments/application/use-cases/get-payment-status.use-case';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { CurrentUser } from 'src/auth/presentation/dto/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/auth/domain/interfaces/authenticated-user.interface';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly createPaymentUseCase: CreatePaymentUseCase,
    private readonly getPaymentStatusUseCase: GetPaymentStatusUseCase,
  ) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear un pago para una reserva de evento' })
  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.createPaymentUseCase.execute(user.id, {
      reserva_id: BigInt(dto.reserva_id),
      monto: dto.monto,
      metodo_pago: dto.metodo_pago,
    });
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Consultar estado de pago de una factura' })
  @UseGuards(AuthGuard('jwt'))
  @Get('status/:factura_id')
  async getStatus(@Param('factura_id') facturaId: string) {
    return this.getPaymentStatusUseCase.execute(BigInt(facturaId));
  }
}

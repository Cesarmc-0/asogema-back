import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CrearRecargaUseCase } from 'src/wallet/application/use-cases/crear-recarga.use-case';
import { ConsultarSaldoUseCase } from 'src/wallet/application/use-cases/consultar-saldo.use-case';
import { CrearRecargaDto } from '../dto/crear-recarga.dto';
import { CurrentUser } from 'src/auth/presentation/dto/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/auth/domain/interfaces/authenticated-user.interface';
import { getClientIp } from 'src/common/http/client-ip';
import type { Request as ExpressRequest } from 'express';

@ApiTags('wallet')
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly crearRecargaUseCase: CrearRecargaUseCase,
    private readonly consultarSaldoUseCase: ConsultarSaldoUseCase,
  ) {}

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Recargar saldo vía Wompi (mín $10.000, máx $2.000.000)',
  })
  @UseGuards(AuthGuard('jwt'))
  @Post('recharges')
  async recargar(
    @Body() dto: CrearRecargaDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: ExpressRequest,
  ) {
    return this.crearRecargaUseCase.execute(BigInt(user.id), {
      monto: dto.monto,
      metodo_pago: dto.metodo_pago,
      tipo_tarjeta: dto.tipo_tarjeta,
      payment_data: dto.payment_data,
      ip: getClientIp(req),
    });
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Consultar saldo actual y historial de recargas' })
  @UseGuards(AuthGuard('jwt'))
  @Get('balance')
  async balance(@CurrentUser() user: AuthenticatedUser) {
    return this.consultarSaldoUseCase.execute(BigInt(user.id));
  }
}

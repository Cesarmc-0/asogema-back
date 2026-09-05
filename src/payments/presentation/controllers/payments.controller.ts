import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CreatePaymentUseCase } from 'src/payments/application/use-cases/create-payment.use-case';
import type { TipoReserva } from 'src/payments/domain/payment.constants';
import { GetPaymentStatusUseCase } from 'src/payments/application/use-cases/get-payment-status.use-case';
import { DescargarFacturaPdfUseCase } from 'src/payments/application/use-cases/descargar-factura-pdf.use-case';
import { VerifyPaymentUseCase } from 'src/payments/application/use-cases/verify-payment.use-case';
import { ValidarCuponUseCase } from 'src/payments/application/use-cases/validar-cupon.use-case';
import { ObtenerInstitucionesFinancierasUseCase } from 'src/payments/application/use-cases/obtener-instituciones-financieras.use-case';
import { ObtenerMisFacturasUseCase } from 'src/payments/application/use-cases/obtener-mis-facturas.use-case';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { VerifyPaymentDto } from '../dto/verify-payment.dto';
import { CurrentUser } from 'src/auth/presentation/dto/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/auth/domain/interfaces/authenticated-user.interface';
import { getClientIp } from 'src/common/http/client-ip';
import type { Request as ExpressRequest } from 'express';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly createPaymentUseCase: CreatePaymentUseCase,
    private readonly getPaymentStatusUseCase: GetPaymentStatusUseCase,
    private readonly descargarFacturaPdfUseCase: DescargarFacturaPdfUseCase,
    private readonly verifyPaymentUseCase: VerifyPaymentUseCase,
    private readonly validarCuponUseCase: ValidarCuponUseCase,
    private readonly institucionesUseCase: ObtenerInstitucionesFinancierasUseCase,
    private readonly misFacturasUseCase: ObtenerMisFacturasUseCase,
  ) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Instituciones financieras para PSE' })
  @UseGuards(AuthGuard('jwt'))
  @Get('pse/financial-institutions')
  async instituciones() {
    return this.institucionesUseCase.execute();
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Validar código de descuento (descuento en tiempo real)',
  })
  @UseGuards(AuthGuard('jwt'))
  @Get('cupones/:codigo')
  async validarCupon(
    @Param('codigo') codigo: string,
    @Query('monto') monto?: string,
  ) {
    return this.validarCuponUseCase.execute(
      codigo,
      monto ? Number(monto) : undefined,
    );
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Crear un pago (evento, hotel, restaurante o recarga)',
  })
  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: ExpressRequest,
  ) {
    return this.createPaymentUseCase.execute(BigInt(user.id), {
      reserva_id: dto.reserva_id ? BigInt(dto.reserva_id) : undefined,
      tipo_reserva: dto.tipo_reserva as TipoReserva,
      metodo_pago: dto.metodo_pago,
      tipo_tarjeta: dto.tipo_tarjeta,
      codigo_descuento: dto.codigo_descuento,
      monto: dto.monto,
      payment_data: dto.payment_data,
      ip: getClientIp(req),
    });
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verificar pago contra Wompi tras el retorno' })
  @UseGuards(AuthGuard('jwt'))
  @Post('verify')
  async verify(
    @Body() dto: VerifyPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.verifyPaymentUseCase.execute(
      dto.transaction_id,
      BigInt(user.id),
    );
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Historial de facturas del usuario autenticado' })
  @UseGuards(AuthGuard('jwt'))
  @Get('mis-facturas')
  async misFacturas(@CurrentUser() user: AuthenticatedUser) {
    return this.misFacturasUseCase.execute(BigInt(user.id));
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Consultar estado de pago de una factura' })
  @UseGuards(AuthGuard('jwt'))
  @Get('status/:factura_id')
  async getStatus(
    @Param('factura_id') facturaId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.getPaymentStatusUseCase.execute(
      BigInt(facturaId),
      BigInt(user.id),
    );
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Descargar PDF de la factura electrónica' })
  @UseGuards(AuthGuard('jwt'))
  @Get(':factura_id/pdf')
  async downloadPdf(
    @Param('factura_id') facturaId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.descargarFacturaPdfUseCase.execute(
      BigInt(facturaId),
      BigInt(user.id),
    );
  }
}

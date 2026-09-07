import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GetPedidoDetalleUseCase } from 'src/restaurant/pedidos-online/application/use-cases/get-pedido-detalle.use-case';
import {
  ActualizarEstadoPedidoUseCase,
  ESTADOS_PEDIDO,
} from 'src/restaurant/comanda/application/use-cases/actualizar-estado-pedido.use-case';
import { UpdatePedidoEstadoDto } from 'src/restaurant/comanda/presentation/dto/update-pedido-estado.dto';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/auth/presentation/dto/decorators/roles.decorator';

/**
 * Controller de comanda (Mesero / Comanda / Administrador).
 * El personal ve los detalles y actualiza el estado de los pedidos.
 */
@ApiTags('restaurant')
@Controller('restaurant')
export class ComandaController {
  constructor(
    private readonly getPedidoDetalleUseCase: GetPedidoDetalleUseCase,
    private readonly actualizarEstadoPedidoUseCase: ActualizarEstadoPedidoUseCase,
  ) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ver detalle de un pedido (Mesero/Comanda)' })
  @UseGuards(AuthGuard('jwt'))
  @Roles('Mesero', 'Comanda', 'Administrador')
  @Get('pedidos/:id')
  async getPedidoDetalle(@Param('id') id: string) {
    if (!/^\d+$/.test(id)) {
      throw new BadRequestException('id debe ser numérico');
    }
    return this.getPedidoDetalleUseCase.execute(BigInt(id));
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cambiar estado de un pedido (Mesero/Comanda/Administrador)',
  })
  @UseGuards(AuthGuard('jwt'))
  @Roles('Mesero', 'Comanda', 'Administrador')
  @Patch('pedidos/:id/estado')
  async updatePedidoEstado(
    @Param('id') id: string,
    @Body() dto: UpdatePedidoEstadoDto,
  ) {
    if (!/^\d+$/.test(id)) {
      throw new BadRequestException('id debe ser numérico');
    }
    return this.actualizarEstadoPedidoUseCase.execute(
      BigInt(id),
      dto.estado as (typeof ESTADOS_PEDIDO)[number],
    );
  }
}

import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CreatePedidoOnlineUseCase } from 'src/restaurant/pedidos-online/application/use-cases/create-pedido-online.use-case';
import { CreatePedidoOnlineDto } from '../dto/create-pedido-online.dto';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from 'src/auth/presentation/dto/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/auth/domain/interfaces/authenticated-user.interface';

/**
 * Controller de pedidos online (client-side).
 * Solo el cliente autenticado crea pedidos.
 */
@ApiTags('restaurant')
@Controller('restaurant')
export class PedidosOnlineController {
  constructor(
    private readonly createPedidoOnlineUseCase: CreatePedidoOnlineUseCase,
  ) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear un pedido online (para llevar o en mesa)' })
  @UseGuards(AuthGuard('jwt'))
  @Post('orders')
  async createPedidoOnline(
    @Body() dto: CreatePedidoOnlineDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.createPedidoOnlineUseCase.execute(
      BigInt(user.id),
      {
        items: dto.items.map((item) => ({
          producto_id: BigInt(item.producto_id),
          cantidad: item.cantidad,
        })),
        tipo: dto.tipo as 'PARA_LLEVAR' | 'EN_MESA',
      },
      user.rol_nombre,
    );
  }
}

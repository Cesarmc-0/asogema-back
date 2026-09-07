import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  Param,
  Patch,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GetMenuUseCase } from 'src/restaurant/application/use-cases/get-menu.use-case';
import { GetAvailableTablesUseCase } from 'src/restaurant/application/use-cases/get-available-tables.use-case';
import { CreateRestaurantReservationUseCase } from 'src/restaurant/application/use-cases/create-restaurant-reservation.use-case';
import { CreatePedidoOnlineUseCase } from 'src/restaurant/application/use-cases/create-pedido-online.use-case';
import { GetPedidoDetalleUseCase } from 'src/restaurant/application/use-cases/get-pedido-detalle.use-case';
import { GetMyRestaurantReservationsUseCase } from 'src/restaurant/application/use-cases/get-my-restaurant-reservations.use-case';
import {
  ActualizarEstadoPedidoUseCase,
  ESTADOS_PEDIDO,
} from 'src/restaurant/application/use-cases/actualizar-estado-pedido.use-case';
import { GetTablesDto } from '../dto/get-tables.dto';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { CreatePedidoOnlineDto } from '../dto/create-pedido-online.dto';
import { UpdatePedidoEstadoDto } from '../dto/update-pedido-estado.dto';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from 'src/auth/presentation/dto/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/auth/domain/interfaces/authenticated-user.interface';
import { Public } from 'src/auth/presentation/dto/decorators/public.decorator';
import { Roles } from 'src/auth/presentation/dto/decorators/roles.decorator';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';

@ApiTags('restaurant')
@Controller('restaurant')
export class RestaurantController {
  constructor(
    private readonly menuUseCase: GetMenuUseCase,
    private readonly availableTablesUseCase: GetAvailableTablesUseCase,
    private readonly reservationUseCase: CreateRestaurantReservationUseCase,
    private readonly createPedidoOnlineUseCase: CreatePedidoOnlineUseCase,
    private readonly getPedidoDetalleUseCase: GetPedidoDetalleUseCase,
    private readonly actualizarEstadoPedidoUseCase: ActualizarEstadoPedidoUseCase,
    private readonly getMyReservationsUseCase: GetMyRestaurantReservationsUseCase,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @ApiOperation({ summary: 'Obtener menú del restaurante' })
  @Get('menu')
  async getMenu() {
    return await this.menuUseCase.execute();
  }

  @Public()
  @ApiOperation({ summary: 'Listar mesas disponibles' })
  @Get('tables')
  async getAvailableTables(@Query() query: GetTablesDto) {
    return this.availableTablesUseCase.execute({
      fecha: new Date(query.fecha),
      hora: new Date(query.hora),
      capacidad_min: query.capacidad_min,
    });
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener mis reservas de restaurante' })
  @UseGuards(AuthGuard('jwt'))
  @Get('reservations/mine')
  async getMyReservations(@CurrentUser() user: AuthenticatedUser) {
    return this.getMyReservationsUseCase.execute(BigInt(user.id));
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancelar una reserva de restaurante' })
  @UseGuards(AuthGuard('jwt'))
  @Patch('reservations/:id/cancel')
  async cancelReservation(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!/^\d+$/.test(id)) {
      throw new BadRequestException('id debe ser numérico');
    }
    const reservaId = BigInt(id);
    const reserva = await this.prisma.reservas_restaurante.findFirst({
      where: { id: reservaId, usuario_id: BigInt(user.id) },
    });
    if (!reserva) {
      throw new BadRequestException('Reserva no encontrada');
    }
    if (!['PENDIENTE', 'CONFIRMADA'].includes(reserva.estado)) {
      throw new ForbiddenException('No se puede cancelar en este estado');
    }
    const fecha = reserva.fecha.toISOString().slice(0, 10);
    const hora = reserva.hora.toISOString().slice(11, 19);
    const fechaHora = new Date(`${fecha}T${hora}`);
    const now = new Date();
    const diffHours = (fechaHora.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (diffHours < 2) {
      throw new ForbiddenException(
        'Cancelación permitida solo con al menos 2 horas de antelación',
      );
    }
    await this.prisma.reservas_restaurante.update({
      where: { id: reservaId },
      data: { estado: 'CANCELADA' },
    });
    return { message: 'Reserva cancelada' };
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reservar una mesa' })
  @UseGuards(AuthGuard('jwt'))
  @Post('reservations')
  async createReservation(
    @Body() dto: CreateReservationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reservationUseCase.execute(user.id, {
      mesa_id: BigInt(dto.mesa_id),
      fecha: new Date(dto.fecha),
      hora: new Date(dto.hora),
      cantidad_personas: dto.cantidad_personas,
      motivo: dto.motivo,
      observaciones: dto.observaciones,
    });
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear un pedido online (para llevar o en mesa)' })
  @UseGuards(AuthGuard('jwt'))
  @Post('orders')
  async createPedidoOnline(
    @Body() dto: CreatePedidoOnlineDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.createPedidoOnlineUseCase.execute(BigInt(user.id), {
      items: dto.items.map((item) => ({
        producto_id: BigInt(item.producto_id),
        cantidad: item.cantidad,
      })),
      tipo: dto.tipo as 'PARA_LLEVAR' | 'EN_MESA',
    }, user.rol_nombre);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ver detalle de un pedido (Mesero/Administrador)' })
  @UseGuards(AuthGuard('jwt'))
  @Roles('Mesero', 'Administrador')
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

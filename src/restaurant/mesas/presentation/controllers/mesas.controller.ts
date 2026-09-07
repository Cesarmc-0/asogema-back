import {
  Controller,
  Get,
  Post,
  Patch,
  Query,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GetAvailableTablesUseCase } from 'src/restaurant/mesas/application/use-cases/get-available-tables.use-case';
import { CreateRestaurantReservationUseCase } from 'src/restaurant/mesas/application/use-cases/create-restaurant-reservation.use-case';
import { GetMyRestaurantReservationsUseCase } from 'src/restaurant/mesas/application/use-cases/get-my-restaurant-reservations.use-case';
import { GetTablesDto } from '../dto/get-tables.dto';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from 'src/auth/presentation/dto/decorators/current-user.decorator';
import { Public } from 'src/auth/presentation/dto/decorators/public.decorator';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import type { AuthenticatedUser } from 'src/auth/domain/interfaces/authenticated-user.interface';

/**
 * Controller de reservas de mesa.
 * Rutas públicas (disponibilidad) + autenticadas (crear/cancelar/listar).
 */
@ApiTags('restaurant')
@Controller('restaurant')
export class MesasController {
  constructor(
    private readonly availableTablesUseCase: GetAvailableTablesUseCase,
    private readonly reservationUseCase: CreateRestaurantReservationUseCase,
    private readonly getMyReservationsUseCase: GetMyRestaurantReservationsUseCase,
    private readonly prisma: PrismaService,
  ) {}

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
}

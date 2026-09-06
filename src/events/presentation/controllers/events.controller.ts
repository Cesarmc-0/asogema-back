import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Patch,
  Param,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GetEventsUseCase } from 'src/events/application/use-cases/get-events.use-case';
import { CreateEventBookingUseCase } from 'src/events/application/use-cases/create-event-booking.use-case';
import { GetMyEventBookingsUseCase } from 'src/events/application/use-cases/get-my-event-bookings.use-case';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import { CreateEventBookingDto } from '../dto/create-event-booking.dto';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from 'src/auth/presentation/dto/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/auth/domain/interfaces/authenticated-user.interface';
import { Public } from 'src/auth/presentation/dto/decorators/public.decorator';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsUseCase: GetEventsUseCase,
    private readonly bookingUseCase: CreateEventBookingUseCase,
    private readonly getMyBookingsUseCase: GetMyEventBookingsUseCase,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @ApiOperation({
    summary: 'Obtener salones y tipos de evento',
  })
  @Get()
  async getEvents() {
    return this.eventsUseCase.execute();
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener mis reservas de eventos' })
  @UseGuards(AuthGuard('jwt'))
  @Get('bookings/mine')
  async getMyBookings(@CurrentUser() user: AuthenticatedUser) {
    return this.getMyBookingsUseCase.execute(BigInt(user.id));
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancelar una reserva de evento' })
  @UseGuards(AuthGuard('jwt'))
  @Patch('bookings/:id/cancel')
  async cancelBooking(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!/^\d+$/.test(id)) {
      throw new BadRequestException('id debe ser numérico');
    }
    const bookingId = BigInt(id);
    const reserva = await this.prisma.reservas_evento.findFirst({
      where: { id: bookingId, usuario_id: BigInt(user.id) },
    });
    if (!reserva) {
      throw new BadRequestException('Reserva no encontrada');
    }
    if (!['PENDIENTE', 'CONFIRMADA'].includes(reserva.estado)) {
      throw new ForbiddenException('No se puede cancelar en este estado');
    }
    const fecha = new Date(reserva.fecha);
    const now = new Date();
    const diffHours = (fecha.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (diffHours < 24) {
      throw new ForbiddenException(
        'Cancelación permitida solo con al menos 24 horas de antelación',
      );
    }
    await this.prisma.reservas_evento.update({
      where: { id: bookingId },
      data: { estado: 'CANCELADA' },
    });
    return { message: 'Reserva cancelada' };
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reservar un evento' })
  @UseGuards(AuthGuard('jwt'))
  @Post('bookings')
  async createBooking(
    @Body() dto: CreateEventBookingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingUseCase.execute(user.id, {
      salon_id: BigInt(dto.salon_id),
      tipo_evento_id: BigInt(dto.tipo_evento_id),
      fecha: new Date(dto.fecha),
      hora_inicio: new Date(dto.hora_inicio),
      hora_fin: new Date(dto.hora_fin),
      cantidad_personas: dto.cantidad_personas,
      anticipo: dto.anticipo,
      observaciones: dto.observaciones,
    });
  }
}

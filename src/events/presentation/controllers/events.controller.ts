import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GetEventsUseCase } from 'src/events/application/use-cases/get-events.use-case';
import { CreateEventBookingUseCase } from 'src/events/application/use-cases/create-event-booking.use-case';
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

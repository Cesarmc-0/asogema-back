import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GetAvailableRoomsUseCase } from 'src/hotel/application/use-cases/get-available-rooms.use-case';
import { CreateHotelBookingUseCase } from 'src/hotel/application/use-cases/create-hotel-booking.use-case';
import { GetMyBookingsUseCase } from 'src/hotel/application/use-cases/get-my-bookings.use-case';
import { GetRoomsDto } from '../dto/get-rooms.dto';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from 'src/auth/presentation/dto/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/auth/domain/interfaces/authenticated-user.interface';
import { Public } from 'src/auth/presentation/dto/decorators/public.decorator';

@ApiTags('hotel')
@Controller('hotel')
export class HotelController {
  constructor(
    private readonly availableRoomsUseCase: GetAvailableRoomsUseCase,
    private readonly createBookingUseCase: CreateHotelBookingUseCase,
    private readonly myBookingsUseCase: GetMyBookingsUseCase,
  ) {}

  @Public()
  @ApiOperation({
    summary: 'Listar habitaciones disponibles',
  })
  @ApiQuery({ name: 'tipo_habitacion_id', required: false, type: Number })
  @ApiQuery({ name: 'capacidad_min', required: false, type: Number })
  @ApiQuery({ name: 'fecha_entrada', required: false, type: String })
  @ApiQuery({ name: 'fecha_salida', required: false, type: String })
  @Get('rooms')
  async getAvailableRooms(@Query() query: GetRoomsDto) {
    const fecha_entrada = query.fecha_entrada
      ? new Date(query.fecha_entrada)
      : undefined;
    const fecha_salida = query.fecha_salida
      ? new Date(query.fecha_salida)
      : undefined;

    return this.availableRoomsUseCase.execute({
      tipo_habitacion_id: query.tipo_habitacion_id
        ? BigInt(query.tipo_habitacion_id)
        : undefined,
      capacidad_min: query.capacidad_min,
      fecha_entrada,
      fecha_salida,
    });
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reservar una habitación' })
  @UseGuards(AuthGuard('jwt'))
  @Post('bookings')
  async createBooking(
    @Body() dto: CreateBookingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.createBookingUseCase.execute(user.id, {
      habitacion_id: BigInt(dto.habitacion_id),
      fecha_entrada: new Date(dto.fecha_entrada),
      fecha_salida: new Date(dto.fecha_salida),
      cantidad_huespedes: dto.cantidad_huespedes,
      total: dto.total,
      observaciones: dto.observaciones,
    });
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mis reservas de hotel' })
  @UseGuards(AuthGuard('jwt'))
  @Get('bookings/mine')
  async getMyBookings(@CurrentUser() user: AuthenticatedUser) {
    return this.myBookingsUseCase.execute(user.id);
  }
}

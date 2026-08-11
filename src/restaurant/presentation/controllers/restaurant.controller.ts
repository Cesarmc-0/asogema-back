import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GetMenuUseCase } from 'src/restaurant/application/use-cases/get-menu.use-case';
import { GetAvailableTablesUseCase } from 'src/restaurant/application/use-cases/get-available-tables.use-case';
import { CreateRestaurantReservationUseCase } from 'src/restaurant/application/use-cases/create-restaurant-reservation.use-case';
import { GetTablesDto } from '../dto/get-tables.dto';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from 'src/auth/presentation/dto/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/auth/domain/interfaces/authenticated-user.interface';
import { Public } from 'src/auth/presentation/dto/decorators/public.decorator';

@ApiTags('restaurant')
@Controller('restaurant')
export class RestaurantController {
  constructor(
    private readonly menuUseCase: GetMenuUseCase,
    private readonly availableTablesUseCase: GetAvailableTablesUseCase,
    private readonly reservationUseCase: CreateRestaurantReservationUseCase,
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
  @ApiOperation({ summary: 'Reservar una mesa' })
  @UseGuards(AuthGuard('jwt'))
  @Post('reservations')
  async createReservation(
    @Body() dto: CreateReservationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.reservationUseCase.execute(user.id, {
      mesa_id: BigInt(dto.mesa_id),
      fecha: new Date(dto.fecha),
      hora: new Date(dto.hora),
      cantidad_personas: dto.cantidad_personas,
      motivo: dto.motivo,
      observaciones: dto.observaciones,
    });
  }
}

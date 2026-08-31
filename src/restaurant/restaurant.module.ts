import { Module } from '@nestjs/common';
import { GetMenuUseCase } from 'src/restaurant/application/use-cases/get-menu.use-case';
import { GetAvailableTablesUseCase } from 'src/restaurant/application/use-cases/get-available-tables.use-case';
import { CreateRestaurantReservationUseCase } from 'src/restaurant/application/use-cases/create-restaurant-reservation.use-case';
import { CreatePedidoOnlineUseCase } from 'src/restaurant/application/use-cases/create-pedido-online.use-case';
import { GetPedidoDetalleUseCase } from 'src/restaurant/application/use-cases/get-pedido-detalle.use-case';
import { ActualizarEstadoPedidoUseCase } from 'src/restaurant/application/use-cases/actualizar-estado-pedido.use-case';
import { RestaurantRepository } from 'src/restaurant/domain/repositories/restaurant-repository.interface';
import { RestaurantRepositoryImpl } from 'src/restaurant/infrastructure/persistence/restaurant.repository';
import { RestaurantController } from 'src/restaurant/presentation/controllers/restaurant.controller';
import { PaymentsModule } from 'src/payments/payments.module';

@Module({
  imports: [PaymentsModule],
  controllers: [RestaurantController],
  providers: [
    GetMenuUseCase,
    GetAvailableTablesUseCase,
    CreateRestaurantReservationUseCase,
    CreatePedidoOnlineUseCase,
    GetPedidoDetalleUseCase,
    ActualizarEstadoPedidoUseCase,
    { provide: RestaurantRepository, useClass: RestaurantRepositoryImpl },
  ],
})
export class RestaurantModule {}

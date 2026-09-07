import { Module } from '@nestjs/common';
import { GetMenuUseCase } from 'src/restaurant/menu/application/use-cases/get-menu.use-case';
import { GetAvailableTablesUseCase } from 'src/restaurant/mesas/application/use-cases/get-available-tables.use-case';
import { CreateRestaurantReservationUseCase } from 'src/restaurant/mesas/application/use-cases/create-restaurant-reservation.use-case';
import { CreatePedidoOnlineUseCase } from 'src/restaurant/pedidos-online/application/use-cases/create-pedido-online.use-case';
import { GetPedidoDetalleUseCase } from 'src/restaurant/pedidos-online/application/use-cases/get-pedido-detalle.use-case';
import { ActualizarEstadoPedidoUseCase } from 'src/restaurant/comanda/application/use-cases/actualizar-estado-pedido.use-case';
import { GetMyRestaurantReservationsUseCase } from 'src/restaurant/mesas/application/use-cases/get-my-restaurant-reservations.use-case';
import { RestaurantRepositoryImpl } from 'src/restaurant/infrastructure/persistence/restaurant.repository';
import { MenuController } from 'src/restaurant/menu/presentation/controllers/menu.controller';
import { MesasController } from 'src/restaurant/mesas/presentation/controllers/mesas.controller';
import { PedidosOnlineController } from 'src/restaurant/pedidos-online/presentation/controllers/pedidos-online.controller';
import { ComandaController } from 'src/restaurant/comanda/presentation/controllers/comanda.controller';
import { ComandaGateway } from 'src/restaurant/comanda/infrastructure/gateways/comanda.gateway';
import { RestaurantRepository } from './domain/repositories/restaurant-repository.interface';
import {
  COMANDA_QUEUE,
  ComandaQueueService,
} from 'src/restaurant/comanda/application/comanda-queue.service';
import { ComandaQueueProcessor } from 'src/restaurant/comanda/application/comanda-queue.processor';

@Module({
  controllers: [
    MenuController,
    MesasController,
    PedidosOnlineController,
    ComandaController,
  ],
  providers: [
    GetMenuUseCase,
    GetAvailableTablesUseCase,
    CreateRestaurantReservationUseCase,
    CreatePedidoOnlineUseCase,
    GetPedidoDetalleUseCase,
    ActualizarEstadoPedidoUseCase,
    GetMyRestaurantReservationsUseCase,
    ComandaGateway,
    {
      provide: RestaurantRepository,
      useClass: RestaurantRepositoryImpl,
    },
    {
      provide: COMANDA_QUEUE,
      useClass: ComandaQueueService,
    },
    ComandaQueueProcessor,
  ],
})
export class RestaurantModule {}

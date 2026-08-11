import { Module } from '@nestjs/common';
import { ListarTiposHabitacionUseCase } from './application/use-cases/listar-tipos-habitacion.use-case';
import { HabitacionResolver } from './presentation/resolvers/habitacion.resolver';
import { TIPO_HABITACION_REPOSITORY } from './domain/tipo-habitacion.repository.interface';
import { TipoHabitacionRepositoryImpl } from './infrastructure/persistence/tipo-habitacion.repository';

@Module({
  providers: [
    {
      provide: TIPO_HABITACION_REPOSITORY,
      useClass: TipoHabitacionRepositoryImpl,
    },
    ListarTiposHabitacionUseCase,
    HabitacionResolver,
  ],
})
export class HotelModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Configuracion, ConfiguracionSchema } from './infrastructure/persistence/configuracion.schema';
import { ConfiguracionRepository } from './infrastructure/persistence/configuracion.repository';
import {
  CONFIGURACION_REPOSITORY,
} from './domain/repositories/configuracion.repository.interface';
import { ListarConfiguracionesUseCase } from './application/use-cases/listar-configuraciones.use-case';
import { ConfiguracionesController } from './presentation/controllers/configuraciones.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Configuracion.name, schema: ConfiguracionSchema },
    ]),
  ],
  controllers: [ConfiguracionesController],
  providers: [
    {
      provide: CONFIGURACION_REPOSITORY,
      useClass: ConfiguracionRepository,
    },
    ListarConfiguracionesUseCase,
  ],
})
export class ConfiguracionesModule {}

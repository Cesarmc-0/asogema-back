import { Resolver, Query } from '@nestjs/graphql';
import { SkipThrottle } from '@nestjs/throttler';
import { ListarTiposHabitacionUseCase } from '../../application/use-cases/listar-tipos-habitacion.use-case';
import { TipoHabitacionDTO } from '../dto/tipo-habitacion.dto';

@Resolver(() => TipoHabitacionDTO)
@SkipThrottle()
export class HabitacionResolver {
  constructor(private readonly listarUseCase: ListarTiposHabitacionUseCase) {}

  @Query(() => [TipoHabitacionDTO], { name: 'tiposHabitacion' })
  async listar(): Promise<TipoHabitacionDTO[]> {
    const entities = await this.listarUseCase.execute();
    return entities.map((entity) => TipoHabitacionDTO.fromDomain(entity));
  }
}

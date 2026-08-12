import { Injectable, Inject } from '@nestjs/common';
import {
  TipoHabitacionRepository,
  TIPO_HABITACION_REPOSITORY,
} from '../../domain/tipo-habitacion.repository.interface';

@Injectable()
export class ListarTiposHabitacionUseCase {
  constructor(
    @Inject(TIPO_HABITACION_REPOSITORY)
    private readonly repository: TipoHabitacionRepository,
  ) {}

  async execute() {
    return this.repository.findAll();
  }
}

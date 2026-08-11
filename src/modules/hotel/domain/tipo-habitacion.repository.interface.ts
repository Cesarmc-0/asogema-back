import { TipoHabitacionEntity } from './tipo-habitacion.entity';

export const TIPO_HABITACION_REPOSITORY = 'TIPO_HABITACION_REPOSITORY';

export abstract class TipoHabitacionRepository {
  abstract findAll(): Promise<TipoHabitacionEntity[]>;
}

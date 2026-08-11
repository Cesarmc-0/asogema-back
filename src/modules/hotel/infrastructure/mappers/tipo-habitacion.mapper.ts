import { TipoHabitacionEntity } from '../../domain/tipo-habitacion.entity';

export class TipoHabitacionMapper {
  static toDomain(row: {
    id: bigint;
    nombre: string;
    descripcion: string | null;
    capacidad: number;
    precio_noche: { toNumber(): number };
    estado: boolean;
  }): TipoHabitacionEntity {
    return new TipoHabitacionEntity(
      row.id,
      row.nombre,
      row.descripcion,
      row.capacidad,
      row.precio_noche.toNumber(),
      row.estado,
    );
  }
}

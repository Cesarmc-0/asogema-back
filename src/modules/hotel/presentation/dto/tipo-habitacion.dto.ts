import { ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';
import { TipoHabitacionEntity } from '../../domain/tipo-habitacion.entity';

@ObjectType()
export class TipoHabitacionDTO {
  @Field(() => ID)
  declare id: string;

  @Field()
  declare nombre: string;

  @Field({ nullable: true })
  declare descripcion?: string;

  @Field(() => Int)
  declare capacidad: number;

  @Field(() => Float)
  declare precioNoche: number;

  @Field()
  declare estado: boolean;

  static fromDomain(entity: TipoHabitacionEntity): TipoHabitacionDTO {
    const dto = new TipoHabitacionDTO();
    dto.id = entity.id.toString();
    dto.nombre = entity.nombre;
    dto.descripcion = entity.descripcion ?? undefined;
    dto.capacidad = entity.capacidad;
    dto.precioNoche = entity.precioNoche;
    dto.estado = entity.estado;
    return dto;
  }
}

import { Field, Float, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ReservaHotelType {
  @Field()
  reserva_id: string;

  @Field()
  habitacion: string;

  @Field()
  fecha_entrada: string;

  @Field()
  fecha_salida: string;

  @Field(() => Float)
  total: number;

  @Field()
  estado: string;

  @Field(() => String, { nullable: true })
  pago_estado: string | null;

  @Field(() => String, { nullable: true })
  factura_id: string | null;
}

@ObjectType()
export class ReservaEventoType {
  @Field()
  reserva_id: string;

  @Field()
  salon: string;

  @Field()
  tipo_evento: string;

  @Field()
  fecha: string;

  @Field(() => Float)
  anticipo: number;

  @Field()
  estado: string;

  @Field(() => String, { nullable: true })
  pago_estado: string | null;

  @Field(() => String, { nullable: true })
  factura_id: string | null;
}

@ObjectType()
export class ReservaRestauranteType {
  @Field()
  reserva_id: string;

  @Field()
  mesa: string;

  @Field()
  fecha: string;

  @Field()
  hora: string;

  @Field()
  cantidad_personas: number;

  @Field()
  estado: string;

  @Field(() => String, { nullable: true })
  pago_estado: string | null;

  @Field(() => String, { nullable: true })
  factura_id: string | null;
}

@ObjectType()
export class PedidoOnlineType {
  @Field()
  pedido_id: string;

  @Field()
  tipo: string;

  @Field(() => Float)
  total: number;

  @Field()
  estado: string;

  @Field(() => String, { nullable: true })
  qr_url: string | null;

  @Field(() => String, { nullable: true })
  pago_estado: string | null;

  @Field(() => String, { nullable: true })
  factura_id: string | null;
}

@ObjectType()
export class MisReservasType {
  @Field(() => [ReservaHotelType])
  hoteles: ReservaHotelType[];

  @Field(() => [ReservaEventoType])
  eventos: ReservaEventoType[];

  @Field(() => [ReservaRestauranteType])
  restaurante: ReservaRestauranteType[];

  @Field(() => [PedidoOnlineType])
  pedidosOnline: PedidoOnlineType[];
}

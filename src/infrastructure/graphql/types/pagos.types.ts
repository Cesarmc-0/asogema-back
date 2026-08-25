import { Field, Float, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PagoType {
  @Field()
  id: string;

  @Field()
  metodo_pago: string;

  @Field(() => Float)
  valor: number;

  @Field()
  estado: string;

  @Field(() => String, { nullable: true })
  fecha_pago: string | null;
}

@ObjectType()
export class EstadoPagoType {
  @Field()
  factura_id: string;

  @Field()
  estado: string;

  @Field(() => Float)
  total: number;

  @Field(() => String, { nullable: true })
  numero_factura: string | null;

  @Field(() => String, { nullable: true })
  cufe: string | null;

  @Field(() => String, { nullable: true })
  qr_url: string | null;

  @Field(() => String, { nullable: true })
  tipo_reserva: string | null;

  @Field(() => String, { nullable: true })
  reserva_id: string | null;

  @Field(() => String, { nullable: true })
  qr_pedido: string | null;

  @Field(() => [PagoType])
  pagos: PagoType[];
}

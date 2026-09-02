import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ItemComandaType {
  @Field()
  producto_id!: string;

  @Field()
  nombre!: string;

  @Field(() => String, { nullable: true })
  imagen!: string | null;

  @Field(() => Int)
  cantidad!: number;

  @Field(() => Float)
  precio_unitario!: number;
}

@ObjectType()
export class PedidoComandaType {
  @Field()
  id!: string;

  @Field()
  estado!: string;

  @Field()
  tipo!: string;

  @Field()
  incluye_mesa!: boolean;

  @Field(() => Float)
  total!: number;

  @Field()
  created_at!: string;

  @Field()
  mesero!: string;

  @Field(() => [ItemComandaType])
  items!: ItemComandaType[];
}

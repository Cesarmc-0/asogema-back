import { Field, Float, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class RecargaType {
  @Field()
  id: string;

  @Field(() => Float)
  monto: number;

  @Field()
  estado: string;

  @Field(() => String, { nullable: true })
  factura_id: string | null;

  @Field()
  created_at: string;
}

@ObjectType()
export class MiSaldoType {
  @Field(() => Float)
  saldo: number;

  @Field(() => [RecargaType])
  recargas: RecargaType[];
}

import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';
import { TIPOS_PEDIDO } from 'src/restaurant/pedidos-online/application/use-cases/create-pedido-online.use-case';

export class PedidoOnlineItemDto {
  @IsInt()
  @Type(() => Number)
  producto_id!: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  cantidad!: number;
}

export class CreatePedidoOnlineDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => PedidoOnlineItemDto)
  items!: PedidoOnlineItemDto[];

  @IsIn([...TIPOS_PEDIDO])
  tipo!: string;
}

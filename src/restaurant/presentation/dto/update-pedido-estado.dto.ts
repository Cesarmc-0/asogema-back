import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { ESTADOS_PEDIDO } from 'src/restaurant/application/use-cases/actualizar-estado-pedido.use-case';

export class UpdatePedidoEstadoDto {
  @ApiProperty({ enum: ESTADOS_PEDIDO })
  @IsString()
  @IsIn(ESTADOS_PEDIDO, {
    message: 'Estado debe ser PENDIENTE, EN_PREPARACION o ENTREGADO',
  })
  estado: string;
}
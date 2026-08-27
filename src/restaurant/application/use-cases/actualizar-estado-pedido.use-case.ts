import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';

export const ESTADOS_PEDIDO = [
  'PENDIENTE',
  'EN_PREPARACION',
  'ENTREGADO',
] as const;
export type EstadoPedido = (typeof ESTADOS_PEDIDO)[number];

const SIGUIENTE_ESTADO: Record<EstadoPedido, EstadoPedido | null> = {
  PENDIENTE: 'EN_PREPARACION',
  EN_PREPARACION: 'ENTREGADO',
  ENTREGADO: null,
};

@Injectable()
export class ActualizarEstadoPedidoUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pedidoId: bigint, estado: EstadoPedido) {
    if (!ESTADOS_PEDIDO.includes(estado)) {
      throw new BadRequestException('Estado de pedido no válido');
    }

    const pedido = await this.prisma.pedidos_online.findUnique({
      where: { id: pedidoId },
      select: { id: true, estado: true },
    });

    if (!pedido) {
      throw new NotFoundException('Pedido no encontrado');
    }

    if (pedido.estado === estado) {
      return { pedido_id: pedido.id, estado: pedido.estado };
    }

    if (SIGUIENTE_ESTADO[pedido.estado as EstadoPedido] !== estado) {
      throw new BadRequestException(
        `No se puede pasar de ${pedido.estado} a ${estado}. Secuencia permitida: PENDIENTE → EN_PREPARACION → ENTREGADO`,
      );
    }

    await this.prisma.pedidos_online.update({
      where: { id: pedidoId },
      data: { estado },
    });

    return { pedido_id: pedido.id, estado };
  }
}
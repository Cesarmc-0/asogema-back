import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import { ComandaQueueService } from '../comanda-queue.service';
import { ComandaGateway } from 'src/restaurant/infrastructure/gateways/comanda.gateway';

export const ESTADOS_PEDIDO = ['RECIBIDO', 'LISTO', 'ENTREGADO'] as const;
export type EstadoPedido = (typeof ESTADOS_PEDIDO)[number];

const SIGUIENTE_ESTADO: Record<EstadoPedido, EstadoPedido | null> = {
  RECIBIDO: 'LISTO',
  LISTO: 'ENTREGADO',
  ENTREGADO: null,
};

@Injectable()
export class ActualizarEstadoPedidoUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly comandaQueue: ComandaQueueService,
    private readonly comandaGateway: ComandaGateway,
  ) {}

  async execute(pedidoId: bigint, estado: EstadoPedido) {
    if (!ESTADOS_PEDIDO.includes(estado)) {
      throw new BadRequestException('Estado de pedido no válido');
    }

    const pedido = await this.prisma.pedidos_online.findUnique({
      where: { id: pedidoId },
      select: { id: true, estado: true, usuario_id: true },
    });

    if (!pedido) {
      throw new NotFoundException('Pedido no encontrado');
    }

    if (pedido.estado === estado) {
      return { pedido_id: pedido.id, estado: pedido.estado };
    }

    if (SIGUIENTE_ESTADO[pedido.estado as EstadoPedido] !== estado) {
      throw new BadRequestException(
        `No se puede pasar de ${pedido.estado} a ${estado}. Secuencia permitida: RECIBIDO → LISTO → ENTREGADO`,
      );
    }

    await this.prisma.pedidos_online.update({
      where: { id: pedidoId },
      data: { estado },
    });

    this.comandaGateway.notificarCambio({ pedido_id: Number(pedido.id) });

    if (estado === 'LISTO') {
      await this.comandaQueue.enqueuePedidoListo(
        Number(pedido.id),
        Number(pedido.usuario_id),
      );
    }

    return { pedido_id: pedido.id, estado };
  }
}

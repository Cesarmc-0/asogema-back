import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';

@Injectable()
export class GetPedidoDetalleUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pedidoId: bigint) {
    const pedido = await this.prisma.pedidos_online.findUnique({
      where: { id: pedidoId },
      include: {
        detalle_pedido_online: {
          include: { productos_menu: true },
        },
        usuarios: { select: { nombre: true, apellido: true } },
      },
    });

    if (!pedido) {
      throw new NotFoundException('Pedido no encontrado');
    }

    return {
      pedido_id: pedido.id,
      tipo: pedido.tipo,
      estado: pedido.estado,
      total: Number(pedido.total),
      subtotal: Number(pedido.subtotal),
      descuento: Number(pedido.descuento),
      impuestos: Number(pedido.impuestos),
      created_at: pedido.created_at,
      cliente: pedido.usuarios
        ? `${pedido.usuarios.nombre} ${pedido.usuarios.apellido}`.trim()
        : null,
      items: pedido.detalle_pedido_online.map((item) => ({
        producto_id: item.producto_id,
        nombre: item.productos_menu.nombre,
        cantidad: item.cantidad,
        precio_unitario: Number(item.precio_unitario),
        subtotal: Number(item.subtotal ?? 0),
      })),
    };
  }
}
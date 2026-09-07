import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';

@Injectable()
export class ListarPedidosComandaUsecase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(usuarioId: bigint, rol: string) {
    const inicioDia = new Date();
    inicioDia.setHours(0, 0, 0, 0);

    const where =
      rol === 'Mesero'
        ? { usuario_id: usuarioId, created_at: { gte: inicioDia } }
        : { created_at: { gte: inicioDia } };

    const pedidos = await this.prisma.pedidos_online.findMany({
      where,
      include: {
        detalle_pedido_online: { include: { productos_menu: true } },
        usuarios: { select: { nombre: true, apellido: true } },
      },
      orderBy: { created_at: 'asc' },
    });

    return pedidos.map((p) => ({
      id: p.id.toString(),
      estado: p.estado,
      tipo: p.tipo,
      incluye_mesa: p.incluye_mesa,
      total: Number(p.total),
      created_at: p.created_at.toISOString(),
      mesero: `${p.usuarios.nombre} ${p.usuarios.apellido}`.trim(),
      items: p.detalle_pedido_online.map((item) => ({
        producto_id: item.producto_id.toString(),
        nombre: item.productos_menu.nombre,
        imagen: item.productos_menu.imagen_url ?? null,
        cantidad: item.cantidad,
        precio_unitario: Number(item.precio_unitario),
      })),
    }));
  }
}

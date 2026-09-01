import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import {
  RestaurantRepository,
  CreateReservationInput,
  CreatePedidoOnlineInput,
  CategoriaConProductos,
  MesaConReservas,
  PedidoOnlineConItems,
} from 'src/restaurant/domain/repositories/restaurant-repository.interface';

@Injectable()
export class RestaurantRepositoryImpl implements RestaurantRepository {
  constructor(private prisma: PrismaService) {}

  async getMenu(): Promise<CategoriaConProductos[]> {
    return this.prisma.categorias_menu.findMany({
      where: { estado: true, activo: true },
      include: {
        productos_menu: {
          where: { estado: true, activo: true },
          orderBy: { nombre: 'asc' },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async getAvailableTables(
    query: import('src/restaurant/domain/repositories/restaurant-repository.interface').AvailableTablesQuery,
  ): Promise<MesaConReservas[]> {
    const mesas = await this.prisma.mesas.findMany({
      where: { estado: 'LIBRE' },
      include: { reservas_restaurante: true },
    });

    return mesas.filter((mesa) => {
      if (query.capacidad_min && mesa.capacidad < query.capacidad_min) {
        return false;
      }

      const hasConflict = mesa.reservas_restaurante.some((res) => {
        if (res.estado === 'CANCELADA') return false;
        return (
          res.fecha.getTime() === query.fecha.getTime() &&
          res.hora.getHours() === query.hora.getHours() &&
          res.hora.getMinutes() === query.hora.getMinutes()
        );
      });

      return !hasConflict;
    });
  }

  async createReservation(data: CreateReservationInput): Promise<any> {
    return this.prisma.reservas_restaurante.create({
      data: {
        usuario_id: data.usuario_id,
        mesa_id: data.mesa_id,
        fecha: data.fecha,
        hora: data.hora,
        cantidad_personas: data.cantidad_personas,
        motivo: data.motivo,
        observaciones: data.observaciones,
        estado: 'PENDIENTE',
      },
      include: {
        mesas: true,
        usuarios: {
          select: { nombre: true, apellido: true, telefono: true },
        },
      },
    });
  }

  async createPedidoOnline(
    data: CreatePedidoOnlineInput,
  ): Promise<PedidoOnlineConItems> {
    return this.prisma.pedidos_online.create({
      data: {
        usuario_id: data.usuario_id,
        tipo: data.tipo,
        incluye_mesa: data.incluye_mesa,
        subtotal: data.subtotal,
        impuestos: data.impuestos,
        descuento: data.descuento,
        total: data.total,
        detalle_pedido_online: {
          create: data.items.map((item) => ({
            producto_id: item.producto_id,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            subtotal: item.subtotal,
          })),
        },
      },
      include: { detalle_pedido_online: true },
    });
  }
}

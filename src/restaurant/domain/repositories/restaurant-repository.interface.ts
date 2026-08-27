import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export type CategoriaConProductos = Prisma.categorias_menuGetPayload<{
  include: { productos_menu: true };
}>;

export type MesaConReservas = Prisma.mesasGetPayload<{
  include: { reservas_restaurante: true };
}>;

export type ReservaRestauranteConMesa = Prisma.reservas_restauranteGetPayload<{
  include: {
    mesas: true;
    usuarios: { select: { nombre: true; apellido: true; telefono: true } };
  };
}>;

export interface CreateReservationInput {
  usuario_id: bigint;
  mesa_id: bigint;
  fecha: Date;
  hora: Date;
  cantidad_personas: number;
  motivo?: string;
  observaciones?: string;
}

export interface CreatePedidoOnlineItemInput {
  producto_id: bigint;
  cantidad: number;
  precio_unitario: Decimal;
  subtotal: Decimal;
}

export interface CreatePedidoOnlineInput {
  usuario_id: bigint;
  tipo: 'PARA_LLEVAR' | 'EN_MESA';
  incluye_mesa: boolean;
  subtotal: Decimal;
  impuestos: Decimal;
  descuento: Decimal;
  total: Decimal;
  items: CreatePedidoOnlineItemInput[];
}

export type PedidoOnlineConItems = Prisma.pedidos_onlineGetPayload<{
  include: { detalle_pedido_online: true };
}>;

export interface AvailableTablesQuery {
  fecha: Date;
  hora: Date;
  capacidad_min?: number;
}

export abstract class RestaurantRepository {
  abstract getMenu(): Promise<CategoriaConProductos[]>;
  abstract getAvailableTables(
    query: AvailableTablesQuery,
  ): Promise<MesaConReservas[]>;
  abstract createReservation(
    data: CreateReservationInput,
  ): Promise<ReservaRestauranteConMesa>;
  abstract createPedidoOnline(
    data: CreatePedidoOnlineInput,
  ): Promise<PedidoOnlineConItems>;
}

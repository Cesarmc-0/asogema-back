import { Prisma } from '@prisma/client';

export type CategoriaConProductos = Prisma.categorias_menuGetPayload<{
  include: { productos_menu: true };
}>;

export type MesaConReservas = Prisma.mesasGetPayload<{
  include: { reservas_restaurante: true };
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
  abstract createReservation(data: CreateReservationInput): Promise<any>;
}

import { Prisma } from '@prisma/client';

export type HabitacionWithType = Prisma.habitacionesGetPayload<{
  include: { tipos_habitacion: true };
}>;

export type ReservaHabitacionConHabitacion = Prisma.reservas_hotelGetPayload<{
  include: { habitaciones: { include: { tipos_habitacion: true } } };
}>;

export interface CreateBookingInput {
  usuario_id: bigint;
  habitacion_id: bigint;
  fecha_entrada: Date;
  fecha_salida: Date;
  cantidad_huespedes: number;
  total: number;
  observaciones?: string;
}

export interface AvailableRoomQuery {
  tipo_habitacion_id?: bigint;
  capacidad_min?: number;
  fecha_entrada?: Date;
  fecha_salida?: Date;
}

export abstract class HotelRoomRepository {
  abstract findAvailableRooms(
    query: AvailableRoomQuery,
  ): Promise<HabitacionWithType[]>;
  abstract findById(id: bigint): Promise<HabitacionWithType | null>;
  abstract findBookingsByUser(
    usuario_id: bigint,
  ): Promise<ReservaHabitacionConHabitacion[]>;
  abstract createBooking(
    data: CreateBookingInput,
  ): Promise<ReservaHabitacionConHabitacion>;
  abstract findBookingByIdAndUser(
    id: bigint,
    usuario_id: bigint,
  ): Promise<ReservaHabitacionConHabitacion | null>;
  abstract isRoomAvailableForDates(
    habitacion_id: bigint,
    fecha_entrada: Date,
    fecha_salida: Date,
  ): Promise<boolean>;
}

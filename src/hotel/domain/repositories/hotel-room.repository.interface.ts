import { Prisma } from '@prisma/client';

export type HabitacionWithType = Prisma.habitacionesGetPayload<{
  include: { tipos_habitacion: true };
}>;

export type ReservaHabitacionConHabitacion = Prisma.reservas_hotelGetPayload<{
  include: { habitaciones: { include: { tipos_habitacion: true } } };
}>;

export type DayBookingType = 'check-in' | 'check-out' | 'ocupadas' | 'todas';

export const DAY_BOOKING_TYPES: DayBookingType[] = [
  'check-in',
  'check-out',
  'ocupadas',
  'todas',
];

export interface DayBooking {
  id: bigint;
  cliente: string;
  telefono: string | null;
  habitacion: string | null;
  personas: number;
  estado: string;
  fecha_entrada: Date;
  fecha_salida: Date;
  observaciones: string | null;
  total: number;
  saldo_pendiente: number;
}

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
  abstract findBookingById(
    id: bigint,
  ): Promise<Prisma.reservas_hotelGetPayload<{
    include: { usuarios: true; habitaciones: true };
  }> | null>;
  abstract updateBookingStatus(id: bigint, estado: string): Promise<void>;
  abstract findBookingsByDay(
    day: Date,
    tipo: 'check-in' | 'check-out' | 'ocupadas' | 'todas',
    estado?: string,
  ): Promise<DayBooking[]>;
}

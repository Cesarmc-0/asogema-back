import { Prisma } from '@prisma/client';

export type SalonConReservas = Prisma.salonesGetPayload<{
  include: { reservas_evento: true };
}>;

export type TipoEventoConReservas = Prisma.tipos_eventoGetPayload<{
  include: { reservas_evento: true };
}>;

export type ReservaEventoConDetalles = Prisma.reservas_eventoGetPayload<{
  include: { salones: true; tipos_evento: true };
}>;

export interface CreateEventBookingInput {
  usuario_id: bigint;
  salon_id: bigint;
  tipo_evento_id: bigint;
  fecha: Date;
  hora_inicio: Date;
  hora_fin: Date;
  cantidad_personas: number;
  anticipo?: number;
  observaciones?: string;
}

export abstract class EventRepository {
  abstract getEvents(): Promise<{
    salones: SalonConReservas[];
    tipos_evento: TipoEventoConReservas[];
  }>;
  abstract createEventBooking(
    data: CreateEventBookingInput,
  ): Promise<ReservaEventoConDetalles>;
}

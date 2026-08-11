import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import {
  EventRepository,
  CreateEventBookingInput,
  ReservaEventoConDetalles,
  SalonConReservas,
  TipoEventoConReservas,
} from 'src/events/domain/repositories/event-repository.interface';

@Injectable()
export class EventsRepositoryImpl implements EventRepository {
  constructor(private prisma: PrismaService) {}

  async getEvents(): Promise<{
    salones: SalonConReservas[];
    tipos_evento: TipoEventoConReservas[];
  }> {
    const [salones, tiposEvento] = await Promise.all([
      this.prisma.salones.findMany({
        where: { estado: 'DISPONIBLE' },
        include: { reservas_evento: true },
      }),
      this.prisma.tipos_evento.findMany({
        where: { estado: true },
        include: { reservas_evento: true },
      }),
    ]);

    return { salones, tipos_evento: tiposEvento };
  }

  async createEventBooking(
    data: CreateEventBookingInput,
  ): Promise<ReservaEventoConDetalles> {
    return this.prisma.reservas_evento.create({
      data: {
        usuario_id: data.usuario_id,
        salon_id: data.salon_id,
        tipo_evento_id: data.tipo_evento_id,
        fecha: data.fecha,
        hora_inicio: data.hora_inicio,
        hora_fin: data.hora_fin,
        cantidad_personas: data.cantidad_personas,
        anticipo: data.anticipo,
        observaciones: data.observaciones,
        estado: 'PENDIENTE',
      },
      include: {
        salones: true,
        tipos_evento: true,
      },
    });
  }
}

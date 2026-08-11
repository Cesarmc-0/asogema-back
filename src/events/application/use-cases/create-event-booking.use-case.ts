import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import { EventRepository } from 'src/events/domain/repositories/event-repository.interface';

@Injectable()
export class CreateEventBookingUseCase {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    usuario_id: bigint,
    dto: {
      salon_id: bigint;
      tipo_evento_id: bigint;
      fecha: Date;
      hora_inicio: Date;
      hora_fin: Date;
      cantidad_personas: number;
      anticipo?: number;
      observaciones?: string;
    },
  ) {
    const salon = await this.prisma.salones.findUnique({
      where: { id: dto.salon_id },
    });
    if (!salon) {
      throw new NotFoundException('Salón no encontrado');
    }

    if (salon.estado !== 'DISPONIBLE') {
      throw new ConflictException('El salón no se encuentra disponible');
    }

    if (dto.cantidad_personas > salon.capacidad) {
      throw new ConflictException(
        `El salón tiene capacidad máxima de ${salon.capacidad} personas`,
      );
    }

    const hasConflict = await this.prisma.reservas_evento.count({
      where: {
        salon_id: dto.salon_id,
        fecha: dto.fecha,
        estado: { notIn: ['CANCELADA'] },
        OR: [
          {
            hora_inicio: { lt: dto.hora_fin },
            hora_fin: { gt: dto.hora_inicio },
          },
        ],
      },
    });
    if (hasConflict > 0) {
      throw new ConflictException(
        'El salón ya tiene una reserva en ese horario',
      );
    }

    const anticipo = dto.anticipo ?? Number(salon.precio_base) * 0.3;

    return this.eventRepository.createEventBooking({
      usuario_id,
      salon_id: dto.salon_id,
      tipo_evento_id: dto.tipo_evento_id,
      fecha: dto.fecha,
      hora_inicio: dto.hora_inicio,
      hora_fin: dto.hora_fin,
      cantidad_personas: dto.cantidad_personas,
      anticipo,
      observaciones: dto.observaciones,
    });
  }
}

import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import { EmailSender } from 'src/infrastructure/mail/domain/email-sender.interface';
import { EventRepository } from 'src/events/domain/repositories/event-repository.interface';

@Injectable()
export class CreateEventBookingUseCase {
  private readonly logger = new Logger(CreateEventBookingUseCase.name);

  constructor(
    private readonly eventRepository: EventRepository,
    private readonly prisma: PrismaService,
    private readonly emailSender: EmailSender,
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

    const reserva = await this.eventRepository.createEventBooking({
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

    await this.notifyBookingConfirmation(
      usuario_id,
      reserva.id,
      salon,
      dto.tipo_evento_id,
      dto.fecha,
      dto.hora_inicio,
      dto.hora_fin,
      dto.cantidad_personas,
      anticipo,
    );

    return reserva;
  }

  private async notifyBookingConfirmation(
    usuario_id: bigint,
    reserva_id: bigint,
    salon: { nombre: string },
    tipo_evento_id: bigint,
    fecha: Date,
    hora_inicio: Date,
    hora_fin: Date,
    cantidad_personas: number,
    anticipo: number,
  ): Promise<void> {
    try {
      const [usuario, tipoEvento] = await Promise.all([
        this.prisma.usuarios.findUnique({ where: { id: usuario_id } }),
        this.prisma.tipos_evento.findUnique({
          where: { id: tipo_evento_id },
        }),
      ]);
      if (!usuario) {
        this.logger.warn(
          `Usuario ${usuario_id} no encontrado al notificar reserva de salón`,
        );
        return;
      }

      await this.emailSender.sendBookingConfirmation('event-booking', {
        nombre: `${usuario.nombre} ${usuario.apellido}`.trim(),
        correo: usuario.correo,
        reserva_id,
        servicio: salon.nombre,
        detalle: tipoEvento?.nombre ?? 'Evento',
        fecha: this.formatDate(fecha),
        hora: `${this.formatTime(hora_inicio)} - ${this.formatTime(hora_fin)}`,
        personas: cantidad_personas,
        total: anticipo.toFixed(2),
      });
    } catch (error) {
      this.logger.error(
        `No se pudo notificar la reserva de salón ${reserva_id}: ${
          error instanceof Error ? error.message : 'error desconocido'
        }`,
      );
    }
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('es-CO');
  }

  private formatTime(time: Date): string {
    return time.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

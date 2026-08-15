import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import { EmailSender } from 'src/infrastructure/mail/domain/email-sender.interface';
import { RestaurantRepository } from 'src/restaurant/domain/repositories/restaurant-repository.interface';

@Injectable()
export class CreateRestaurantReservationUseCase {
  private readonly logger = new Logger(CreateRestaurantReservationUseCase.name);

  constructor(
    private readonly restaurantRepository: RestaurantRepository,
    private readonly prisma: PrismaService,
    private readonly emailSender: EmailSender,
  ) {}

  async execute(
    usuario_id: bigint,
    dto: {
      mesa_id: bigint;
      fecha: Date;
      hora: Date;
      cantidad_personas: number;
      motivo?: string;
      observaciones?: string;
    },
  ) {
    const mesa = await this.prisma.mesas.findUnique({
      where: { id: dto.mesa_id },
    });
    if (!mesa) {
      throw new NotFoundException('Mesa no encontrada');
    }

    if (mesa.estado !== 'LIBRE') {
      throw new ConflictException('La mesa no se encuentra disponible');
    }

    if (dto.cantidad_personas > mesa.capacidad) {
      throw new ConflictException(
        `La mesa solo tiene capacidad para ${mesa.capacidad} personas`,
      );
    }

    const conflictingReservation =
      await this.prisma.reservas_restaurante.findFirst({
        where: {
          mesa_id: dto.mesa_id,
          fecha: dto.fecha,
          hora: dto.hora,
          estado: { notIn: ['CANCELADA'] },
        },
      });

    if (conflictingReservation) {
      throw new ConflictException(
        'Ya existe una reserva para esta mesa en la fecha y hora seleccionadas',
      );
    }

    const reserva = await this.restaurantRepository.createReservation({
      usuario_id,
      mesa_id: dto.mesa_id,
      fecha: dto.fecha,
      hora: dto.hora,
      cantidad_personas: dto.cantidad_personas,
      motivo: dto.motivo,
      observaciones: dto.observaciones,
    });

    await this.notifyReservationConfirmation(
      usuario_id,
      reserva.id,
      mesa,
      dto.fecha,
      dto.hora,
      dto.cantidad_personas,
    );

    return reserva;
  }

  private async notifyReservationConfirmation(
    usuario_id: bigint,
    reserva_id: bigint,
    mesa: { numero: string },
    fecha: Date,
    hora: Date,
    cantidad_personas: number,
  ): Promise<void> {
    try {
      const usuario = await this.prisma.usuarios.findUnique({
        where: { id: usuario_id },
      });
      if (!usuario) {
        this.logger.warn(
          `Usuario ${usuario_id} no encontrado al notificar reserva de restaurante`,
        );
        return;
      }

      await this.emailSender.sendBookingConfirmation('restaurant-reservation', {
        nombre: `${usuario.nombre} ${usuario.apellido}`.trim(),
        correo: usuario.correo,
        reserva_id,
        servicio: `Mesa ${mesa.numero}`,
        detalle: `Mesa ${mesa.numero}`,
        fecha: this.formatDate(fecha),
        hora: this.formatTime(hora),
        personas: cantidad_personas,
      });
    } catch (error) {
      this.logger.error(
        `No se pudo notificar la reserva de mesa ${reserva_id}: ${
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

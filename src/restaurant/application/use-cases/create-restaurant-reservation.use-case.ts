import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import { RestaurantRepository } from 'src/restaurant/domain/repositories/restaurant-repository.interface';

@Injectable()
export class CreateRestaurantReservationUseCase {
  constructor(
    private readonly restaurantRepository: RestaurantRepository,
    private readonly prisma: PrismaService,
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

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.restaurantRepository.createReservation({
      usuario_id,
      mesa_id: dto.mesa_id,
      fecha: dto.fecha,
      hora: dto.hora,
      cantidad_personas: dto.cantidad_personas,
      motivo: dto.motivo,
      observaciones: dto.observaciones,
    });
  }
}

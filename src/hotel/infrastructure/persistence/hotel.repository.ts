import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import { attachImagenes } from 'src/infrastructure/storage/imagenes.helper';
import {
  HotelRoomRepository,
  CreateBookingInput,
  AvailableRoomQuery,
  HabitacionWithType,
  ReservaHabitacionConHabitacion,
} from 'src/hotel/domain/repositories/hotel-room.repository.interface';

@Injectable()
export class HotelRepositoryImpl implements HotelRoomRepository {
  constructor(private prisma: PrismaService) {}

  async findAvailableRooms(
    query: AvailableRoomQuery,
  ): Promise<HabitacionWithType[]> {
    const where: any = {
      estado: true,
      activo: true,
      tipos_habitacion: { estado: true, activo: true },
    };

    if (query.tipo_habitacion_id) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      where.tipo_habitacion_id = query.tipo_habitacion_id;
    }

    if (query.capacidad_min) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      where.tipos_habitacion = {
        estado: true,
        activo: true,
        capacidad: { gte: query.capacidad_min },
      };
    }

    let rooms = await this.prisma.habitaciones.findMany({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      where: where,
      include: { tipos_habitacion: true },
    });

    if (query.fecha_entrada && query.fecha_salida) {
      rooms = await this.filterByAvailability(
        rooms,
        query.fecha_entrada,
        query.fecha_salida,
      );
    }

    return attachImagenes(this.prisma, 'habitacion', rooms);
  }

  async findById(id: bigint): Promise<HabitacionWithType | null> {
    const room = await this.prisma.habitaciones.findFirst({
      where: { id, activo: true },
      include: { tipos_habitacion: true },
    });
    if (!room) return null;
    const [withGallery] = await attachImagenes(this.prisma, 'habitacion', [
      room,
    ]);
    return withGallery;
  }

  async findBookingsByUser(
    usuario_id: bigint,
  ): Promise<ReservaHabitacionConHabitacion[]> {
    return this.prisma.reservas_hotel.findMany({
      where: { usuario_id },
      include: {
        habitaciones: { include: { tipos_habitacion: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async createBooking(data: CreateBookingInput): Promise<any> {
    return this.prisma.reservas_hotel.create({
      data: {
        usuario_id: data.usuario_id,
        habitacion_id: data.habitacion_id,
        fecha_reserva: new Date(),
        fecha_entrada: data.fecha_entrada,
        fecha_salida: data.fecha_salida,
        cantidad_huespedes: data.cantidad_huespedes,
        total: data.total,
        estado: 'PENDIENTE',
        observaciones: data.observaciones,
      },
      include: {
        habitaciones: { include: { tipos_habitacion: true } },
      },
    });
  }

  async findBookingByIdAndUser(
    id: bigint,
    usuario_id: bigint,
  ): Promise<ReservaHabitacionConHabitacion | null> {
    return this.prisma.reservas_hotel.findFirst({
      where: { id, usuario_id },
      include: {
        habitaciones: { include: { tipos_habitacion: true } },
      },
    });
  }

  async isRoomAvailableForDates(
    habitacion_id: bigint,
    fecha_entrada: Date,
    fecha_salida: Date,
  ): Promise<boolean> {
    const overlapping = await this.prisma.reservas_hotel.count({
      where: {
        habitacion_id,
        estado: { notIn: ['CANCELADA'] },
        OR: [
          {
            fecha_entrada: { lt: fecha_salida },
            fecha_salida: { gt: fecha_entrada },
          },
        ],
      },
    });
    return overlapping === 0;
  }

  private async filterByAvailability(
    rooms: HabitacionWithType[],
    fecha_entrada: Date,
    fecha_salida: Date,
  ): Promise<HabitacionWithType[]> {
    const availableRooms: HabitacionWithType[] = [];

    for (const room of rooms) {
      const isAvailable = await this.isRoomAvailableForDates(
        room.id,
        fecha_entrada,
        fecha_salida,
      );
      if (isAvailable) {
        availableRooms.push(room);
      }
    }

    return availableRooms;
  }
}

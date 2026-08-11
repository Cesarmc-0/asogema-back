import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { HotelRoomRepository } from '../../../hotel/domain/repositories/hotel-room.repository.interface';

@Injectable()
export class CreateHotelBookingUseCase {
  constructor(private readonly hotelRepository: HotelRoomRepository) {}

  async execute(
    usuario_id: bigint,
    dto: {
      habitacion_id: bigint;
      fecha_entrada: Date;
      fecha_salida: Date;
      cantidad_huespedes: number;
      observaciones?: string;
      total?: number;
    },
  ) {
    const habitacion = await this.hotelRepository.findById(dto.habitacion_id);
    if (!habitacion) {
      throw new NotFoundException('Habitación no encontrada');
    }

    if (!habitacion.estado) {
      throw new ConflictException('La habitación no se encuentra disponible');
    }

    const available = await this.hotelRepository.isRoomAvailableForDates(
      dto.habitacion_id,
      dto.fecha_entrada,
      dto.fecha_salida,
    );
    if (!available) {
      throw new ConflictException(
        'La habitación no está disponible para las fechas seleccionadas',
      );
    }

    const total =
      dto.total ??
      this.calculateTotal(
        habitacion.tipos_habitacion.precio_noche,
        dto.fecha_entrada,
        dto.fecha_salida,
      );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.hotelRepository.createBooking({
      usuario_id,
      habitacion_id: dto.habitacion_id,
      fecha_entrada: dto.fecha_entrada,
      fecha_salida: dto.fecha_salida,
      cantidad_huespedes: dto.cantidad_huespedes,
      total,
      observaciones: dto.observaciones,
    });
  }

  private calculateTotal(
    precio_noche: bigint | number | object,
    fecha_entrada: Date,
    fecha_salida: Date,
  ): number {
    const diffMs = fecha_salida.getTime() - fecha_entrada.getTime();
    const noches = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const price =
      typeof precio_noche === 'bigint'
        ? Number(precio_noche)
        : typeof precio_noche === 'number'
          ? precio_noche
          : Number(precio_noche);
    return noches * price;
  }
}

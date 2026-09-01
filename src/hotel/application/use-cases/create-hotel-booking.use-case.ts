import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import { EmailSender } from 'src/infrastructure/mail/domain/email-sender.interface';
import { HotelRoomRepository } from '../../../hotel/domain/repositories/hotel-room.repository.interface';
import { CreatePaymentUseCase } from 'src/payments/application/use-cases/create-payment.use-case';

@Injectable()
export class CreateHotelBookingUseCase {
  private readonly logger = new Logger(CreateHotelBookingUseCase.name);

  constructor(
    private readonly hotelRepository: HotelRoomRepository,
    private readonly prisma: PrismaService,
    private readonly emailSender: EmailSender,
    private readonly createPaymentUseCase: CreatePaymentUseCase,
  ) {}

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

    if (habitacion.activo === false) {
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

    const reserva = await this.hotelRepository.createBooking({
      usuario_id,
      habitacion_id: dto.habitacion_id,
      fecha_entrada: dto.fecha_entrada,
      fecha_salida: dto.fecha_salida,
      cantidad_huespedes: dto.cantidad_huespedes,
      total,
      observaciones: dto.observaciones,
    });

    await this.notifyBookingConfirmation(
      usuario_id,
      reserva,
      habitacion,
      dto.fecha_entrada,
      dto.fecha_salida,
      dto.cantidad_huespedes,
      total,
    );

    let paymentInfo: Record<string, unknown> | null = null;
    try {
      paymentInfo = await this.createPaymentUseCase.execute(usuario_id, {
        reserva_id: reserva.id,
        monto: total,
        metodo_pago: 'WOMPI',
        tipo_reserva: 'HOTEL',
      });
    } catch (error) {
      this.logger.error(
        `No se pudo crear el pago para reserva de hotel ${reserva.id}: ${
          error instanceof Error ? error.message : 'error desconocido'
        }`,
      );
    }

    return { ...reserva, payment: paymentInfo };
  }

  private async notifyBookingConfirmation(
    usuario_id: bigint,
    reserva: { id: bigint },
    habitacion: {
      numero: string;
      tipos_habitacion: { nombre: string; capacidad: number };
    },
    fecha_entrada: Date,
    fecha_salida: Date,
    cantidad_huespedes: number,
    total: number,
  ): Promise<void> {
    try {
      const usuario = await this.prisma.usuarios.findUnique({
        where: { id: usuario_id },
      });
      if (!usuario) {
        this.logger.warn(
          `Usuario ${usuario_id} no encontrado al notificar reserva de hotel`,
        );
        return;
      }

      await this.emailSender.sendBookingConfirmation('hotel-booking', {
        nombre: `${usuario.nombre} ${usuario.apellido}`.trim(),
        correo: usuario.correo,
        reserva_id: reserva.id,
        servicio: `${habitacion.numero} - ${habitacion.tipos_habitacion.nombre}`,
        detalle: habitacion.tipos_habitacion.nombre,
        fecha: `${this.formatDate(fecha_entrada)} al ${this.formatDate(
          fecha_salida,
        )}`,
        personas: cantidad_huespedes,
        total: total.toFixed(2),
      });
    } catch (error) {
      this.logger.error(
        `No se pudo notificar la reserva de hotel ${reserva.id}: ${
          error instanceof Error ? error.message : 'error desconocido'
        }`,
      );
    }
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('es-CO');
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

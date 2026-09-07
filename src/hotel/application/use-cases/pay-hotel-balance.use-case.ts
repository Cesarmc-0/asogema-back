import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { HotelRoomRepository } from 'src/hotel/domain/repositories/hotel-room.repository.interface';
import { HotelPaymentRepository } from 'src/hotel/domain/repositories/hotel-payment.repository.interface';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';

@Injectable()
export class PayHotelBalanceUseCase {
  constructor(
    private readonly hotelRepository: HotelRoomRepository,
    private readonly hotelPaymentRepository: HotelPaymentRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    usuarioId: bigint,
    reservaId: bigint,
    metodoPago: string = 'WOMPI',
  ) {
    const reserva = await this.hotelRepository.findBookingByIdAndUser(
      reservaId,
      usuarioId,
    );
    if (!reserva) {
      throw new NotFoundException('Reserva no encontrada');
    }

    if (
      !['CONFIRMADA', 'CHECK_IN', 'PENDING_PAYMENT'].includes(reserva.estado)
    ) {
      throw new BadRequestException(
        'La reserva no puede pagar saldo en este estado',
      );
    }

    const saldoPendiente =
      await this.hotelPaymentRepository.calcularSaldoPendiente(
        reservaId,
        Number(reserva.total),
      );

    if (saldoPendiente <= 0) {
      throw new BadRequestException('No existe saldo pendiente por pagar');
    }

    // Crear registro de pago de saldo (o reutilizar el pendiente existente,
    // para no acumular registros duplicados si el usuario reintenta).
    const existente =
      await this.hotelPaymentRepository.findPagoSaldoPendiente(reservaId);
    if (existente) {
      await this.hotelPaymentRepository.updatePagoSaldoPendiente(existente.id, {
        monto: saldoPendiente,
        metodo_pago: metodoPago,
      });
      return {
        reserva_id: reservaId,
        monto_pagado: saldoPendiente,
        pago_id: existente.id,
        estado: 'PENDIENTE',
      };
    }

    const pagoSaldo = await this.hotelPaymentRepository.createPagoHotel({
      reserva_id: reservaId,
      tipo: 'SALDO',
      monto: saldoPendiente,
      metodo_pago: metodoPago,
    });

    return {
      reserva_id: reservaId,
      monto_pagado: saldoPendiente,
      pago_id: pagoSaldo.id,
      estado: 'PENDIENTE',
    };
  }
}

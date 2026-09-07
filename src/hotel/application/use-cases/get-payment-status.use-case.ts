import { Injectable, NotFoundException } from '@nestjs/common';
import { HotelRoomRepository } from 'src/hotel/domain/repositories/hotel-room.repository.interface';
import { HotelPaymentRepository } from 'src/hotel/domain/repositories/hotel-payment.repository.interface';

@Injectable()
export class GetPaymentStatusUseCase {
  constructor(
    private readonly hotelRepository: HotelRoomRepository,
    private readonly hotelPaymentRepository: HotelPaymentRepository,
  ) {}

  async execute(reservaId: bigint) {
    const reserva = await this.hotelRepository.findBookingById(reservaId);
    if (!reserva) {
      throw new NotFoundException('Reserva no encontrada');
    }

    const pagos =
      await this.hotelPaymentRepository.findPagosByReserva(reservaId);
    const totalReserva = Number(reserva.total);
    const saldoPendiente =
      await this.hotelPaymentRepository.calcularSaldoPendiente(
        reservaId,
        totalReserva,
      );
    const totalPagado = pagos
      .filter((p) => p.estado === 'CONFIRMADO')
      .reduce((sum, p) => sum + Number(p.monto), 0);

    const estadoPago =
      totalPagado === 0
        ? 'PAGO_INICIAL'
        : totalPagado >= totalReserva
          ? 'COMPLETADO'
          : 'SALDO_PENDIENTE';

    const puedePagarSaldo =
      saldoPendiente > 0 &&
      ['CONFIRMADA', 'CHECK_IN', 'PENDING_PAYMENT'].includes(reserva.estado);

    return {
      reserva_id: reservaId,
      total_reserva: totalReserva,
      total_pagado: totalPagado,
      saldo_pendiente: saldoPendiente,
      estado: reserva.estado,
      estado_pago: estadoPago,
      puede_pagar_saldo: puedePagarSaldo,
      puede_check_out: saldoPendiente === 0,
      pagos,
    };
  }
}

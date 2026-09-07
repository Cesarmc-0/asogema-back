import type { pagos_hotel } from '@prisma/client';

export type PagoHotel = pagos_hotel;

export interface CreatePagoHotelInput {
  reserva_id: bigint;
  tipo: 'INICIAL' | 'SALDO';
  monto: number;
  metodo_pago?: string;
  factura_id?: bigint | null;
}

export abstract class HotelPaymentRepository {
  abstract createPagoHotel(data: CreatePagoHotelInput): Promise<PagoHotel>;
  abstract findPagosByReserva(reserva_id: bigint): Promise<PagoHotel[]>;
  abstract findPagoSaldoPendiente(
    reserva_id: bigint,
  ): Promise<PagoHotel | null>;
  abstract updatePagoSaldoPendiente(
    id: bigint,
    data: { monto: number; metodo_pago: string },
  ): Promise<void>;
  abstract updatePagoHotelEstado(id: bigint, estado: string): Promise<void>;
  abstract calcularSaldoPendiente(
    reserva_id: bigint,
    total_reserva: number,
  ): Promise<number>;
}

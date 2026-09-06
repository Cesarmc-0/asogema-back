import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import {
  HotelPaymentRepository,
  CreatePagoHotelInput,
  PagoHotel,
} from 'src/hotel/domain/repositories/hotel-payment.repository.interface';

@Injectable()
export class HotelPaymentRepositoryImpl implements HotelPaymentRepository {
  constructor(private prisma: PrismaService) {}

  async createPagoHotel(data: CreatePagoHotelInput): Promise<PagoHotel> {
    return this.prisma.pagos_hotel.create({
      data: {
        reserva_id: data.reserva_id,
        tipo: data.tipo,
        monto: data.monto,
        estado: 'PENDIENTE',
        metodo_pago: data.metodo_pago ?? null,
        factura_id: data.factura_id ?? null,
      },
    });
  }

  async findPagosByReserva(reserva_id: bigint): Promise<PagoHotel[]> {
    return this.prisma.pagos_hotel.findMany({
      where: { reserva_id },
      orderBy: { created_at: 'asc' },
    });
  }

  async updatePagoHotelEstado(id: bigint, estado: string): Promise<void> {
    await this.prisma.pagos_hotel.update({
      where: { id },
      data: { estado },
    });
  }

  async findPagoSaldoPendiente(reserva_id: bigint): Promise<PagoHotel | null> {
    return this.prisma.pagos_hotel.findFirst({
      where: { reserva_id, tipo: 'SALDO', estado: 'PENDIENTE' },
      orderBy: { created_at: 'asc' },
    });
  }

  async updatePagoSaldoPendiente(
    id: bigint,
    data: { monto: number; metodo_pago: string },
  ): Promise<void> {
    await this.prisma.pagos_hotel.update({
      where: { id },
      data: { monto: data.monto, metodo_pago: data.metodo_pago },
    });
  }

  async calcularSaldoPendiente(
    reserva_id: bigint,
    total_reserva: number,
  ): Promise<number> {
    const pagos = await this.findPagosByReserva(reserva_id);
    const pagado = pagos
      .filter((p) => p.estado === 'CONFIRMADO')
      .reduce((sum, p) => sum + Number(p.monto), 0);

    return Math.max(0, total_reserva - pagado);
  }
}

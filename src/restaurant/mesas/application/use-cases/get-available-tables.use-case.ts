import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import { MesaConReservas } from 'src/restaurant/domain/repositories/restaurant-repository.interface';
import { AvailableTablesQuery } from 'src/restaurant/domain/repositories/restaurant-repository.interface';

@Injectable()
export class GetAvailableTablesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: AvailableTablesQuery): Promise<MesaConReservas[]> {
    const mesas = await this.prisma.mesas.findMany({
      where: { estado: 'LIBRE' },
      include: { reservas_restaurante: true },
    });

    return mesas.filter((mesa) => {
      if (query.capacidad_min && mesa.capacidad < query.capacidad_min) {
        return false;
      }

      const hasConflict = mesa.reservas_restaurante.some((res) => {
        if (res.estado === 'CANCELADA') return false;
        const resFecha = res.fecha;
        const resHora = res.hora;
        const queryFecha = query.fecha;
        const queryHora = query.hora;

        const sameDate = resFecha.getTime() === queryFecha.getTime();
        const sameHour =
          resHora.getHours() === queryHora.getHours() &&
          resHora.getMinutes() === queryHora.getMinutes();

        if (sameDate && sameHour) return true;

        return false;
      });

      return !hasConflict;
    });
  }
}

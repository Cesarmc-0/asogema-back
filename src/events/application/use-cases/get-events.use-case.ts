import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import { attachImagenes } from 'src/infrastructure/storage/imagenes.helper';
import { SalonConReservas } from 'src/events/domain/repositories/event-repository.interface';
import { TipoEventoConReservas } from 'src/events/domain/repositories/event-repository.interface';

@Injectable()
export class GetEventsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(): Promise<{
    salones: SalonConReservas[];
    tipos_evento: TipoEventoConReservas[];
  }> {
    const [salones, tiposEvento] = await Promise.all([
      this.prisma.salones.findMany({
        where: { estado: 'DISPONIBLE' },
        include: { reservas_evento: true },
      }),
      this.prisma.tipos_evento.findMany({
        where: { estado: true },
        include: { reservas_evento: true },
      }),
    ]);

    return {
      salones: await attachImagenes(this.prisma, 'salon', salones),
      tipos_evento: tiposEvento,
    };
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';

@Injectable()
export class GetMyEventBookingsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(usuarioId: bigint) {
    const reservas = await this.prisma.reservas_evento.findMany({
      where: { usuario_id: usuarioId },
      include: {
        salones: {
          select: { id: true, nombre: true },
        },
        tipos_evento: {
          select: { id: true, nombre: true },
        },
      },
      orderBy: { fecha: 'desc' },
    });

    return reservas;
  }
}

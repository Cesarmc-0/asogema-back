import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';

@Injectable()
export class GetMyRestaurantReservationsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(usuarioId: bigint) {
    const reservas = await this.prisma.reservas_restaurante.findMany({
      where: { usuario_id: usuarioId },
      include: {
        mesas: {
          select: {
            id: true,
            numero: true,
            capacidad: true,
            ubicacion: true,
          },
        },
      },
      orderBy: { fecha: 'desc' },
    });

    return reservas;
  }
}

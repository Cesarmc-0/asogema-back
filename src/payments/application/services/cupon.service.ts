import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';

@Injectable()
export class CuponService {
  constructor(private readonly prisma: PrismaService) {}

  async obtenerPorcentaje(codigo: string): Promise<number> {
    const cupon = await this.prisma.codigos_descuento.findUnique({
      where: { codigo },
    });

    if (!cupon) {
      throw new BadRequestException('El código de descuento no existe');
    }
    if (!cupon.activo) {
      throw new BadRequestException('El código de descuento no está activo');
    }
    if (cupon.vigencia_hasta < new Date()) {
      throw new BadRequestException('El código de descuento está vencido');
    }
    if (cupon.usos_max > 0 && cupon.usos_actuales >= cupon.usos_max) {
      throw new BadRequestException('El código de descuento agotó sus usos');
    }

    return cupon.porcentaje;
  }
}

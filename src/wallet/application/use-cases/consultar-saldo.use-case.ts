import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';

@Injectable()
export class ConsultarSaldoUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(usuarioId: bigint) {
    const saldo = await this.prisma.saldos_usuario.findUnique({
      where: { usuario_id: usuarioId },
      select: { saldo: true },
    });

    const recargas = await this.prisma.saldo_recargas.findMany({
      where: { usuario_id: usuarioId },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        monto: true,
        estado: true,
        factura_id: true,
        created_at: true,
      },
      take: 20,
    });

    return {
      saldo: saldo?.saldo ?? 0,
      recargas,
    };
  }
}

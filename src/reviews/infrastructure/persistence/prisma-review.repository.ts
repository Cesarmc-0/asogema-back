import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/persistence/postgres/prisma.service';
import { ReviewRepository } from 'src/reviews/domain/repositories/review.repository';
import type {
  CreateReviewInput,
  ResenaConAutor,
} from 'src/reviews/domain/repositories/review.repository';

@Injectable()
export class PrismaReviewRepository implements ReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveByService(tipo_servicio: string): Promise<ResenaConAutor[]> {
    return this.prisma.resenas.findMany({
      where: { tipo_servicio, activo: true },
      include: { usuarios: true },
      orderBy: { fecha_creacion: 'desc' },
    });
  }

  async create(data: CreateReviewInput): Promise<ResenaConAutor> {
    return this.prisma.resenas.create({
      data: {
        usuario_id: data.usuario_id,
        tipo_servicio: data.tipo_servicio,
        calificacion: data.calificacion,
        texto: data.texto,
      },
      include: { usuarios: true },
    });
  }
}

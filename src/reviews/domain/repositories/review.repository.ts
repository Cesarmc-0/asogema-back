import { Prisma } from '@prisma/client';

export type TipoServicio = 'hotel' | 'restaurant' | 'events';

export type ResenaConAutor = Prisma.resenasGetPayload<{
  include: { usuarios: true };
}>;

export interface CreateReviewInput {
  usuario_id: bigint;
  tipo_servicio: TipoServicio;
  calificacion: number;
  texto: string;
}

export abstract class ReviewRepository {
  abstract findActiveByService(
    tipo_servicio: string,
  ): Promise<ResenaConAutor[]>;
  abstract create(data: CreateReviewInput): Promise<ResenaConAutor>;
}

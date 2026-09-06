import { Injectable } from '@nestjs/common';
import { ReviewRepository } from 'src/reviews/domain/repositories/review.repository';
import type { ResenaConAutor } from 'src/reviews/domain/repositories/review.repository';

export interface ReviewOutput {
  id: bigint;
  author: string;
  rating: number;
  text: string;
  date: string;
}

export function reviewToOutput(resena: ResenaConAutor): ReviewOutput {
  return {
    id: resena.id,
    author: `${resena.usuarios.nombre} ${resena.usuarios.apellido}`.trim(),
    rating: resena.calificacion,
    text: resena.texto,
    date: resena.fecha_creacion.toISOString().slice(0, 10),
  };
}

@Injectable()
export class GetReviewsUseCase {
  constructor(private readonly reviewRepository: ReviewRepository) {}

  async execute(tipo_servicio: string): Promise<ReviewOutput[]> {
    const resenas =
      await this.reviewRepository.findActiveByService(tipo_servicio);
    return resenas.map(reviewToOutput);
  }
}
